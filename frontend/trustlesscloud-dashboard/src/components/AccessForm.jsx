import React, { useState } from "react";

export default function AccessForm() {
  const [form, setForm] = useState({
    userWallet: "",
    resourceId: "",
    durationSeconds: 900
  });

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    alert("Access request form is ready. API integration will be added next.");
    console.log("Access request:", form);
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
        <button type="submit">Submit Access Request</button>
      </form>
    </div>
  );
}