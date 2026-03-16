import React from "react";

export default function SummaryCard({ title, value, subtitle }) {
  return (
    <div className="card summary-card">
      <h3>{title}</h3>
      <p className="summary-value">{value}</p>
      {subtitle && <p className="summary-subtitle">{subtitle}</p>}
    </div>
  );
}