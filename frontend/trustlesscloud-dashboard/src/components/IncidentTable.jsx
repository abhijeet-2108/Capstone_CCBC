import React from "react";

export default function IncidentTable({ incidents = [] }) {
  return (
    <div className="card">
      <h3>Incident Timeline</h3>
      <table className="data-table">
        <thead>
          <tr>
            <th>Incident ID</th>
            <th>Type</th>
            <th>Severity</th>
            <th>Action</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {incidents.map((incident, index) => (
            <tr key={index}>
              <td>{incident.incidentId}</td>
              <td>{incident.incidentType}</td>
              <td>{incident.severity}</td>
              <td>{incident.action}</td>
              <td>{incident.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}