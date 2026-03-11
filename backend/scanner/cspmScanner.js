require("dotenv").config();

const AWS = require("aws-sdk");
const { runAwsScans } = require("./awsScan");
const { hashReport } = require("./hash");
const { recordFinding } = require("../blockchain/evidence");

AWS.config.update({
  region: process.env.AWS_REGION || "us-east-1",
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const s3 = new AWS.S3();

function calculateOverallSeverity(findings) {
  if (!findings.length) return 0;
  return Math.max(...findings.map(f => f.severity ?? 0));
}

async function saveReportToS3(report) {
  if (!process.env.SCAN_REPORT_BUCKET) {
    console.warn("SCAN_REPORT_BUCKET not set. Skipping S3 upload.");
    return null;
  }

  const key = `reports/cspm-scan-${Date.now()}.json`;

  await s3.putObject({
    Bucket: process.env.SCAN_REPORT_BUCKET,
    Key: key,
    Body: JSON.stringify(report, null, 2),
    ContentType: "application/json"
  }).promise();

  return key;
}

async function runCSPMScan() {
  console.log("Starting CSPM scan...");

  const findings = await runAwsScans();

  const report = {
    scanType: "AWS_CSPM_SCAN",
    generatedAt: new Date().toISOString(),
    findingCount: findings.length,
    findings
  };

  const reportHash = hashReport(report);
  const overallSeverity = calculateOverallSeverity(findings);
  const reportKey = await saveReportToS3(report);

  const blockchainResult = await recordFinding(
    "AWS CSPM Scan",
    reportHash,
    overallSeverity
  );

  return {
    success: true,
    reportHash,
    overallSeverity,
    reportKey,
    blockchain: blockchainResult,
    summary: {
      findingCount: findings.length,
      findings
    }
  };
}

module.exports = { runCSPMScan };