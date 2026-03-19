# TrustLessCloud – Final Configuration and Deployment Guide

## Purpose

This document is the final configuration manual for the TrustLessCloud project.

It combines the complete deployment and configuration process for:

- smart contracts
- AWS Lambda backend services
- API Gateway
- EventBridge rules
- EventBridge Scheduler
- S3 storage structure
- frontend React dashboard
- S3 static website hosting
- STS integration

This guide is intended to be used as the main project configuration reference before final presentation and deployment review.

---

# 1. Project Overview

TrustLessCloud is a blockchain-backed zero-trust cloud compliance platform.

The system combines:

- Ethereum Sepolia smart contracts
- AWS Lambda backend services
- Amazon S3 storage
- API Gateway
- EventBridge / EventBridge Scheduler
- React frontend dashboard

The platform is divided into three main functional modules:

1. CSPM Evidence Collection
2. Zero-Trust Access Request and Approval
3. Incident Detection and Logging

---

# 2. Overall Architecture

The final architecture follows this flow:

```text
React Frontend
↓
API Gateway
↓
AWS Lambda Backend Services
↓
Amazon S3 / CloudTrail / EC2 / S3 Bucket Config / EventBridge Scheduler
↓
Ethereum Sepolia Smart Contracts
```

---

# 3. Smart Contracts

## 3.1 Contracts Used

The system uses three deployed smart contracts:

- EvidenceLedger
- AccessPolicy
- IncidentRegistry

## 3.2 Deployment Order

Deploy the contracts first, because all backend Lambdas depend on the deployed contract addresses.

Recommended deployment order:

1. EvidenceLedger
2. AccessPolicy
3. IncidentRegistry

## 3.3 Contract Environment Variables

After deployment, record these addresses because they are required inside Lambda environment variables:

```text
EVIDENCE_CONTRACT=0x...
ACCESS_CONTRACT=0x...
INCIDENT_CONTRACT=0x...
```

Also keep:

```text
RPC_URL=your-sepolia-rpc-url
PRIVATE_KEY=your-wallet-private-key
```

These values are used by Lambdas that write to blockchain.

---

# 4. AWS S3 Setup

## 4.1 Shared Reports Bucket

Create one shared S3 bucket for reports, config files, and state.

Example bucket:

```text
trustlesscloud-scan-reports
```

This bucket stores:

- CSPM reports
- access request records
- incident reports
- whitelist configuration
- CloudTrail poller state files
- STS issuance records

## 4.2 Required S3 Folder Structure

The bucket should eventually follow this structure:

```text
trustlesscloud-scan-reports/
├── config/
│   └── whitelist.json
├── reports/
│   ├── cspm/
│   ├── access/
│   └── incidents/
```

## 4.3 Whitelist Configuration File

Create this file manually in S3:

```text
config/whitelist.json
```

Example:

```json
{
  "policies": [
    {
      "userWallet": "0x91F5A3B60937dAC97631052CAceA30935d2c494C",
      "resourceId": "s3://trustlesscloud-scan-reports",
      "permission": "read",
      "maxDurationSeconds": 3600,
      "roleArn": "arn:aws:iam::123456789012:role/TrustLessCloudReadOnlyRole"
    },
    {
      "userWallet": "0x91F5A3B60937dAC97631052CAceA30935d2c494C",
      "resourceId": "s3://trustlesscloud-scan-reports",
      "permission": "write",
      "maxDurationSeconds": 1800,
      "roleArn": "arn:aws:iam::123456789012:role/TrustLessCloudWriteRole"
    }
  ]
}
```

Notes:
- `roleArn` is included for STS integration readiness, consider creating appropriate roles which will be used to set the policy.

---

# 5. Backend Lambda Services

The backend is fully serverless and built around multiple Lambda functions.

## 5.1 Lambda List

| Lambda | Purpose |
|--------|---------|
| `cspm-scan-lambda` | scans AWS resources, stores reports, writes EvidenceLedger |
| `access-request-lambda` | validates access requests, stores records, writes AccessPolicy |
| `incident-handler-lambda` | creates incidents based on eventbridge rules, stores them, writes IncidentRegistry |
| `reports-fetch-lambda` | fetches CSPM report history from S3 |
| `incidents-fetch-lambda` | fetches incident history from S3 |
| `access-fetch-lambda` | fetches access request history from S3 |
| `cloudtrail-poller-lambda` | polls CloudTrail on a schedule and creates incidents |

## 5.2 Common Lambda Recommendations

For all main Lambdas, recommended settings are:

- Runtime: `Node.js 20.x`
- Architecture: `x86_64`
- Timeout: `30 seconds`
- Memory: `256 MB`
- Handler: `index.handler`

## 5.3 ZIP Packaging Rule

For every Lambda folder:

1. run `npm install`
2. confirm these exist:
   - `index.js`
   - `package.json`
   - `package-lock.json`
   - `node_modules/`
3. zip the contents of the folder, not the folder itself

The uploaded ZIP should contain files at the root, not nested inside another folder.

---

# 6. CSPM Scan Lambda Configuration

## 6.1 Purpose

The CSPM Scan Lambda performs:

- AWS resource scanning
- JSON report generation
- SHA-256 report hashing
- upload of full report to S3
- blockchain write to EvidenceLedger

## 6.2 Main Environment Variables

```text
AWS_REGION=us-east-1
SCAN_REPORT_BUCKET=trustlesscloud-scan-reports
RPC_URL=...
PRIVATE_KEY=...
EVIDENCE_CONTRACT=0x...
ENVIRONMENT=dev
MOCK_SCAN=false
```

## 6.3 Real Scan Features

The current real scan supports:

- EC2 security group checks
- S3 public access block checks
- CloudTrail recent event summary inside reports

## 6.4 S3 Output Location

```text
reports/cspm/
```

## 6.5 Required IAM Permissions

At minimum:

- `ec2:DescribeSecurityGroups`
- `s3:ListAllMyBuckets`
- `s3:GetBucketPublicAccessBlock`
- `s3:PutObject`
- `cloudtrail:LookupEvents`
- CloudWatch Logs write access

---

# 7. Access Request Lambda Configuration

## 7.1 Purpose

The Access Request Lambda:

- receives access requests
- loads whitelist config from S3
- validates wallet + resource + permission + duration
- stores access records in S3
- writes approvals to AccessPolicy

## 7.2 Main Environment Variables

```text
AWS_REGION=us-east-1
CONFIG_BUCKET=trustlesscloud-scan-reports
WHITELIST_KEY=config/whitelist.json
RPC_URL=...
PRIVATE_KEY=...
ACCESS_CONTRACT=0x...
ENVIRONMENT=dev
```

## 7.3 S3 Input and Output

Input:
```text
config/whitelist.json
```

Output:
```text
reports/access/
```

## 7.4 Current Supported Inputs

The access request supports:

- `userWallet`
- `resourceId`
- `permission`
- `durationSeconds`

## 7.5 Required IAM Permissions

- `s3:GetObject`
- `s3:PutObject`
- CloudWatch Logs write access

---

# 8. Incident Handler Lambda Configuration

## 8.1 Purpose

The Incident Handler Lambda:

- handles manual incident creation
- parses CloudTrail-like JSON events
- hashes incident action data
- stores incident JSON in S3
- writes incident hash to IncidentRegistry

## 8.2 Main Environment Variables

```text
AWS_REGION=us-east-1
REPORT_BUCKET=trustlesscloud-scan-reports
RPC_URL=...
PRIVATE_KEY=...
INCIDENT_CONTRACT=0x...
ENVIRONMENT=dev
```

## 8.3 S3 Output

```text
reports/incidents/
```

## 8.4 Supported Sources

The lambda supports:

- manual API-triggered incidents
- CloudTrail-shaped event payloads
- future EventBridge-delivered CloudTrail events

## 8.5 Required IAM Permissions

- `s3:PutObject`
- CloudWatch Logs write access

---

# 9. History Fetch Lambdas

## 9.1 Reports Fetch Lambda

Purpose:
- list CSPM reports from `reports/cspm/`
- return them through API Gateway
- generate signed S3 URLs for clickable history

Environment variables:

```text
AWS_REGION=us-east-1
REPORT_BUCKET=trustlesscloud-scan-reports
ENVIRONMENT=dev
```

Required permissions:
- `s3:ListBucket`
- `s3:GetObject`

## 9.2 Incidents Fetch Lambda

Purpose:
- list incident records from `reports/incidents/`
- return them through API Gateway
- generate signed S3 URLs for clickable history

Environment variables:

```text
AWS_REGION=us-east-1
REPORT_BUCKET=trustlesscloud-scan-reports
ENVIRONMENT=dev
```

Required permissions:
- `s3:ListBucket`
- `s3:GetObject`

## 9.3 Access Fetch Lambda

Purpose:
- list access request records from `reports/access/`
- return them through API Gateway

Environment variables:

```text
AWS_REGION=us-east-1
REPORT_BUCKET=trustlesscloud-scan-reports
ENVIRONMENT=dev
```

Required permissions:
- `s3:ListBucket`
- `s3:GetObject`

---

# 10. STS Issue Lambda Configuration

## 10.1 Purpose

The STS Issue Lambda is designed as the final step of the access workflow.

It:

- reads approved access records from S3
- validates the record
- uses the `roleArn` stored in the whitelist / approved record
- calls AWS STS `AssumeRole`
- returns temporary credentials
- stores issuance records in S3

## 10.2 Important Learner Lab Note

The STS logic is already integrated in the system design and code flow, but full role-based execution depends on IAM role creation and trust relationship configuration.

In Learner Lab, role creation and trust policy editing may not be allowed, so this feature may remain partially demonstrable only.

## 10.3 Main Environment Variables

```text
AWS_REGION=us-east-1
REPORT_BUCKET=trustlesscloud-scan-reports
ENVIRONMENT=dev
```

## 10.4 S3 Paths Used

Input:
```text
reports/access/
```

Output:
```text
reports/sts/
```

## 10.5 Additional IAM Requirements

The STS Lambda execution role should allow:

- `sts:AssumeRole`
- `s3:GetObject`
- `s3:PutObject`
- CloudWatch Logs write access

## 10.6 Target Role Requirement

The target IAM roles referenced in whitelist policy must trust the STS Lambda execution role.

Example role names:

- `TrustLessCloudReadOnlyRole`
- `TrustLessCloudWriteRole`


---

# 11. CloudTrail Poller Lambda Configuration

## 11.1 Purpose

Because real-time EventBridge + CloudTrail matching can be unreliable in the Learner Lab environment, a scheduled CloudTrail poller was added.

It:

- calls `CloudTrail.LookupEvents`
- reads recent AWS management events
- filters interesting S3 / EC2 security events
- prevents duplicates using state files
- creates incidents from real CloudTrail data
- stores them in S3
- writes them on-chain to IncidentRegistry

## 11.2 Environment Variables

```text
AWS_REGION=us-east-1
REPORT_BUCKET=trustlesscloud-scan-reports
RPC_URL=...
PRIVATE_KEY=...
INCIDENT_CONTRACT=0x...
ENVIRONMENT=dev
DEFAULT_LOOKBACK_HOURS=3
```

## 11.3 S3 Paths Used

Incident output:
```text
reports/incidents/
```

State tracking:
```text
reports/cloudtrail-poller-state/
```

## 11.4 Interesting CloudTrail Events Monitored

Current event filter list includes:

- `PutBucketPublicAccessBlock`
- `PutBucketPolicy`
- `DeleteBucketPolicy`
- `PutBucketAcl`
- `AuthorizeSecurityGroupIngress`
- `RevokeSecurityGroupIngress`
- `CreateSecurityGroup`
- `DeleteSecurityGroup`

## 11.5 Required IAM Permissions

- `cloudtrail:LookupEvents`
- `s3:GetObject`
- `s3:PutObject`
- `s3:HeadObject`
- CloudWatch Logs write access

---

# 12. API Gateway Configuration

## 12.1 API Type

Use:

```text
HTTP API
```

Recommended API name:

```text
trustlesscloud-api
```

Recommended stage name:

```text
dev
```

Example base URL:

```text
https://abc123.execute-api.us-east-1.amazonaws.com/dev
```

## 12.2 Required Routes

| Method | Route | Target Lambda | Purpose |
|--------|------|---------------|---------|
| POST | /scan | cspm-scan-lambda | trigger CSPM scan |
| POST | /access-request | access-request-lambda | submit access request |
| POST | /incident | incident-handler-lambda | create manual incident |
| GET | /reports | reports-fetch-lambda | fetch report history |
| GET | /incidents | incidents-fetch-lambda | fetch incident history |
| GET | /access-history | access-fetch-lambda | fetch access history |

## 12.3 CORS Configuration

Recommended allowed origins for local development:

```text
http://localhost:3000
http://127.0.0.1:3000
```

Recommended allowed origin for deployed frontend:

```text
http://trustlesscloud-dashboard-site.s3-website-us-east-1.amazonaws.com
```

Allowed methods:

```text
GET
POST
OPTIONS
```

Allowed headers:

```text
content-type
```

---

# 13. EventBridge Rules and Scheduler

## 13.1 EventBridge Rules (Optional / Expandable)

The project includes support for real-time CloudTrail-based EventBridge rules.

Suggested rules:

### S3 security change rule
Match:
- `detail-type = AWS API Call via CloudTrail`
- source `aws.s3`
- event names such as:
  - `PutBucketPublicAccessBlock`
  - `PutBucketPolicy`
  - `DeleteBucketPolicy`
  - `PutBucketAcl`

### EC2 security group rule
Match:
- `detail-type = AWS API Call via CloudTrail`
- source `aws.ec2`
- event names such as:
  - `AuthorizeSecurityGroupIngress`
  - `RevokeSecurityGroupIngress`
  - `CreateSecurityGroup`
  - `DeleteSecurityGroup`

### Learner Lab note
Real-time matching through EventBridge rules can not consistently reliable in the Learner Lab environment, so the CloudTrail poller + Scheduler is considered the preferred implementation path.

## 13.2 EventBridge Scheduler 

The scheduled setup uses EventBridge Scheduler.

Recommended schedule:

```text
rate(3 hours)
```

For testing, shorter schedules such as `rate(1 hour)` can be used.

### Scheduler target
Target Lambda:

```text
cloudtrail-poller-lambda
```

### Scheduler payload

```json
{
  "lookbackHours": 3,
  "mode": "scheduled-cloudtrail-sweep"
}
```

### Scheduler configuration notes

- Flexible time window: Off
- schedule must be enabled
- target role / execution permissions must allow Lambda invocation

---

# 14. Frontend Dashboard Configuration

## 14.1 Frontend Stack

The dashboard uses:

- React
- React Router DOM
- JavaScript / JSX
- CSS

## 14.2 Pages

The frontend currently contains:

| Page | Purpose |
|------|---------|
| Home | shows latest report, access request, incident |
| CSPM | runs scans and shows history |
| Access | submits access requests and shows history |
| Incidents | creates manual incidents and shows history |

## 14.3 Frontend Environment File

Create:

```text
frontend/trustlesscloud-dashboard/.env
```

Add:

```env
REACT_APP_API_BASE_URL=https://your-api-id.execute-api.us-east-1.amazonaws.com/dev
```

## 14.4 Frontend Dependencies

From inside the frontend folder run:

```bash
npm install
npm install react-router-dom
```

## 14.5 Frontend Development Commands

Run locally:

```bash
npm start
```

Create production build:

```bash
npm run build
```

---

# 15. Frontend S3 Static Website Deployment

## 15.1 Build the Website

From inside the frontend folder:

```bash
npm run build
```

This creates a `build/` folder.

## 15.2 Create Website Bucket

Create a new bucket for the dashboard website.

Example:

```text
trustlesscloud-dashboard-site
```

## 15.3 Enable Static Website Hosting

In the bucket properties:

- enable Static website hosting
- index document:
  ```text
  index.html
  ```
- error document:
  ```text
  index.html
  ```

Using `index.html` as the error document is important because the app uses React Router.

## 15.4 Public Access Configuration

For the website bucket only:

- disable Block Public Access
- add a public read bucket policy

Example bucket policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadForWebsite",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::trustlesscloud-dashboard-site/*"
    }
  ]
}
```

## 15.5 Upload Build Output Correctly

Important:
upload the contents of the `build/` folder, not the folder itself.

Correct root objects should include:

- `index.html`
- `asset-manifest.json`
- `static/`


## 15.6 Website Endpoint

After configuration, use the S3 website endpoint shown in bucket properties.

Example:

```text
http://trustlesscloud-dashboard-site.s3-website-us-east-1.amazonaws.com
```

This origin must also be added to API Gateway CORS.

---

# 16. Current Achievements

The project currently achieves:

- deployed smart contracts on Sepolia
- CSPM reports written to blockchain and S3
- access requests validated by whitelist and written on-chain
- incidents written on-chain and stored in S3
- real CSPM scanning with AWS service checks
- incident history and report history fetched from S3
- clickable history links through signed URLs
- React frontend connected to real backend APIs
- S3-hosted frontend dashboard deployment
- CloudTrail poller design and scheduled incident generation path
- STS integration design and code path included

---

# 17. Optional Improvements

The optional improvements include:

- improving charts and visuals on dashboard
- adding severity color coding and badges
- adding detailed modal views for reports
- adding CloudFront in front of S3 website
- extending real AWS scanning to more services
- using EventBridge real-time rules fully if environment permits

---

# 18. Final Recommended Deployment Order

Use this final order when setting up from scratch:

1. Deploy smart contracts
2. Create shared S3 reports bucket
3. Upload whitelist configuration to `config/whitelist.json`
4. Configure and deploy backend Lambdas
   - cspm-scan
   - access-request
   - incident-handler
   - reports-fetch
   - incidents-fetch
   - access-fetch
   - cloudtrail-poller
   - sts-issue
5. Add required Lambda environment variables
6. Add IAM permissions to Lambda execution roles
7. Create API Gateway HTTP API and routes
8. Configure CORS
9. Create EventBridge Scheduler for CloudTrail poller
10. Build frontend with `npm run build`
11. Create website S3 bucket
12. Enable static website hosting
13. Disable block public access for website bucket
14. Add public read policy to website bucket
15. Upload build output correctly
16. Add website origin to API Gateway CORS
17. Test full frontend-to-backend workflow

---

# 19. Final Notes

TrustLessCloud was built to remain feasible inside AWS Learner Lab while still demonstrating:

- blockchain-backed audit evidence
- zero-trust access workflow
- incident logging and history
- serverless AWS architecture
- static S3-hosted dashboard

This configuration manual represents the final integrated system design and deployment process for the project.
