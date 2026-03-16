import React from "react";
import SummaryCard from "../components/SummaryCard";
import { sampleCspm, sampleAccess, sampleIncident } from "../data/sampleData";

export default function HomePage() {
  return (
    <div>
      <h1>TrustLessCloud Dashboard</h1>
      <p>Blockchain-Backed Zero-Trust Cloud Compliance & Monitoring Platform</p>

      <div className="card-grid">
        <SummaryCard
          title="Latest CSPM Report"
          value={sampleCspm.reportId}
          subtitle={`Findings: ${sampleCspm.summary.findingCount}`}
        />
        <SummaryCard
          title="Latest Access Request"
          value={sampleAccess.requestId}
          subtitle={sampleAccess.approved ? "Approved" : "Denied"}
        />
        <SummaryCard
          title="Latest Incident"
          value={sampleIncident.incidentId}
          subtitle={sampleIncident.status}
        />
      </div>
    </div>
  );
}