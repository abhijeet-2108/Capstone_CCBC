import React, { useEffect, useState } from "react";
import AccessForm from "../components/AccessForm";
import { fetchAccessHistory } from "../services/api";

export default function AccessPage() {
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    async function loadHistory() {
      try {
        const data = await fetchAccessHistory();
        setHistory(data.accessRequests || []);
        setResult((data.accessRequests || [])[0] || null);
      } catch (err) {
        console.error("Failed to load access history:", err);
      }
    }

    loadHistory();
  }, []);

  const handleResult = async (newResult) => {
    setResult(newResult);
    try {
      const refreshed = await fetchAccessHistory();
      setHistory(refreshed.accessRequests || []);
    } catch (err) {
      console.error("Failed to refresh access history:", err);
    }
  };

  return (
    <div>
      <h1>Access Request</h1>

      <AccessForm onResult={handleResult} />

      {result && (
        <div className="card">
          <h3>Latest Access Result</h3>
          <p><strong>Request ID:</strong> {result.requestId}</p>
          <p><strong>User Wallet:</strong> {result.userWallet}</p>
          <p><strong>Resource:</strong> {result.resourceId}</p>
          <p><strong>Permission:</strong> {result.permission}</p>
          <p><strong>Duration:</strong> {result.durationSeconds}</p>
          <p><strong>Approved:</strong> {result.approved ? "Yes" : "No"}</p>
          <p><strong>Reason:</strong> {result.reason}</p>
          {result.roleArn && <p><strong>Role ARN:</strong> {result.roleArn}</p>}
          {result.blockchain && (
            <>
              <p><strong>Approval ID:</strong> {result.blockchain.approvalId}</p>
              <p><strong>Transaction Hash:</strong> {result.blockchain.txHash}</p>
              <p><strong>Block Number:</strong> {result.blockchain.blockNumber}</p>
            </>
          )}
        </div>
      )}

      <div className="card">
        <h3>Access Request History</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Request ID</th>
              <th>Wallet</th>
              <th>Resource</th>
              <th>Permission</th>
              <th>Approved</th>
            </tr>
          </thead>
          <tbody>
            {history.map((item) => (
              <tr key={item.requestId}>
                <td>{item.requestId}</td>
                <td>{item.userWallet}</td>
                <td>{item.resourceId}</td>
                <td>{item.permission}</td>
                <td>{item.approved ? "Yes" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}