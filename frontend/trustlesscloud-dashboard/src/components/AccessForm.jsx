import React, { useState } from "react";
import { submitAccessRequest } from "../services/api";

export default function AccessForm({ onResult }) {
  const [form, setForm] = useState({
    userWallet: "",
    resourceId: "",
    durationSeconds: 900
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await submitAccessRequest({
        userWallet: form.userWallet,
        resourceId: form.resourceId,
        durationSeconds: Number(form.durationSeconds)
      });

      if (onResult) onResult(result);
    } catch (err) {
      setError(err.message || "Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h3>Request Access</h3>
      <form onSubmit={handleSubmit} className="form-grid">
        <input
          type="text"
          name="userWallet"
          placeholder="User Wallet Address"
          value={form.userWallet}
          onChange={handleChange}
        />
        <input
          type="text"
          name="resourceId"
          placeholder="Resource ID"
          value={form.resourceId}
          onChange={handleChange}
        />
        <input
          type="number"
          name="durationSeconds"
          placeholder="Duration (seconds)"
          value={form.durationSeconds}
          onChange={handleChange}
        />
        <button type="submit" disabled={loading}>
          {loading ? "Submitting..." : "Submit Access Request"}
        </button>
      </form>
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}