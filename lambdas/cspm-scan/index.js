const AWS = require("aws-sdk");
const crypto = require("crypto");
const { ethers } = require("ethers");

// AWS clients
const region = process.env.AWS_REGION || "us-east-1";
const s3 = new AWS.S3({ region });
const ec2 = new AWS.EC2({ region });
const cloudtrail = new AWS.CloudTrail({ region });

// -----------------------------
// Utility functions
// -----------------------------
function sha256Hex(obj) {
  const json = JSON.stringify(obj);
  return "0x" + crypto.createHash("sha256").update(json).digest("hex");
}

function nowIso() {
  return new Date().toISOString();
}

function generateReportId() {
  return `cspm-${Date.now()}`;
}

function calculateOverallSeverity(findings) {
  if (!findings || findings.length === 0) return 0;
  return Math.max(...findings.map(f => Number(f.severity || 0)));
}

async function uploadReportToS3(report) {
  const bucket = process.env.SCAN_REPORT_BUCKET;
  if (!bucket) {
    throw new Error("Missing SCAN_REPORT_BUCKET environment variable");
  }

  const key = `reports/cspm/${report.reportId}.json`;

  await s3.putObject({
    Bucket: bucket,
    Key: key,
    Body: JSON.stringify(report, null, 2),
    ContentType: "application/json"
  }).promise();

  return { bucket, key };
}

// -----------------------------
// Blockchain: EvidenceLedger
// -----------------------------
function getEvidenceContract() {
  const rpcUrl = process.env.RPC_URL;
  const privateKey = process.env.PRIVATE_KEY;
  const contractAddress = process.env.EVIDENCE_CONTRACT;

  if (!rpcUrl) throw new Error("Missing RPC_URL");
  if (!privateKey) throw new Error("Missing PRIVATE_KEY");
  if (!contractAddress) throw new Error("Missing EVIDENCE_CONTRACT");

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  const abi = [
    "function recordFinding(string, bytes32, uint8) external"
  ];

  return new ethers.Contract(contractAddress, abi, wallet);
}

async function recordFindingOnChain(title, reportHash, severity) {
  const contract = getEvidenceContract();
  const tx = await contract.recordFinding(title, reportHash, severity);
  const receipt = await tx.wait();

  return {
    txHash: tx.hash,
    blockNumber: receipt.blockNumber
  };
}

// -----------------------------
// Mock mode
// -----------------------------
async function runMockScan() {
  return {
    findings: [
      {
        type: "SECURITY_GROUP_OPEN_PORT",
        title: "Public SSH port detected in security group sg-mock123",
        severity: 2,
        resourceId: "sg-mock123",
        details: {
          fromPort: 22,
          toPort: 22,
          cidr: "0.0.0.0/0",
          description: "Mock finding for Lambda testing"
        }
      },
      {
        type: "S3_PUBLIC_ACCESS_RISK",
        title: "Bucket trustlesscloud-mock-bucket may allow public access",
        severity: 1,
        resourceId: "trustlesscloud-mock-bucket",
        details: {
          BlockPublicAcls: false,
          IgnorePublicAcls: false,
          BlockPublicPolicy: false,
          RestrictPublicBuckets: false
        }
      }
    ],
    trailSummary: []
  };
}

// -----------------------------
// Real AWS scan mode
// -----------------------------
async function scanSecurityGroups() {
  const findings = [];
  const data = await ec2.describeSecurityGroups().promise();

  for (const group of data.SecurityGroups || []) {
    for (const perm of group.IpPermissions || []) {
      const fromPort = perm.FromPort;
      const toPort = perm.ToPort;
      const ipRanges = perm.IpRanges || [];

      for (const range of ipRanges) {
        const cidr = range.CidrIp;

        const dangerous =
          cidr === "0.0.0.0/0" &&
          (
            fromPort === 22 ||
            fromPort === 3389 ||
            toPort === 22 ||
            toPort === 3389
          );

        if (dangerous) {
          findings.push({
            type: "SECURITY_GROUP_OPEN_PORT",
            title: `Public administrative port exposed in ${group.GroupId}`,
            severity: 2,
            resourceId: group.GroupId,
            details: {
              groupName: group.GroupName,
              fromPort,
              toPort,
              cidr,
              description: range.Description || ""
            }
          });
        }
      }
    }
  }

  return findings;
}

async function scanS3Buckets() {
  const findings = [];
  const buckets = await s3.listBuckets().promise();

  for (const bucket of buckets.Buckets || []) {
    try {
      const result = await s3.getPublicAccessBlock({ Bucket: bucket.Name }).promise();
      const cfg = result.PublicAccessBlockConfiguration || {};

      const fullyBlocked =
        cfg.BlockPublicAcls === true &&
        cfg.IgnorePublicAcls === true &&
        cfg.BlockPublicPolicy === true &&
        cfg.RestrictPublicBuckets === true;

      if (!fullyBlocked) {
        findings.push({
          type: "S3_PUBLIC_ACCESS_RISK",
          title: `Bucket ${bucket.Name} may allow public access`,
          severity: 1,
          resourceId: bucket.Name,
          details: cfg
        });
      }
    } catch (err) {
      findings.push({
        type: "S3_PUBLIC_ACCESS_CHECK_FAILED",
        title: `Could not fully evaluate bucket ${bucket.Name}`,
        severity: 1,
        resourceId: bucket.Name,
        details: {
          error: err.message
        }
      });
    }
  }

  return findings;
}

async function fetchRecentTrailSummary() {
  // CloudTrail LookupEvents supports recent management/Insights events, up to last 90 days.
  // We use a small recent sample just for reporting context.
  const response = await cloudtrail.lookupEvents({
    MaxResults: 10
  }).promise();

  return (response.Events || []).map(evt => ({
    eventId: evt.EventId,
    eventName: evt.EventName,
    eventSource: evt.EventSource,
    eventTime: evt.EventTime,
    username: evt.Username || null
  }));
}

async function runRealScan() {
  const sgFindings = await scanSecurityGroups();
  const s3Findings = await scanS3Buckets();
  const trailSummary = await fetchRecentTrailSummary();

  return {
    findings: [...sgFindings, ...s3Findings],
    trailSummary
  };
}

// -----------------------------
// Main scan builder
// -----------------------------
async function buildCspmReport() {
  const mode = (process.env.MOCK_SCAN || "true").toLowerCase();

  const result = mode === "true"
    ? await runMockScan()
    : await runRealScan();

  return {
    reportId: generateReportId(),
    scanType: "AWS_CSPM_SCAN",
    generatedAt: nowIso(),
    environment: process.env.ENVIRONMENT || "dev",
    findingCount: result.findings.length,
    findings: result.findings,
    recentCloudTrailSummary: result.trailSummary
  };
}

// -----------------------------
// Lambda handler
// -----------------------------
exports.handler = async () => {
  try {
    const report = await buildCspmReport();
    const reportHash = sha256Hex(report);
    const overallSeverity = calculateOverallSeverity(report.findings);

    const blockchainResult = await recordFindingOnChain(
      "AWS CSPM Scan",
      reportHash,
      overallSeverity
    );

    const finalReport = {
      ...report,
      reportHash,
      overallSeverity,
      blockchain: blockchainResult,
      status: "RECORDED"
    };

    const s3Result = await uploadReportToS3(finalReport);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        mode: (process.env.MOCK_SCAN || "true").toLowerCase() === "true" ? "mock" : "real",
        ...finalReport,
        reportLocation: s3Result,
        summary: {
          findingCount: finalReport.findingCount,
          findings: finalReport.findings
        }
      })
    };
  } catch (error) {
    console.error("CSPM Lambda failed:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};