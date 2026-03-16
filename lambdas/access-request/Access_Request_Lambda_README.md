# Access Request Lambda – Setup and Deployment Notes

## Purpose

This Lambda function is responsible for handling **Zero-Trust access requests** in the TrustLessCloud system.

It performs the following tasks:

- receives access request input
- loads whitelist policy from Amazon S3
- evaluates access permissions
- records approved requests on the **AccessPolicy** smart contract
- stores request records in Amazon S3
- returns approval or denial response

This Lambda represents **Part 2 of the project: Zero-Trust Access Control**.

---

## Folder Location

This README is intended to live inside:

lambdas/access-request/

Typical folder contents:

lambdas/access-request/
├── index.js
├── package.json
├── node_modules/
└── README.md

---

## Current Lambda Workflow

Access Request Event  
↓  
Whitelist loaded from S3  
↓  
Policy evaluation  
↓  
If approved → write to AccessPolicy smart contract  
↓  
Access record saved to S3  
↓  
JSON response returned

---

## Prerequisites

Before deploying the Lambda, the following must exist:

- AWS Learner Lab or AWS account
- Deployed **AccessPolicy** smart contract on Sepolia
- Sepolia RPC endpoint
- Wallet private key with Sepolia ETH
- Shared S3 bucket for project storage
- Whitelist configuration file in S3

---

## Files Required

The Lambda package uses:

- index.js
- package.json
- node_modules/

Before packaging the Lambda:

npm install

This installs the dependencies required by the Lambda.

---

## Dependencies

Current dependencies:

- aws-sdk
- ethers

Example package.json:

{
  "name": "access-request-lambda",
  "version": "1.0.0",
  "main": "index.js",
  "dependencies": {
    "aws-sdk": "^2.1693.0",
    "ethers": "^6.16.0"
  }
}

---

## How to Prepare the ZIP File

Inside the lambdas/access-request folder:

1. run npm install
2. confirm the following files exist:
   - index.js
   - package.json
   - node_modules/

3. zip the contents of the folder (not the folder itself)

The ZIP should contain:

index.js  
package.json  
node_modules/

AWS Lambda requires the handler file to be at the root of the ZIP.

---

## Lambda Creation Steps in AWS Console

1. Open AWS Lambda
2. Click Create Function
3. Choose Author from scratch

Use the following configuration:

Function name: access-request-lambda  
Runtime: Node.js 18.x or Node.js 20.x  
Architecture: x86_64

Upload the ZIP package.

Set handler to:

index.handler

---

## Recommended Lambda Configuration

Timeout: 30 seconds  
Memory: 256 MB

This ensures reliable blockchain transaction submission and S3 operations.

---

## Environment Variables

Add these variables in:

Lambda → Configuration → Environment variables

| Key | Example Value | Purpose |
|----|----|----|
AWS_REGION | us-east-1 | AWS service region |
CONFIG_BUCKET | trustlesscloud-scan-reports | S3 bucket containing whitelist |
WHITELIST_KEY | config/whitelist.json | whitelist file location |
RPC_URL | https://eth-sepolia... | Sepolia RPC endpoint |
PRIVATE_KEY | wallet private key | blockchain signing key |
ACCESS_CONTRACT | 0x... | deployed AccessPolicy contract |
ENVIRONMENT | dev | optional environment label |

---

## S3 Configuration

This Lambda interacts with the shared project bucket.

Example bucket:

trustlesscloud-scan-reports

### Required files

Whitelist configuration:

config/whitelist.json

Example whitelist:

{
  "policies": [
    {
      "userWallet": "0xYOUR_WALLET",
      "resourceId": "s3://trustlesscloud-scan-reports",
      "maxDurationSeconds": 3600
    }
  ]
}

### Output storage location

Access request records are stored under:

reports/access/

Example output file:

reports/access/access-1773686629805.json

---

## IAM Permissions Needed

Lambda execution role must allow:

- CloudWatch Logs write
- S3 read access for whitelist file
- S3 write access for access reports

Suggested policies:

AWSLambdaBasicExecutionRole  
AmazonS3FullAccess (acceptable for development)

---

## Test Event

Example test event for an approved request:

{
  "userWallet": "0xYOUR_WALLET",
  "resourceId": "s3://trustlesscloud-scan-reports",
  "durationSeconds": 900
}

---

## Expected Successful Response

{
  "success": true,
  "approved": true,
  "requestId": "access-1773686629805",
  "userWallet": "...",
  "resourceId": "...",
  "durationSeconds": 900,
  "blockchain": {
    "txHash": "0x...",
    "blockNumber": 10459237
  }
}

---

## What a Successful Run Proves

Lambda execution confirms:

Access request  
↓  
Whitelist policy evaluation  
↓  
Blockchain approval recorded  
↓  
Access log stored in S3

This verifies the **Zero-Trust access workflow** for Part 2.

---

## Future Enhancements

Possible improvements:

- integrate AWS STS temporary credentials
- enforce role-based access policies
- add API Gateway request validation
- add frontend access request form
- audit policy updates

---

## Recommended Next Step

Once Access Request Lambda is stable, the next service to deploy is:

Incident Handler Lambda

This Lambda records security incidents and writes evidence to the **IncidentRegistry smart contract**.