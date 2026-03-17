const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

async function handleResponse(response) {
  const data = await response.json();
  if (typeof data.body === "string") {
    return JSON.parse(data.body);
  }
  return data;
}

async function postJson(path, payload = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  return handleResponse(response);
}

async function getJson(path) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "GET"
  });

  return handleResponse(response);
}

function saveLatest(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function loadLatest(key) {
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : null;
}

export async function triggerCspmScan() {
  const result = await postJson("/scan", {});
  saveLatest("latestCspm", result);
  return result;
}

export async function fetchAccessHistory() {
  return getJson("/access-history");
}

export async function submitAccessRequest(payload) {
  const result = await postJson("/access-request", payload);
  saveLatest("latestAccess", result);
  return result;
}

export async function submitIncident(payload) {
  const result = await postJson("/incident", payload);
  saveLatest("latestIncident", result);
  return result;
}

export async function fetchReportsHistory() {
  return getJson("/reports");
}

export async function fetchIncidentsHistory() {
  return getJson("/incidents");
}

export function getLatestCspm() {
  return loadLatest("latestCspm");
}

export function getLatestAccess() {
  return loadLatest("latestAccess");
}

export function getLatestIncident() {
  return loadLatest("latestIncident");
}