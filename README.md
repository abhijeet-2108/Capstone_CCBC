
# TrustLessCloud – Development Roadmap

## Project Overview

TrustLessCloud is a hybrid cloud–blockchain security platform designed to demonstrate how immutable blockchain records can strengthen cloud security auditing, zero-trust access control, and incident response.

The system integrates AWS services with Ethereum smart contracts deployed on the Sepolia test network.

Three core smart contracts power the system:

- EvidenceLedger – records hashes of CSPM scan findings
- AccessPolicy – records temporary access approvals
- IncidentRegistry – records security incidents and response actions

The platform follows a hybrid architecture:

Off-chain: AWS services perform scanning, detection, and automation  
On-chain: blockchain stores tamper-proof evidence and approvals

---

# Development Roadmap

This document outlines the next stages required to complete the project implementation.

---

# Stage 1 – Complete CSPM Scanner (Part 1)

The first milestone is completing the Cloud Security Posture Management module locally.

In this stage we will:

- Configure AWS credentials for local development
- Run the CSPM scanner against AWS resources
- Scan services such as:
  - EC2 Security Groups
  - S3 buckets
- Detect common misconfigurations such as:
  - publicly exposed SSH/RDP ports
  - public bucket configurations

The scanner will then:

1. Generate a structured JSON report
2. Hash the report using SHA‑256
3. Store the report hash on the EvidenceLedger smart contract
4. Verify the blockchain transaction on Sepolia

Pipeline:

AWS Scan → JSON Report → SHA256 Hash → Blockchain Evidence

---

# Stage 2 – Improve CSPM Report Output

Once the scanner works, we will refine the scan output for better usability.

Improvements will include:

- Structured finding objects containing:
  - title
  - severity
  - resource ID
  - details
- Storing full reports off‑chain (e.g., S3)
- Keeping only the hash and metadata on‑chain

This approach preserves:

- detailed reports for analysis
- blockchain immutability for verification

---

# Stage 3 – Deploy Scanner to AWS Lambda

After validating the scanner locally, we will deploy it to AWS.

This stage includes:

- converting the scanner to a Lambda handler
- configuring environment variables
- assigning IAM permissions
- optionally scheduling scans using CloudWatch / EventBridge

Architecture flow:

CloudWatch Trigger  
↓  
Lambda CSPM Scanner  
↓  
AWS Resource Scan  
↓  
Report Hash Generated  
↓  
EvidenceLedger Smart Contract

---

# Stage 4 – Implement Access Control Module (Part 2)

Next we will implement the Zero‑Trust access system.

This stage will introduce:

- an off‑chain Access Engine
- a simple access request workflow
- policy or whitelist evaluation

If a request is approved:

1. the approval will be recorded on‑chain using AccessPolicy
2. access will be granted through temporary credentials

This ensures:

- no permanent permissions
- immutable access approval records

---

# Stage 5 – Integrate AWS STS Temporary Credentials

To enforce zero‑trust access, we will integrate AWS Security Token Service (STS).

In this stage we will:

- configure IAM roles for temporary access
- generate short‑lived credentials
- provide credentials only after successful policy validation

Flow:

Access Request  
↓  
Access Engine  
↓  
Blockchain Approval  
↓  
AWS STS Temporary Credentials

---

# Stage 6 – Implement Incident Response Module (Part 3)

The next module focuses on security incident tracking.

Incidents may be triggered by:

- unauthorized access attempts
- policy violations
- suspicious AWS activity
- failed authentication attempts

Detection sources may include:

- CloudTrail
- CloudWatch
- AWS Config

When an incident occurs:

1. response actions are recorded
2. actions are hashed
3. the hash is written to IncidentRegistry

This creates a tamper‑proof incident timeline.

---

# Stage 7 – Develop the Frontend Dashboard

Once the backend modules are working, we will build a dashboard.

The frontend will likely be implemented using React and hosted on S3 + CloudFront.

The dashboard will display:

- CSPM scan results
- blockchain verification hashes
- access request form
- access approval status
- incident timeline

---

# Stage 8 – Connect Frontend with Backend Services

The frontend will:

- retrieve scan summaries
- fetch blockchain transaction hashes
- display access approval records
- show incident history

This stage integrates:

- AWS backend services
- blockchain contracts
- frontend visualization

---

# Stage 9 – End‑to‑End System Testing

Example scenarios:

Misconfiguration Detection

Public SSH port detected  
↓  
Scanner generates report  
↓  
Hash recorded in EvidenceLedger

Access Request

User requests access  
↓  
AccessPolicy approval recorded  
↓  
Temporary STS credentials issued

Incident Recording

Unauthorized action detected  
↓  
Response actions executed  
↓  
IncidentRegistry updated

---

# Stage 10 – Final Project Preparation

Tasks:

- clean repository structure
- document setup instructions
- prepare screenshots and demo scripts
- prepare fallback data
- clearly explain on‑chain vs off‑chain architecture

---

# Final System Architecture

Off‑Chain Components

- AWS Lambda
- EC2 (optional backend)
- CloudWatch
- CloudTrail
- AWS Config
- S3 storage
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
