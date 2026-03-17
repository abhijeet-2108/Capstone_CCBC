import React, { useEffect, useState } from "react";
import IncidentTable from "../components/IncidentTable";
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

  return (
    <div>
      <h1>Incident Timeline</h1>

      <div className="card">
        <button onClick={handleCreateIncident} disabled={loading}>
          {loading ? "Creating Incident..." : "Create Test Incident"}
        </button>
      </div>

      {result && (
        <>
          <div className="card">
            <p><strong>Incident ID:</strong> {result.incidentId}</p>
            <p><strong>Action Hash:</strong> {result.actionHash}</p>
            <p><strong>Transaction Hash:</strong> {result.blockchain?.txHash}</p>
            <p><strong>Block Number:</strong> {result.blockchain?.blockNumber}</p>
          </div>
        </>
      )}

      <IncidentTable incidents={history} />
    </div>
  );
}