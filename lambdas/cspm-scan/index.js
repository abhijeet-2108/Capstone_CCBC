const AWS = require("aws-sdk");
const crypto = require("crypto");
const { ethers } = require("ethers");

// AWS clients
const s3 = new AWS.S3();
const ec2 = new AWS.EC2({ region: process.env.AWS_REGION || "us-east-1" });

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

function calculateOverallSeverity(findings) {
  if (!findings || findings.length === 0) return 0;
  return Math.max(...findings.map(f => Number(f.severity || 0)));
}

async function uploadReportToS3(report) {
  const bucket = process.env.SCAN_REPORT_BUCKET;
  if (!bucket) {
    throw new Error("Missing SCAN_REPORT_BUCKET environment variable");
  }

  const key = `reports/cspm-scan-${Date.now()}.json`;

  await s3.putObject({
    Bucket: bucket,
    Key: key,
    Body: JSON.stringify(report, null, 2),
    ContentType: "application/json"
  }).promise();

  return {
    bucket,
    key
  };
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
    "function recordFinding(string, bytes32, uint8) external",
    "event FindingRecorded(uint256 indexed findingId, string title, bytes32 reportHash, uint8 severity, uint256 timestamp, address recordedBy)"
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
// Mock scan mode
// -----------------------------
async function runMockScan() {
  return [
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
  ];
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

async function runRealScan() {
  const sgFindings = await scanSecurityGroups();

  return [
    ...sgFindings
  ];
}

// -----------------------------
// Main scan builder
// -----------------------------
async function buildCspmReport() {
  const mode = (process.env.MOCK_SCAN || "true").toLowerCase();

  const findings = mode === "true"
    ? await runMockScan()
    : await runRealScan();

  return {
    scanType: "AWS_CSPM_SCAN",
    generatedAt: nowIso(),
    environment: process.env.ENVIRONMENT || "dev",
    findingCount: findings.length,
    findings
  };
}

// -----------------------------
// Lambda handler
// -----------------------------
exports.handler = async (event) => {
  try {
    const report = await buildCspmReport();
    const reportHash = sha256Hex(report);
    const overallSeverity = calculateOverallSeverity(report.findings);

    const s3Result = await uploadReportToS3(report);

    const blockchainResult = await recordFindingOnChain(
      "AWS CSPM Scan",
      reportHash,
      overallSeverity
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        mode: (process.env.MOCK_SCAN || "true").toLowerCase() === "true" ? "mock" : "real",
        reportHash,
        overallSeverity,
        reportLocation: s3Result,
        blockchain: blockchainResult,
        summary: {
          findingCount: report.findingCount,
          findings: report.findings
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