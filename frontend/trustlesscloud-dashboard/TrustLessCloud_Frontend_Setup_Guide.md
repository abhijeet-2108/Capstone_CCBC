# TrustLessCloud Frontend – Setup and Configuration Guide

## Purpose

This document explains how to configure and run the TrustLessCloud frontend dashboard.

The frontend is a React-based dashboard that connects to:

- AWS API Gateway
- AWS Lambda backend services
- Amazon S3 stored report data
- Sepolia-backed blockchain results returned by the backend

It is intended to serve as the configuration manual for the frontend portion of the project.

---

## Frontend Technology Stack

The frontend currently uses:

- React
- React Router DOM
- JavaScript / JSX
- CSS
- AWS API Gateway endpoints as backend API entry points

---

## Project Folder Location

This README is intended to live inside:

```text
frontend/trustlesscloud-dashboard/
```

Typical folder structure:

```text
frontend/trustlesscloud-dashboard/
├── public/
├── src/
│   ├── components/
│   ├── pages/
│   ├── services/
│   ├── data/
│   ├── App.js
│   ├── App.css
│   ├── index.js
│   └── index.css
├── package.json
├── package-lock.json
└── README.md
```

---

## Frontend Purpose in the Architecture

The frontend is responsible for:

- displaying CSPM scan results
- displaying incident history
- submitting access requests
- triggering scan and incident test actions
- showing blockchain transaction metadata returned by backend Lambdas
- consuming data through API Gateway

The frontend does not directly write to the blockchain.  
All blockchain transactions are handled by the backend Lambdas.

---

## Required AWS Backend Components

For the frontend to work fully, the following AWS services must already be configured:

- API Gateway HTTP API
- CSPM Scan Lambda
- Access Request Lambda
- Incident Handler Lambda
- Reports Fetch Lambda
- Incidents Fetch Lambda
- Access Fetch Lambda (recommended for real access history)
- Shared S3 bucket for reports and config data

---

## API Gateway Configuration

The frontend depends on an HTTP API created in AWS API Gateway.

### Recommended API Name

```text
trustlesscloud-api
```

### Recommended Stage Name

```text
dev
```

### Example Base URL

```text
https://abc123.execute-api.us-east-1.amazonaws.com/dev
```

This base URL is used inside the frontend `.env` file.

---

## Required API Routes

The following routes should exist in API Gateway and should be connected to the matching Lambda functions.

| Method | Route | Lambda Integration | Purpose |
|--------|------|--------------------|---------|
| POST | /scan | cspm-scan-lambda | Trigger a CSPM scan |
| POST | /access-request | access-request-lambda | Submit access request |
| POST | /incident | incident-handler-lambda | Create/test incident |
| GET | /reports | reports-fetch-lambda | Fetch CSPM report history |
| GET | /incidents | incidents-fetch-lambda | Fetch incident history |
| GET | /access-history | access-fetch-lambda | Fetch access request history |

---

## CORS Configuration

API Gateway CORS must allow the frontend origin.

### Recommended Allowed Origins for local development

```text
http://localhost:3000
http://127.0.0.1:3000
```

### Recommended Allowed Methods

```text
GET
POST
OPTIONS
```

### Recommended Allowed Headers

```text
content-type
```

If CORS is not configured properly, the frontend may show Failed to fetch errors.

---

## Frontend Environment File

Create a `.env` file inside:

```text
frontend/trustlesscloud-dashboard/
```

Add:

```env
REACT_APP_API_BASE_URL=https://your-api-id.execute-api.us-east-1.amazonaws.com/dev
```

### Important notes

- the URL should include the stage name if using a stage such as dev
- after editing `.env`, restart the React app with `npm start`

---

## Dependencies to Install

From inside:

```text
frontend/trustlesscloud-dashboard/
```

Run:

```bash
npm install
npm install react-router-dom
```

### Current main dependency

- react-router-dom

---

## Frontend Pages

The dashboard currently consists of these main pages:

| Page | Purpose |
|------|---------|
| Home | Shows latest report, latest access request, latest incident |
| CSPM | Runs scans and displays scan history |
| Access | Submits access requests and shows latest result |
| Incidents | Creates test incidents and shows incident history |

---

## Frontend Data Sources

### Home Page
Reads:
- latest CSPM report history from `/reports`
- latest incident history from `/incidents`
- latest access request from `/access-history` or local state

### CSPM Page
Uses:
- POST `/scan`
- GET `/reports`

### Access Page
Uses:
- POST `/access-request`
- GET `/access-history`

### Incident Page
Uses:
- POST `/incident`
- GET `/incidents`

---

## S3 Data Structure Expected by the Frontend

The frontend depends on backend Lambdas writing data into the shared S3 bucket using a structured layout.

Recommended bucket structure:

```text
trustlesscloud-scan-reports/
├── config/
│   └── whitelist.json
├── reports/
│   ├── cspm/
│   ├── access/
│   └── incidents/
```

### Notes

- CSPM reports should be stored under `reports/cspm/`
- Access records should be stored under `reports/access/`
- Incident records should be stored under `reports/incidents/`

---

## Frontend Development Commands

### Start local development server

```bash
npm start
```

### Create production build

```bash
npm run build
```

This build can later be uploaded to Amazon S3 static website hosting.

---

## Common Frontend Configuration Issues

### 1. Default React logo page still appears
Cause:
- `App.js` or `index.js` still references the default Create React App files

Fix:
- replace default `App.js`
- remove unused `logo.svg`, `App.test.js`, and related starter references

---

### 2. Failed to fetch error
Cause may be:
- wrong API base URL
- missing stage name in API URL
- API Gateway CORS not configured
- route not deployed
- frontend not restarted after `.env` update

---

### 3. Home page shows “No data”
Cause:
- frontend is not yet loading real history endpoints
- or backend history Lambdas are not returning data
- or no records exist in S3 under the expected prefixes

---

### 4. Route works in one browser but not another
Cause:
- browser origin may differ
- API Gateway CORS may allow one origin and block another
- local browser session may not be loading the latest `.env` or app instance

---

## Recommended Deployment Approach for Learner Lab

The most financially feasible frontend deployment approach is:

- build React app locally
- run `npm run build`
- upload build output to Amazon S3 static website hosting
- optionally place CloudFront in front later

This avoids using EC2 for frontend hosting.

---

## What the Frontend Currently Achieves

The frontend can be used to:

- trigger real CSPM scans through API Gateway
- submit access requests through real Lambda endpoints
- create incidents through real Lambda endpoints
- display historical reports and incidents from S3-backed fetch Lambdas
- display blockchain transaction metadata returned by backend services

---

## Recommended Future Frontend Enhancements

Potential improvements include:

- permission selection on access request form
- access history page / table
- severity badges and color coding
- report details drawer or modal
- better dashboard charts
- deployment to S3 static hosting
- CloudFront integration
- wallet-aware UI

---

## Final Notes

The frontend is designed to remain lightweight and cost-effective while still demonstrating:

- AWS serverless integration
- blockchain-backed reporting
- zero-trust request workflow
- incident tracking and visualization

This makes it a strong fit for both the Learner Lab environment and the final capstone presentation.
