# Incident Handler Lambda – Setup and Deployment Notes

## Purpose

This Lambda function records **security incidents** in the TrustLessCloud system.

It performs the following operations:

- receives incident events
- generates an incident ID
- hashes incident response actions
- stores incident records in Amazon S3
- writes the action hash to the **IncidentRegistry** smart contract

This Lambda represents **Part 3 of the project: Incident Response Logging**.

---

## Folder Location

This README is intended to live inside:

lambdas/incident-handler/

Typical folder contents:

lambdas/incident-handler/
├── index.js
├── package.json
├── node_modules/
└── README.md

---

## Current Lambda Workflow

Incident Event  
↓  
Incident record generated  
↓  
Action hash created (SHA-256)  
↓  
Incident record stored in S3  
↓  
Hash written to IncidentRegistry contract  
↓  
JSON success response returned

---

## Prerequisites

Before deployment ensure the following exist:

- AWS account or Learner Lab access
- Deployed **IncidentRegistry** smart contract on Sepolia
- RPC provider for Sepolia
- wallet private key with Sepolia ETH
- shared S3 storage bucket
- Lambda execution role with correct permissions

---

## Files Required

The Lambda package includes:

- index.js
- package.json
- node_modules/

Before packaging run:

npm install

This installs required dependencies.

---

## Dependencies

Dependencies currently used:

- aws-sdk
- ethers

Example package.json:

{
  "name": "incident-handler-lambda",
  "version": "1.0.0",
  "main": "index.js",
  "dependencies": {
    "aws-sdk": "^2.1693.0",
    "ethers": "^6.16.0"
  }
}

---

## How to Prepare the ZIP File

Inside lambdas/incident-handler:

1. run npm install
2. confirm files exist:
   - index.js
   - package.json
   - node_modules/

3. zip the contents of the folder

ZIP must contain:

index.js  
package.json  
node_modules/

Handler file must remain at the root.

---

## Lambda Creation Steps

1. Open AWS Lambda
2. Click Create Function
3. Choose Author from scratch

Use these settings:

Function name: incident-handler-lambda  
Runtime: Node.js 18.x or Node.js 20.x  
Architecture: x86_64

Upload the ZIP package.

Handler:

index.handler

---

## Recommended Lambda Configuration

Timeout: 30 seconds  
Memory: 256 MB

These values help ensure blockchain transactions confirm successfully.

---

## Environment Variables

Add these variables:

| Key | Example Value | Purpose |
|----|----|----|
AWS_REGION | us-east-1 | AWS service region |
REPORT_BUCKET | trustlesscloud-scan-reports | S3 storage bucket |
RPC_URL | https://eth-sepolia... | Sepolia RPC provider |
PRIVATE_KEY | wallet private key | blockchain signer |
INCIDENT_CONTRACT | 0x... | deployed IncidentRegistry address |
ENVIRONMENT | dev | environment label |

---

## S3 Configuration

The Lambda stores full incident records in S3.

Example bucket:

trustlesscloud-scan-reports

### Output location

Incident records are stored in:

reports/incidents/

Example file:

reports/incidents/incident-1773688139614.json

---

## IAM Permissions Needed

Execution role should allow:

CloudWatch logging  
S3 PutObject access

Suggested policies:

AWSLambdaBasicExecutionRole  
AmazonS3FullAccess (acceptable for development)

---

## Test Event

Example test event:

{
  "incidentType": "UNAUTHORIZED_ACCESS_ATTEMPT",
  "resourceId": "s3://trustlesscloud-scan-reports",
  "severity": 2,
  "action": "Access request denied and logged",
  "details": {
    "source": "access-request-lambda",
    "note": "Manual test event"
  }
}

---

## Expected Successful Response

{
  "success": true,
  "incidentId": "incident-1773688139614",
  "incidentType": "...",
  "actionHash": "0x...",
  "recordLocation": {
    "bucket": "trustlesscloud-scan-reports",
    "key": "reports/incidents/incident-1773688139614.json"
  },
  "blockchain": {
    "txHash": "0x...",
    "blockNumber": 10459342
  }
}

---

## What a Successful Run Proves

Successful execution verifies:

Incident detected  
↓  
Action hashed  
↓  
Incident stored in S3  
↓  
Hash recorded on blockchain

This creates a **tamper-proof incident timeline**.

---

## Future Enhancements

Potential improvements:

- CloudWatch / CloudTrail triggers
- automatic incident detection rules
- status updates (RESPONDING / RESOLVED)
- dashboard timeline visualization
- SIEM integration

---
