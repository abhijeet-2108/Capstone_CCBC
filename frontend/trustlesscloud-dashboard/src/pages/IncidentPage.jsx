import React from "react";
import IncidentTable from "../components/IncidentTable";
import { sampleIncident } from "../data/sampleData";

export default function IncidentPage() {
  return (
    <div>
      <h1>Incident Timeline</h1>

      <div className="card">
        <p><strong>Incident ID:</strong> {sampleIncident.incidentId}</p>
        <p><strong>Action Hash:</strong> {sampleIncident.actionHash}</p>
        <p><strong>Transaction Hash:</strong> {sampleIncident.blockchain.txHash}</p>
        <p><strong>Block Number:</strong> {sampleIncident.blockchain.blockNumber}</p>
      </div>

      <IncidentTable incidents={[sampleIncident]} />
    </div>
  );
}