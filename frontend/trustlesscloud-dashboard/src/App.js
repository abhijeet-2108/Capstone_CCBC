import React from "react";
import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import HomePage from "./pages/HomePage";
import CspmPage from "./pages/CspmPage";
import AccessPage from "./pages/AccessPage";
import IncidentPage from "./pages/IncidentPage";
import "./App.css";

export default function App() {
  return (
    <div className="app">
      <Navbar />
      <main className="page-container">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/cspm" element={<CspmPage />} />
          <Route path="/access" element={<AccessPage />} />
          <Route path="/incidents" element={<IncidentPage />} />
        </Routes>
      </main>
    </div>
  );
}