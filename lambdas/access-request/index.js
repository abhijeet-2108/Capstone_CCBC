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

function normalizePermission(permission) {
  return (permission || "").toLowerCase().trim();
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
    userWallet: normalizeAddress(policy.userWallet),
    permission: normalizePermission(policy.permission)
  }));
}

async function evaluateAccessRequest(userWallet, resourceId, permission, durationSeconds) {
  const policies = await loadPoliciesFromS3();
  const normalizedWallet = normalizeAddress(userWallet);
  const normalizedPermission = normalizePermission(permission);

  const match = policies.find(
    p =>
      p.userWallet === normalizedWallet &&
      p.resourceId === resourceId &&
      p.permission === normalizedPermission
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
    reason: "Approved by whitelist policy",
    matchedPolicy: match
  };
}

// -----------------------------
// Blockchain: AccessPolicy v2
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
    "function approveAccess(address, string, string, uint256, string) external returns (bytes32)",
    "event AccessApproved(bytes32 indexed approvalId, address indexed user, string resourceId, string permission, string requestId, uint256 expirationTime)"
  ];

  return new ethers.Contract(contractAddress, abi, wallet);
}

async function recordApprovalOnChain(userWallet, resourceId, permission, durationSeconds, requestId) {
  const contract = getAccessContract();

  const tx = await contract.approveAccess(
    userWallet,
    resourceId,
    permission,
    durationSeconds,
    requestId
  );

  const receipt = await tx.wait();

  const approvalId = ethers.solidityPackedKeccak256(
    ["address", "string", "string", "string"],
    [userWallet, resourceId, permission, requestId]
  );

  return {
    approvalId,
    txHash: tx.hash,
    blockNumber: receipt.blockNumber
  };
}

// -----------------------------
// Save access request result to S3
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
  const permission = body.permission;
  const durationSeconds = Number(body.durationSeconds || 900);

  if (!userWallet) throw new Error("Missing userWallet");
  if (!ethers.isAddress(userWallet)) throw new Error("Invalid userWallet");
  if (!resourceId) throw new Error("Missing resourceId");
  if (!permission) throw new Error("Missing permission");
  if (!durationSeconds || durationSeconds <= 0) {
    throw new Error("Invalid durationSeconds");
  }

  return {
    requestId: generateRequestId(),
    requestedAt: nowIso(),
    userWallet,
    resourceId,
    permission: normalizePermission(permission),
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
      request.permission,
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
          ...deniedRecord,
          recordLocation: s3Result
        })
      };
    }

    const blockchainResult = await recordApprovalOnChain(
      request.userWallet,
      request.resourceId,
      request.permission,
      request.durationSeconds,
      request.requestId
    );

    const approvedRecord = {
      ...request,
      approved: true,
      reason: policyResult.reason,
      roleArn: policyResult.matchedPolicy.roleArn || null,
      blockchain: blockchainResult,
      environment: process.env.ENVIRONMENT || "dev"
    };

    const s3Result = await saveAccessRecordToS3(approvedRecord);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        approved: true,
        ...approvedRecord,
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