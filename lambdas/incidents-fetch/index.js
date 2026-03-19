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

function getSignedUrl(bucket, key) {
  return s3.getSignedUrl("getObject", {
    Bucket: bucket,
    Key: key,
    Expires: 3600
  });
}

exports.handler = async () => {
  try {
    const bucket = process.env.REPORT_BUCKET;
    if (!bucket) throw new Error("Missing REPORT_BUCKET");

    const keys = await listJsonKeys(bucket, "reports/incidents/");

    const incidents = [];
    for (const key of keys) {
      const incident = await loadJsonObject(bucket, key);
      incidents.push({
        incidentId: incident.incidentId,
        recordedAt: incident.recordedAt,
        incidentType: incident.incidentType,
        resourceId: incident.resourceId,
        severity: incident.severity,
        action: incident.action,
        actionHash: incident.actionHash,
        blockchain: incident.blockchain || null,
        status: incident.status,
        sourceType: incident.sourceType || "manual",
        s3Key: key,
        viewUrl: getSignedUrl(bucket, key)
      });
    }

    incidents.sort((a, b) => new Date(b.recordedAt) - new Date(a.recordedAt));

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        count: incidents.length,
        incidents
      })
    };
  } catch (error) {
    console.error("Incidents Fetch Lambda failed:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};