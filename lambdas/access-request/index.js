const AWS = require("aws-sdk");
const { ethers } = require("ethers");

const s3 = new AWS.S3({ region: process.env.AWS_REGION || "us-east-1" });

// -----------------------------
// Utility functions
// -----------------------------
function nowIso() {
  return new Date().toISOString();
}

function generateRequestId() {
  return `access-${Date.now()}`;
}

function normalizeAddress(address) {
  return (address || "").toLowerCase();
}

// -----------------------------
// Load whitelist/policies from S3
// -----------------------------
async function loadPoliciesFromS3() {
  const bucket = process.env.CONFIG_BUCKET;
  const key = process.env.WHITELIST_KEY;

  if (!bucket) throw new Error("Missing CONFIG_BUCKET");
  if (!key) throw new Error("Missing WHITELIST_KEY");

  const result = await s3.getObject({
    Bucket: bucket,
    Key: key
  }).promise();

  const parsed = JSON.parse(result.Body.toString("utf-8"));

  if (!parsed.policies || !Array.isArray(parsed.policies)) {
    throw new Error("Invalid whitelist.json format: missing policies array");
  }

  return parsed.policies.map(policy => ({
    ...policy,
    userWallet: normalizeAddress(policy.userWallet)
  }));
}

async function evaluateAccessRequest(userWallet, resourceId, durationSeconds) {
  const policies = await loadPoliciesFromS3();
  const normalizedWallet = normalizeAddress(userWallet);

  const match = policies.find(
    p =>
      p.userWallet === normalizedWallet &&
      p.resourceId === resourceId
  );

  if (!match) {
    return {
      approved: false,
      reason: "No matching whitelist policy found"
    };
  }

  if (durationSeconds > Number(match.maxDurationSeconds)) {
    return {
      approved: false,
      reason: `Requested duration exceeds allowed maximum of ${match.maxDurationSeconds} seconds`
    };
  }

  return {
    approved: true,
    reason: "Approved by whitelist policy"
  };
}

// -----------------------------
// Blockchain: AccessPolicy
// -----------------------------
function getAccessContract() {
  const rpcUrl = process.env.RPC_URL;
  const privateKey = process.env.PRIVATE_KEY;
  const contractAddress = process.env.ACCESS_CONTRACT;

  if (!rpcUrl) throw new Error("Missing RPC_URL");
  if (!privateKey) throw new Error("Missing PRIVATE_KEY");
  if (!contractAddress) throw new Error("Missing ACCESS_CONTRACT");

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  const abi = [
    "function approveAccess(address, string, uint256) external",
    "event AccessApproved(bytes32 indexed approvalId, address indexed user, string resourceId, uint256 expirationTime)"
  ];

  return new ethers.Contract(contractAddress, abi, wallet);
}

async function recordApprovalOnChain(userWallet, resourceId, durationSeconds) {
  const contract = getAccessContract();

  const tx = await contract.approveAccess(
    userWallet,
    resourceId,
    durationSeconds
  );

  const receipt = await tx.wait();

  return {
    txHash: tx.hash,
    blockNumber: receipt.blockNumber
  };
}

// -----------------------------
// Optional: save access request result to S3
// -----------------------------
async function saveAccessRecordToS3(record) {
  const bucket = process.env.CONFIG_BUCKET;
  if (!bucket) throw new Error("Missing CONFIG_BUCKET");

  const key = `reports/access/${record.requestId}.json`;

  await s3.putObject({
    Bucket: bucket,
    Key: key,
    Body: JSON.stringify(record, null, 2),
    ContentType: "application/json"
  }).promise();

  return {
    bucket,
    key
  };
}

// -----------------------------
// Input parser
// -----------------------------
function parseRequest(event) {
  let body = {};

  if (event && event.body) {
    body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
  } else if (event) {
    body = event;
  }

  const userWallet = body.userWallet;
  const resourceId = body.resourceId;
  const durationSeconds = Number(body.durationSeconds || 900);

  if (!userWallet) throw new Error("Missing userWallet");
  if (!ethers.isAddress(userWallet)) throw new Error("Invalid userWallet");
  if (!resourceId) throw new Error("Missing resourceId");
  if (!durationSeconds || durationSeconds <= 0) {
    throw new Error("Invalid durationSeconds");
  }

  return {
    requestId: generateRequestId(),
    requestedAt: nowIso(),
    userWallet,
    resourceId,
    durationSeconds
  };
}

// -----------------------------
// Lambda handler
// -----------------------------
exports.handler = async (event) => {
  try {
    const request = parseRequest(event);

    const policyResult = await evaluateAccessRequest(
      request.userWallet,
      request.resourceId,
      request.durationSeconds
    );

    if (!policyResult.approved) {
      const deniedRecord = {
        ...request,
        approved: false,
        reason: policyResult.reason,
        environment: process.env.ENVIRONMENT || "dev"
      };

      const s3Result = await saveAccessRecordToS3(deniedRecord);

      return {
        statusCode: 403,
        body: JSON.stringify({
          success: true,
          approved: false,
          requestId: request.requestId,
          requestedAt: request.requestedAt,
          userWallet: request.userWallet,
          resourceId: request.resourceId,
          durationSeconds: request.durationSeconds,
          reason: policyResult.reason,
          recordLocation: s3Result
        })
      };
    }

    const blockchainResult = await recordApprovalOnChain(
      request.userWallet,
      request.resourceId,
      request.durationSeconds
    );

    const approvedRecord = {
      ...request,
      approved: true,
      reason: policyResult.reason,
      blockchain: blockchainResult,
      environment: process.env.ENVIRONMENT || "dev"
    };

    const s3Result = await saveAccessRecordToS3(approvedRecord);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        approved: true,
        requestId: request.requestId,
        requestedAt: request.requestedAt,
        userWallet: request.userWallet,
        resourceId: request.resourceId,
        durationSeconds: request.durationSeconds,
        reason: policyResult.reason,
        blockchain: blockchainResult,
        recordLocation: s3Result
      })
    };
  } catch (error) {
    console.error("Access Request Lambda failed:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};