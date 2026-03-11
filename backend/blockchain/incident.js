require("dotenv").config();
const { ethers } = require("ethers");
const { wallet } = require("./config");

const contractAddress = process.env.INCIDENT_CONTRACT;

if (!contractAddress) {
  throw new Error("Missing INCIDENT_CONTRACT in .env");
}

const abi = [
  "function recordIncident(string, bytes32, uint8) external",
  "function totalIncidents() external view returns (uint256)",
  "function getIncident(uint256) external view returns (string, bytes32, uint8, uint256, address)",
  "event IncidentRecorded(uint256 indexed index, string incidentId, bytes32 actionHash, uint8 status, uint256 timestamp, address recordedBy)"
];

const contract = new ethers.Contract(contractAddress, abi, wallet);

async function recordIncident(incidentId, actionHash, status) {
  if (!incidentId) throw new Error("incidentId is required");
  if (!ethers.isHexString(actionHash, 32)) {
    throw new Error("actionHash must be a 32-byte hex string");
  }

  const tx = await contract.recordIncident(incidentId, actionHash, status);
  console.log("Incident tx sent:", tx.hash);
  const receipt = await tx.wait();
  console.log("Incident recorded.");

  return {
    txHash: tx.hash,
    blockNumber: receipt.blockNumber
  };
}

module.exports = {
  recordIncident,
  contract
};