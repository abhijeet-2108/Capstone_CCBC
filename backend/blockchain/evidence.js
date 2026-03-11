require("dotenv").config();
const { ethers } = require("ethers");
const { wallet } = require("./config");

const contractAddress = process.env.EVIDENCE_CONTRACT;

if (!contractAddress) {
  throw new Error("Missing EVIDENCE_CONTRACT in .env");
}

const abi = [
  "function recordFinding(string, bytes32, uint8) external",
  "function totalFindings() external view returns (uint256)",
  "function getFinding(uint256) external view returns (string, bytes32, uint8, uint256, address)",
  "event FindingRecorded(uint256 indexed findingId, string title, bytes32 reportHash, uint8 severity, uint256 timestamp, address recordedBy)"
];

const contract = new ethers.Contract(contractAddress, abi, wallet);

async function recordFinding(title, reportHash, severity) {
  if (!title) throw new Error("title is required");
  if (!ethers.isHexString(reportHash, 32)) {
    throw new Error("reportHash must be a 32-byte hex string");
  }

  const tx = await contract.recordFinding(title, reportHash, severity);
  console.log("Evidence tx sent:", tx.hash);
  const receipt = await tx.wait();
  console.log("Evidence recorded.");

  return {
    txHash: tx.hash,
    blockNumber: receipt.blockNumber
  };
}

async function totalFindings() {
  return await contract.totalFindings();
}

module.exports = {
  recordFinding,
  totalFindings,
  contract
};