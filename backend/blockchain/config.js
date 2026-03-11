require("dotenv").config();
const { ethers } = require("ethers");

if (!process.env.RPC_URL) {
  throw new Error("Missing RPC_URL in .env");
}

if (!process.env.PRIVATE_KEY) {
  throw new Error("Missing PRIVATE_KEY in .env");
}

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

module.exports = { provider, wallet };