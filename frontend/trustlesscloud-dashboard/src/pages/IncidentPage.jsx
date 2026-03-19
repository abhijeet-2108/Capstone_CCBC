import React, { useEffect, useState } from "react";
import { submitIncident, fetchIncidentsHistory, getLatestIncident } from "../services/api";

export default function IncidentPage() {
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setResult(getLatestIncident());

    async function loadHistory() {
      try {
        const data = await fetchIncidentsHistory();
        setHistory(data.incidents || []);
        if (!getLatestIncident() && data.incidents?.length) {
          setResult(data.incidents[0]);
        }
      } catch (err) {
        console.error("Failed to load incident history:", err);
      }
    }

    loadHistory();
  }, []);

  const handleCreateIncident = async () => {
    setLoading(true);
    try {
      const data = await submitIncident({
        incidentType: "UNAUTHORIZED_ACCESS_ATTEMPT",
        resourceId: "s3://trustlesscloud-scan-reports",
        severity: 2,
        action: "Access request denied and logged",
        details: {
          source: "frontend-dashboard",
          note: "Manual dashboard trigger"
        }
      });

      setResult(data);

      const refreshed = await fetchIncidentsHistory();
      setHistory(refreshed.incidents || []);
    } catch (err) {
      alert(err.message || "Failed to create incident");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectIncident = (incident) => {
    setResult(incident);
  };

  return (
    <div>
      <h1>Incident Timeline</h1>

      <div className="card">
        <button onClick={handleCreateIncident} disabled={loading}>
          {loading ? "Creating Incident..." : "Create Test Incident"}
        </button>
      </div>

      {result && (
        <div className="card">
          <p><strong>Incident ID:</strong> {result.incidentId}</p>
          <p><strong>Type:</strong> {result.incidentType}</p>
          <p><strong>Resource:</strong> {result.resourceId}</p>
          <p><strong>Severity:</strong> {result.severity}</p>
          <p><strong>Action:</strong> {result.action}</p>
          <p><strong>Status:</strong> {result.status}</p>
          <p><strong>Source Type:</strong> {result.sourceType || "manual"}</p>
          <p><strong>Action Hash:</strong> {result.actionHash}</p>
          <p><strong>Transaction Hash:</strong> {result.blockchain?.txHash || "Not available"}</p>
          <p><strong>Block Number:</strong> {result.blockchain?.blockNumber || "Not available"}</p>
          {result.viewUrl && (
            <p>
              <strong>Full Report:</strong>{" "}
              <a href={result.viewUrl} target="_blank" rel="noreferrer">
                Open JSON report
              </a>
            </p>
          )}
        </div>
      )}

      <div className="card">
        <h3>Incident History</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Incident ID</th>
              <th>Recorded At</th>
              <th>Type</th>
              <th>Status</th>
              <th>View</th>
            </tr>
          </thead>
          <tbody>
            {history.map((incident) => (
              <tr key={incident.incidentId}>
                <td>
                  <button onClick={() => handleSelectIncident(incident)}>
                    {incident.incidentId}
                  </button>
                </td>
                <td>{incident.recordedAt}</td>
                <td>{incident.incidentType}</td>
                <td>{incident.status}</td>
                <td>
                  {incident.viewUrl ? (
                    <a href={incident.viewUrl} target="_blank" rel="noreferrer">
                      Open
                    </a>
                  ) : (
                    "N/A"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}