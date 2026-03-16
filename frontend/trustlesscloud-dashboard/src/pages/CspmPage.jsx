import React from "react";
import FindingsTable from "../components/FindingsTable";
import { sampleCspm } from "../data/sampleData";

export default function CspmPage() {
  return (
    <div>
      <h1>CSPM Scan Results</h1>

      <div className="card">
        <p><strong>Report ID:</strong> {sampleCspm.reportId}</p>
        <p><strong>Report Hash:</strong> {sampleCspm.reportHash}</p>
        <p><strong>Severity:</strong> {sampleCspm.overallSeverity}</p>
        <p><strong>Transaction Hash:</strong> {sampleCspm.blockchain.txHash}</p>
        <p><strong>Block Number:</strong> {sampleCspm.blockchain.blockNumber}</p>
      </div>

      <FindingsTable findings={sampleCspm.summary.findings} />
    </div>
  );
}