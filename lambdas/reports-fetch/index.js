const AWS = require("aws-sdk");

const s3 = new AWS.S3({ region: process.env.AWS_REGION || "us-east-1" });

async function listJsonKeys(bucket, prefix) {
  const response = await s3.listObjectsV2({
    Bucket: bucket,
    Prefix: prefix
  }).promise();

  return (response.Contents || [])
    .map(item => item.Key)
    .filter(key => key.endsWith(".json"));
}

async function loadJsonObject(bucket, key) {
  const result = await s3.getObject({
    Bucket: bucket,
    Key: key
  }).promise();

  return JSON.parse(result.Body.toString("utf-8"));
}

exports.handler = async () => {
  try {
    const bucket = process.env.REPORT_BUCKET;
    if (!bucket) throw new Error("Missing REPORT_BUCKET");

    const keys = await listJsonKeys(bucket, "reports/cspm/");

    const reports = [];
    for (const key of keys) {
      const report = await loadJsonObject(bucket, key);
      reports.push({
        reportId: report.reportId,
        generatedAt: report.generatedAt,
        environment: report.environment,
        findingCount: report.findingCount,
        findings: report.findings || [],
        s3Key: key
      });
    }

    reports.sort((a, b) => new Date(b.generatedAt) - new Date(a.generatedAt));

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        count: reports.length,
        reports
      })
    };
  } catch (error) {
    console.error("Reports Fetch Lambda failed:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};