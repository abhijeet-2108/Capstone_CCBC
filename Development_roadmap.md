
# TrustLessCloud – Development Roadmap

## Project Overview

TrustLessCloud is a hybrid cloud–blockchain security platform designed to demonstrate how immutable blockchain records can strengthen cloud security auditing, zero‑trust access control, and incident response.

The system integrates AWS services with Ethereum smart contracts deployed on the Sepolia test network.

Three core smart contracts power the system:

- EvidenceLedger – records hashes of CSPM scan findings
- AccessPolicy – records temporary access approvals
- IncidentRegistry – records security incidents and response actions

The platform follows a hybrid architecture:

Off‑chain: AWS services perform scanning, detection, automation, and storage  
On‑chain: blockchain stores tamper‑proof evidence and approvals

---

# Development Roadmap

This document outlines the implementation stages required to complete the TrustLessCloud platform.

The development focus now moves toward **AWS serverless deployment using Lambda functions**.

---

# Stage 1 – Prepare AWS Serverless Architecture

The system will be organized into the following components:

Frontend Layer
- React application
- Hosted on Amazon S3
- Optionally distributed via CloudFront

Backend Logic Layer
- Implemented using AWS Lambda functions
- Each Lambda performs a single responsibility

Infrastructure Services
- API Gateway
- CloudWatch / EventBridge
- S3 storage
- IAM roles and policies

Blockchain Layer
- EvidenceLedger
- AccessPolicy
- IncidentRegistry
- Ethereum Sepolia Network

---

# Stage 2 – Repository Structure for Deployment

```
trustlesscloud/
├── frontend/
├── lambdas/
│   ├── cspm-scan/
│   ├── access-request/
│   ├── sts-issue/
│   ├── incident-handler/
│   └── dashboard-api/
├── contracts/
├── infrastructure/
└── docs/
```

---

# Stage 3 – Implement CSPM Scan Lambda (Part 1)

Responsibilities:

- scan AWS resources
- detect misconfigurations
- generate JSON security report
- hash the report using SHA‑256
- store the full report in S3
- store the hash in the EvidenceLedger smart contract

Workflow:

CloudWatch / EventBridge Trigger  
↓  
Lambda CSPM Scanner  
↓  
AWS Resource Scan  
↓  
JSON Report Created  
↓  
Report Stored in S3  
↓  
Hash Generated  
↓  
EvidenceLedger Smart Contract

---

# Stage 4 – Implement Access Control Lambda (Part 2)

Responsibilities:

- receive access requests
- evaluate policy rules
- record approvals on the AccessPolicy smart contract
- return approval status to the frontend

Workflow:

Frontend Access Request  
↓  
API Gateway  
↓  
Access Request Lambda  
↓  
Policy Evaluation  
↓  
Blockchain Approval

---

# Stage 5 – Temporary Credential Issuance (AWS STS)

Responsibilities:

- generate short‑lived AWS credentials
- provide credentials after successful approval

Workflow:

Approved Access Request  
↓  
STS Lambda  
↓  
AWS STS Temporary Credentials

---

# Stage 6 – Incident Response Lambda (Part 3)

Responsibilities:

- detect suspicious activity
- generate incident records
- hash response actions
- record incidents in IncidentRegistry

Workflow:

Security Event Detected  
↓  
Incident Handler Lambda  
↓  
Incident JSON Created  
↓  
Hash Generated  
↓  
IncidentRegistry Smart Contract

---

# Stage 7 – Develop Frontend Dashboard

React dashboard hosted on S3 will display:

- CSPM scan results
- blockchain verification hashes
- access request interface
- access approval history
- incident timeline

---

# Stage 8 – API Gateway Integration

React Frontend  
↓  
API Gateway  
↓  
Lambda Functions  
↓  
AWS Services + Blockchain

---

# Stage 9 – End‑to‑End System Testing

Example Scenario – Misconfiguration Detection

Public SSH port detected  
↓  
CSPM Lambda generates report  
↓  
Hash stored in EvidenceLedger

Example Scenario – Access Request

User requests access  
↓  
Access Lambda evaluates policy  
↓  
AccessPolicy approval recorded  
↓  
Temporary STS credentials issued

Example Scenario – Incident Recording

Unauthorized activity detected  
↓  
Incident Lambda triggered  
↓  
IncidentRegistry updated

---

# Stage 10 – Final Project Preparation

Tasks:

- organize repository
- document setup instructions
- prepare demo walkthrough
- explain on‑chain vs off‑chain architecture

---

# Final System Architecture

Off‑Chain Components

- AWS Lambda
- API Gateway
- Amazon S3
- CloudFront
- CloudWatch
- CloudTrail
- AWS Config
- AWS STS

On‑Chain Components

- EvidenceLedger
- AccessPolicy
- IncidentRegistry
- Ethereum Sepolia Network

---

# Project Goal

TrustLessCloud demonstrates how blockchain can enhance cloud security by providing:

- tamper‑proof audit trails
- verifiable security findings
- transparent access approvals
- immutable incident records
