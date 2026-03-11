require("dotenv").config();
const { ethers } = require("ethers");
const { wallet } = require("./config");

const contractAddress = process.env.ACCESS_CONTRACT;

if (!contractAddress) {
  throw new Error("Missing ACCESS_CONTRACT in .env");
}

const abi = [
  "function approveAccess(address, string, uint256) external",
  "function revokeAccess(bytes32) external",
  "function isAccessValid(bytes32) external view returns (bool)",
  "event AccessApproved(bytes32 indexed approvalId, address indexed user, string resourceId, uint256 expirationTime)",
  "event AccessRevoked(bytes32 indexed approvalId)"
];

const contract = new ethers.Contract(contractAddress, abi, wallet);

async function approveAccess(user, resourceId, durationSeconds) {
  if (!ethers.isAddress(user)) throw new Error("Invalid user wallet address");
  if (!resourceId) throw new Error("resourceId is required");

  const tx = await contract.approveAccess(user, resourceId, durationSeconds);
  console.log("Access tx sent:", tx.hash);
  const receipt = await tx.wait();
  console.log("Access recorded.");

  return {
    txHash: tx.hash,
    blockNumber: receipt.blockNumber
  };
}

module.exports = {
  approveAccess,
  contract
};