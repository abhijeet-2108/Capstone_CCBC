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

    const keys = await listJsonKeys(bucket, "reports/access/");

    const accessRequests = [];
    for (const key of keys) {
      const item = await loadJsonObject(bucket, key);
      accessRequests.push({
        requestId: item.requestId,
        requestedAt: item.requestedAt,
        userWallet: item.userWallet,
        resourceId: item.resourceId,
        permission: item.permission || "N/A",
        durationSeconds: item.durationSeconds,
        approved: item.approved,
        reason: item.reason,
        blockchain: item.blockchain || null,
        s3Key: key
      });
    }

    accessRequests.sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt));

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        count: accessRequests.length,
        accessRequests
      })
    };
  } catch (error) {
    console.error("Access Fetch Lambda failed:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};