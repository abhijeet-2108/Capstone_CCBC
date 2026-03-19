const AWS = require("aws-sdk");
const crypto = require("crypto");
const { ethers } = require("ethers");

const region = process.env.AWS_REGION || "us-east-1";
const s3 = new AWS.S3({ region });
const cloudtrail = new AWS.CloudTrail({ region });

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

function parseInput(event) {
  let payload = {};

  if (event && event.body) {
    payload = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
  } else if (event) {
    payload = event;
  }

  const lookbackHours = Number(payload.lookbackHours || process.env.DEFAULT_LOOKBACK_HOURS || 3);

  if (!lookbackHours || lookbackHours <= 0) {
    throw new Error("Invalid lookbackHours");
  }

  return { lookbackHours };
}

function getInterestingEvents() {
  return [
    { source: "s3.amazonaws.com", name: "PutBucketPublicAccessBlock", severity: 1 },
    { source: "s3.amazonaws.com", name: "PutBucketPolicy", severity: 2 },
    { source: "s3.amazonaws.com", name: "DeleteBucketPolicy", severity: 2 },
    { source: "s3.amazonaws.com", name: "PutBucketAcl", severity: 2 },
    { source: "ec2.amazonaws.com", name: "AuthorizeSecurityGroupIngress", severity: 2 },
    { source: "ec2.amazonaws.com", name: "RevokeSecurityGroupIngress", severity: 1 },
    { source: "ec2.amazonaws.com", name: "CreateSecurityGroup", severity: 1 },
    { source: "ec2.amazonaws.com", name: "DeleteSecurityGroup", severity: 1 }
  ];
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function lookupEventsWithRetry(params, maxRetries = 5) {
  let attempt = 0;

  while (true) {
    try {
      return await cloudtrail.lookupEvents(params).promise();
    } catch (err) {
      const retryable =
        err.code === "ThrottlingException" ||
        err.code === "ThrottledException" ||
        err.retryable === true;

      if (!retryable || attempt >= maxRetries) {
        throw err;
      }

      const backoffMs = 1000 * Math.pow(2, attempt);
      console.warn(`CloudTrail throttled. Retrying in ${backoffMs} ms...`);
      await sleep(backoffMs);
      attempt += 1;
    }
  }
}
// -----------------------------
// S3 state / dedupe helpers
// -----------------------------
async function hasProcessedEvent(eventId) {
  const bucket = process.env.REPORT_BUCKET;
  if (!bucket) throw new Error("Missing REPORT_BUCKET");

  const key = `reports/cloudtrail-poller-state/${eventId}.json`;

  try {
    await s3.headObject({
      Bucket: bucket,
      Key: key
    }).promise();
    return true;
  } catch (err) {
    if (err.code === "NotFound" || err.statusCode === 404) {
      return false;
    }
    throw err;
  }
}

async function markEventProcessed(eventId, eventName) {
  const bucket = process.env.REPORT_BUCKET;
  if (!bucket) throw new Error("Missing REPORT_BUCKET");

  const key = `reports/cloudtrail-poller-state/${eventId}.json`;

  await s3.putObject({
    Bucket: bucket,
    Key: key,
    Body: JSON.stringify({
      eventId,
      eventName,
      processedAt: nowIso()
    }, null, 2),
    ContentType: "application/json"
  }).promise();

  return { bucket, key };
}

// -----------------------------
// CloudTrail lookup
// -----------------------------
async function lookupRecentEvents(lookbackHours) {
  const endTime = new Date();
  const startTime = new Date(endTime.getTime() - lookbackHours * 60 * 60 * 1000);

  let nextToken = undefined;
  const events = [];
  let pageCount = 0;
  const maxPages = 3; // keep this small for learner lab/demo stability

  do {
    const response = await lookupEventsWithRetry({
      StartTime: startTime,
      EndTime: endTime,
      MaxResults: 20,
      NextToken: nextToken
    });

    for (const evt of response.Events || []) {
      events.push(evt);
    }

    nextToken = response.NextToken;
    pageCount += 1;

    // CloudTrail LookupEvents is rate-limited to 2 TPS
    if (nextToken && pageCount < maxPages) {
      await sleep(700);
    }
  } while (nextToken && pageCount < maxPages);

  return events;
}

function isInterestingCloudTrailEvent(evt) {
  const rules = getInterestingEvents();
  return rules.find(rule =>
    evt.EventSource === rule.source &&
    evt.EventName === rule.name
  );
}

function extractResourceId(parsedCloudTrail, fallbackSource) {
  const req = parsedCloudTrail.requestParameters || {};

  return (
    req.bucketName ||
    req.groupId ||
    req.groupName ||
    fallbackSource ||
    "unknown-resource"
  );
}

function buildIncidentFromCloudTrail(evt) {
  const parsed = evt.CloudTrailEvent ? JSON.parse(evt.CloudTrailEvent) : {};
  const matchedRule = isInterestingCloudTrailEvent(evt);

  const resourceId = extractResourceId(parsed, evt.EventSource);

  return {
    incidentId: generateIncidentId(),
    recordedAt: nowIso(),
    incidentType: "CLOUDTRAIL_EVENT",
    resourceId,
    severity: matchedRule?.severity ?? 1,
    action: `CloudTrail event captured: ${evt.EventName}`,
    details: {
      detailType: "AWS API Call via CloudTrail",
      source: evt.EventSource.startsWith("s3") ? "aws.s3" : evt.EventSource.startsWith("ec2") ? "aws.ec2" : "aws.unknown",
      eventName: evt.EventName,
      eventSource: evt.EventSource,
      eventTime: evt.EventTime,
      username: evt.Username || null,
      cloudTrailEventId: evt.EventId,
      requestParameters: parsed.requestParameters || {},
      responseElements: parsed.responseElements || null,
      userIdentity: parsed.userIdentity || {}
    },
    sourceType: "cloudtrail-poller",
    environment: process.env.ENVIRONMENT || "dev"
  };
}

// -----------------------------
// Incident persistence
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
// Blockchain
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
    const { lookbackHours } = parseInput(event);

    const recentEvents = await lookupRecentEvents(lookbackHours);
    const interesting = recentEvents.filter(isInterestingCloudTrailEvent);

    const createdIncidents = [];

    for (const evt of interesting) {
      const alreadyProcessed = await hasProcessedEvent(evt.EventId);
      if (alreadyProcessed) continue;

      const incidentRecord = buildIncidentFromCloudTrail(evt);

      const actionPayload = {
        incidentId: incidentRecord.incidentId,
        incidentType: incidentRecord.incidentType,
        resourceId: incidentRecord.resourceId,
        severity: incidentRecord.severity,
        action: incidentRecord.action,
        recordedAt: incidentRecord.recordedAt,
        sourceType: incidentRecord.sourceType,
        cloudTrailEventId: evt.EventId
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
      await markEventProcessed(evt.EventId, evt.EventName);

      createdIncidents.push({
        ...finalRecord,
        recordLocation: s3Result
      });
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        lookbackHours,
        scannedEvents: recentEvents.length,
        matchedEvents: interesting.length,
        createdCount: createdIncidents.length,
        incidents: createdIncidents
      })
    };
  } catch (error) {
    console.error("CloudTrail Poller Lambda failed:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};