import React, { useEffect, useState } from "react";
import SummaryCard from "../components/SummaryCard";
import {
  fetchReportsHistory,
  fetchIncidentsHistory,
  fetchAccessHistory
} from "../services/api";

export default function HomePage() {
  const [latestReport, setLatestReport] = useState(null);
  const [latestIncident, setLatestIncident] = useState(null);
  const [latestAccess, setLatestAccess] = useState(null);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const reports = await fetchReportsHistory();
        const incidents = await fetchIncidentsHistory();
        const access = await fetchAccessHistory();

        setLatestReport((reports.reports || [])[0] || null);
        setLatestIncident((incidents.incidents || [])[0] || null);
        setLatestAccess((access.accessRequests || [])[0] || null);
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
      }
    }

    loadDashboardData();
  }, []);

  return (
    <div>
      <h1>TrustLessCloud Dashboard</h1>
      <p>Blockchain-Backed Zero-Trust Cloud Compliance & Monitoring Platform</p>

      <div className="card-grid">
        <SummaryCard
          title="Latest CSPM Report"
          value={latestReport?.reportId || "No data"}
          subtitle={latestReport ? `Findings: ${latestReport.findingCount}` : ""}
        />
        <SummaryCard
          title="Latest Access Request"
          value={latestAccess?.requestId || "No data"}
          subtitle={
            latestAccess
              ? `${latestAccess.approved ? "Approved" : "Denied"} • ${latestAccess.permission}`
              : ""
          }
        />
        <SummaryCard
          title="Latest Incident"
          value={latestIncident?.incidentId || "No data"}
          subtitle={latestIncident?.status || ""}
        />
      </div>
    </div>
  );
}