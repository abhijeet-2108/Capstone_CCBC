import React, { useEffect, useState } from "react";
import FindingsTable from "../components/FindingsTable";
import { triggerCspmScan, fetchReportsHistory, getLatestCspm } from "../services/api";

export default function CspmPage() {
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setResult(getLatestCspm());

    async function loadHistory() {
      try {
        const data = await fetchReportsHistory();
        setHistory(data.reports || []);
      } catch (err) {
        console.error("Failed to load reports history:", err);
      }
    }

    loadHistory();
  }, []);

  const handleRunScan = async () => {
    setLoading(true);
    try {
      const data = await triggerCspmScan();
      setResult(data);

      const refreshed = await fetchReportsHistory();
      setHistory(refreshed.reports || []);
    } catch (err) {
      alert(err.message || "Failed to run scan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>CSPM Scan Results</h1>

      <div className="card">
        <button onClick={handleRunScan} disabled={loading}>
          {loading ? "Running Scan..." : "Run CSPM Scan"}
        </button>
      </div>

      {result && (
        <>
          <div className="card">
            <p><strong>Report ID:</strong> {result.reportId}</p>
            <p><strong>Report Hash:</strong> {result.reportHash}</p>
            <p><strong>Severity:</strong> {result.overallSeverity}</p>
            <p><strong>Transaction Hash:</strong> {result.blockchain?.txHash}</p>
            <p><strong>Block Number:</strong> {result.blockchain?.blockNumber}</p>
          </div>

          <FindingsTable findings={result.summary?.findings || []} />
        </>
      )}

      <div className="card">
        <h3>Scan History</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Report ID</th>
              <th>Generated At</th>
              <th>Finding Count</th>
            </tr>
          </thead>
          <tbody>
            {history.map((report) => (
              <tr key={report.reportId}>
                <td>{report.reportId}</td>
                <td>{report.generatedAt}</td>
                <td>{report.findingCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}