import React from "react";
import { NavLink } from "react-router-dom";

export default function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-brand">TrustLessCloud</div>
      <div className="navbar-links">
        <NavLink to="/">Home</NavLink>
        <NavLink to="/cspm">CSPM</NavLink>
        <NavLink to="/access">Access</NavLink>
        <NavLink to="/incidents">Incidents</NavLink>
      </div>
    </nav>
  );
}