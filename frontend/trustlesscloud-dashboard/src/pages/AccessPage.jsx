import React from "react";
import AccessForm from "../components/AccessForm";
import { sampleAccess } from "../data/sampleData";

export default function AccessPage() {
  return (
    <div>
      <h1>Access Request</h1>

      <AccessForm />

      <div className="card">
        <h3>Latest Access Result</h3>
        <p><strong>Request ID:</strong> {sampleAccess.requestId}</p>
        <p><strong>User Wallet:</strong> {sampleAccess.userWallet}</p>
        <p><strong>Resource:</strong> {sampleAccess.resourceId}</p>
        <p><strong>Duration:</strong> {sampleAccess.durationSeconds}</p>
        <p><strong>Approved:</strong> {sampleAccess.approved ? "Yes" : "No"}</p>
        <p><strong>Reason:</strong> {sampleAccess.reason}</p>
        <p><strong>Transaction Hash:</strong> {sampleAccess.blockchain.txHash}</p>
      </div>
    </div>
  );
}