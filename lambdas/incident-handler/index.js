const AWS = require("aws-sdk");
const crypto = require("crypto");
const { ethers } = require("ethers");

const s3 = new AWS.S3({ region: process.env.AWS_REGION || "us-east-1" });

// -----------------------------
// Utility functions
// -----------------------------
function nowIso() {
  return new Date().toISOString();
}

function generateIncidentId() {
  return `incident-${Date.now()}`;
}

function sha256Hex(obj) {
  const json = JSON.stringify(obj);
  return "0x" + crypto.createHash("sha256").update(json).digest("hex");
}

// -----------------------------
// Input parsing
// -----------------------------
function isCloudTrailEvent(event) {
  return event && event.detail && event["detail-type"];
}

function parseManualEvent(event) {
  let body = {};

  if (event && event.body) {
    body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
  } else if (event) {
    body = event;
  }

  const incidentType = body.incidentType;
  const resourceId = body.resourceId;
  const severity = Number(body.severity ?? 1);
  const action = body.action;
  const details = body.details || {};

  if (!incidentType) throw new Error("Missing incidentType");
  if (!resourceId) throw new Error("Missing resourceId");
  if (!action) throw new Error("Missing action");
  if (Number.isNaN(severity) || severity < 0) {
    throw new Error("Invalid severity");
  }

  return {
    incidentId: generateIncidentId(),
    recordedAt: nowIso(),
    incidentType,
    resourceId,
    severity,
    action,
    details,
    sourceType: "manual",
    environment: process.env.ENVIRONMENT || "dev"
  };
}

function parseCloudTrailEvent(event) {
  const detail = event.detail || {};
  const eventName = detail.eventName || "UnknownEvent";
  const eventSource = detail.eventSource || "UnknownSource";
  const eventTime = detail.eventTime || nowIso();
  const userIdentity = detail.userIdentity || {};
  const requestParameters = detail.requestParameters || {};

  return {
    incidentId: generateIncidentId(),
    recordedAt: nowIso(),
    incidentType: "CLOUDTRAIL_EVENT",
    resourceId: requestParameters.groupId || requestParameters.bucketName || eventSource,
    severity: 1,
    action: `CloudTrail event captured: ${eventName}`,
    details: {
      detailType: event["detail-type"],
      source: event.source,
      eventName,
      eventSource,
      eventTime,
      userIdentity,
      requestParameters
    },
    sourceType: "cloudtrail",
    environment: process.env.ENVIRONMENT || "dev"
  };
}

function parseIncidentEvent(event) {
  if (isCloudTrailEvent(event)) {
    return parseCloudTrailEvent(event);
  }
  return parseManualEvent(event);
}

// -----------------------------
// Save incident record to S3
// -----------------------------
async function saveIncidentToS3(record) {
  const bucket = process.env.REPORT_BUCKET;
  if (!bucket) throw new Error("Missing REPORT_BUCKET");

  const key = `reports/incidents/${record.incidentId}.json`;

  await s3.putObject({
    Bucket: bucket,
    Key: key,
    Body: JSON.stringify(record, null, 2),
    ContentType: "application/json"
  }).promise();

  return { bucket, key };
}

// -----------------------------
// Blockchain: IncidentRegistry
// -----------------------------
function getIncidentContract() {
  const rpcUrl = process.env.RPC_URL;
  const privateKey = process.env.PRIVATE_KEY;
  const contractAddress = process.env.INCIDENT_CONTRACT;

  if (!rpcUrl) throw new Error("Missing RPC_URL");
  if (!privateKey) throw new Error("Missing PRIVATE_KEY");
  if (!contractAddress) throw new Error("Missing INCIDENT_CONTRACT");

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  const abi = [
    "function recordIncident(string, bytes32, uint8) external"
  ];

  return new ethers.Contract(contractAddress, abi, wallet);
}

async function recordIncidentOnChain(incidentId, actionHash, status) {
  const contract = getIncidentContract();

  const tx = await contract.recordIncident(
    incidentId,
    actionHash,
    status
  );

  const receipt = await tx.wait();

  return {
    txHash: tx.hash,
    blockNumber: receipt.blockNumber
  };
}

// -----------------------------
// Main handler
// -----------------------------
exports.handler = async (event) => {
  try {
    const incidentRecord = parseIncidentEvent(event);

    const actionPayload = {
      incidentId: incidentRecord.incidentId,
      incidentType: incidentRecord.incidentType,
      resourceId: incidentRecord.resourceId,
      severity: incidentRecord.severity,
      action: incidentRecord.action,
      recordedAt: incidentRecord.recordedAt,
      sourceType: incidentRecord.sourceType
    };

    const actionHash = sha256Hex(actionPayload);

    const blockchainResult = await recordIncidentOnChain(
      incidentRecord.incidentId,
      actionHash,
      0
    );

    const finalRecord = {
      ...incidentRecord,
      actionHash,
      blockchain: blockchainResult,
      status: "DETECTED"
    };

    const s3Result = await saveIncidentToS3(finalRecord);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        ...finalRecord,
        recordLocation: s3Result
      })
    };
  } catch (error) {
    console.error("Incident Handler Lambda failed:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};