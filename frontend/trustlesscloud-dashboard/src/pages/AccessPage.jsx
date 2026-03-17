import React, { useEffect, useState } from "react";
import AccessForm from "../components/AccessForm";
import { getLatestAccess } from "../services/api";

export default function AccessPage() {
  const [result, setResult] = useState(null);

  useEffect(() => {
    setResult(getLatestAccess());
  }, []);

  return (
    <div>
      <h1>Access Request</h1>

      <AccessForm onResult={setResult} />

      {result && (
        <div className="card">
          <h3>Latest Access Result</h3>
          <p><strong>Request ID:</strong> {result.requestId}</p>
          <p><strong>User Wallet:</strong> {result.userWallet}</p>
          <p><strong>Resource:</strong> {result.resourceId}</p>
          <p><strong>Duration:</strong> {result.durationSeconds}</p>
          <p><strong>Approved:</strong> {result.approved ? "Yes" : "No"}</p>
          <p><strong>Reason:</strong> {result.reason}</p>
          {result.blockchain && (
            <>
              <p><strong>Transaction Hash:</strong> {result.blockchain.txHash}</p>
              <p><strong>Block Number:</strong> {result.blockchain.blockNumber}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}