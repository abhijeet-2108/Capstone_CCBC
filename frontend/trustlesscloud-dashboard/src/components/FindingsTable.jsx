import React from "react";

export default function FindingsTable({ findings = [] }) {
  return (
    <div className="card">
      <h3>CSPM Findings</h3>
      <table className="data-table">
        <thead>
          <tr>
            <th>Type</th>
            <th>Title</th>
            <th>Severity</th>
            <th>Resource</th>
          </tr>
        </thead>
        <tbody>
          {findings.map((finding, index) => (
            <tr key={index}>
              <td>{finding.type}</td>
              <td>{finding.title}</td>
              <td>{finding.severity}</td>
              <td>{finding.resourceId}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}