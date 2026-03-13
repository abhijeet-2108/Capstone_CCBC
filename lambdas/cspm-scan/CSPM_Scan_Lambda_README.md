# CSPM Scan Lambda – Setup and Deployment Notes

## Purpose

This Lambda function is the main **CSPM Scan service** for TrustLessCloud.

It is responsible for:

- generating CSPM findings
- creating a JSON scan report
- storing the full report in Amazon S3
- hashing the report using SHA-256
- writing the hash to the **EvidenceLedger** smart contract on **Ethereum Sepolia**

At the current stage of the project, the Lambda runs in **mock scan mode** for successful testing and integration. Later, the same Lambda can be extended to run real AWS scans.

---

## Folder Location

This README is intended to live inside:

```text
lambdas/cspm-scan/
```

Typical folder contents:

```text
lambdas/cspm-scan/
├── index.js
├── package.json
└── README.md
```

---

## Current Lambda Workflow

```text
Lambda Trigger
↓
Mock CSPM findings generated
↓
JSON report created
↓
Report uploaded to S3
↓
SHA-256 hash generated
↓
Hash written to EvidenceLedger on Sepolia
↓
JSON success response returned
```

---

## Prerequisites

Before deploying the Lambda, the following items must be ready:

- AWS Learner Lab or AWS account access
- Deployed **EvidenceLedger** smart contract on Sepolia
- Sepolia RPC URL
- Wallet private key with Sepolia ETH
- S3 bucket for report storage
- Lambda execution role with correct permissions

---

## Files Required

The Lambda package currently uses:

- `index.js`
- `package.json`
- `node_modules/`

Before zipping, run:

```bash
npm install
```

This installs the required dependencies locally.

---

## Dependencies

Current dependencies:

- `aws-sdk`
- `ethers`

Example `package.json`:

```json
{
  "name": "cspm-scan-lambda",
  "version": "1.0.0",
  "main": "index.js",
  "dependencies": {
    "aws-sdk": "^2.1693.0",
    "ethers": "^6.16.0"
  }
}
```

---

## How to Prepare the ZIP File

Inside the `lambdas/cspm-scan/` folder:

1. run `npm install`
2. make sure these items exist:
   - `index.js`
   - `package.json`
   - `node_modules/`
3. zip the contents of the folder, **not the folder itself**

The uploaded ZIP should contain:

```text
index.js
package.json
node_modules/
```

This is important because AWS Lambda expects the handler file at the root of the ZIP.

---

## Lambda Creation Steps in AWS Console

1. Open **AWS Lambda**
2. Click **Create Function**
3. Choose **Author from scratch**
4. Use these values:

- **Function name:** `cspm-scan-lambda`
- **Runtime:** `Node.js 18.x` or `Node.js 20.x`
- **Architecture:** `x86_64`

5. Create the function
6. Upload the ZIP file
7. Set handler to:

```text
index.handler
```

---

## Recommended Lambda Configuration

### General Configuration

For successful execution, use:

- **Timeout:** `30 seconds`
- **Memory:** `256 MB`

These settings help avoid timeout issues when the Lambda:

- uploads to S3
- connects to Sepolia
- submits a blockchain transaction
- waits for confirmation

---

## Environment Variables

These must be added inside:

**Lambda → Configuration → Environment variables**

Required variables:

| Key | Example Value | Purpose |
|-----|---------------|---------|
| `AWS_REGION` | `us-east-1` | AWS region for S3 / EC2 |
| `SCAN_REPORT_BUCKET` | `trustlesscloud-scan-reports` | S3 bucket for report storage |
| `RPC_URL` | `https://eth-sepolia.g.alchemy.com/v2/...` | Sepolia RPC provider |
| `PRIVATE_KEY` | wallet private key | Signs blockchain transaction |
| `EVIDENCE_CONTRACT` | `0x...` | Deployed EvidenceLedger address |
| `MOCK_SCAN` | `true` | enables mock scan mode |
| `ENVIRONMENT` | `dev` | optional environment label |

---

## S3 Configuration

This Lambda uploads the full JSON scan report to Amazon S3.

### Required bucket

Example bucket name:

```text
trustlesscloud-scan-reports
```

### Bucket notes

- Bucket must exist before the Lambda runs
- Bucket name must match the value in:

```text
SCAN_REPORT_BUCKET
```

### Output location format

Reports are stored using keys like:

```text
reports/cspm-scan-1773419520869.json
```

---

## IAM Permissions Needed

The Lambda execution role must have permission for:

### Minimum required now

- CloudWatch Logs write access
- S3 PutObject access to the report bucket

### Managed role / policy suggestions

- `AWSLambdaBasicExecutionRole`
- `AmazonS3FullAccess` (acceptable for development / testing)

### Later, for real scan mode

Add permissions such as:

- `ec2:DescribeSecurityGroups`

and other read-only actions required for real AWS scanning.

---

## Test Event

A basic test event can be:

```json
{}
```

Because the current Lambda does not require input parameters for mock scan mode.

---

## Expected Successful Response

A successful Lambda response should look similar to:

```json
{
  "statusCode": 200,
  "body": "{\"success\":true,\"mode\":\"mock\",\"reportHash\":\"0x...\",\"overallSeverity\":2,\"reportLocation\":{\"bucket\":\"trustlesscloud-scan-reports\",\"key\":\"reports/cspm-scan-1773419520869.json\"},\"blockchain\":{\"txHash\":\"0x...\",\"blockNumber\":10440118},\"summary\":{\"findingCount\":2,\"findings\":[...]}}"
}
```

---

## What a Successful Run Proves

A successful execution proves that the following pipeline is working:

```text
Lambda
↓
Mock CSPM findings
↓
JSON report
↓
S3 upload
↓
SHA-256 hashing
↓
EvidenceLedger blockchain write
```

This confirms the AWS + blockchain integration for Part 1 of the project.

---

## Current Mode

At this stage:

- **MOCK_SCAN = true**
- findings are simulated
- AWS scanning permissions are not yet required

This allows the team to test deployment, S3 storage, hashing, and blockchain logging before enabling real AWS scanning.

---

## Future Enhancements

Later improvements may include:

- real EC2 Security Group scanning
- S3 bucket public access checks
- scheduled execution using EventBridge
- cleaner report IDs
- dashboard API integration
- environment-specific deployment notes

---

## Troubleshooting Notes

### Timeout error
If Lambda times out:

- increase timeout to 30 seconds
- increase memory to 256 MB
- check whether blockchain confirmation is taking too long

### S3 errors
If S3 upload fails:

- verify bucket exists
- verify `SCAN_REPORT_BUCKET`
- verify Lambda execution role has S3 permission

### Blockchain errors
If blockchain write fails:

- verify `RPC_URL`
- verify `PRIVATE_KEY`
- verify `EVIDENCE_CONTRACT`
- verify contract ABI/function signature matches deployed contract

### Handler error
If Lambda cannot find the handler:

- confirm handler is set to `index.handler`
- confirm ZIP contains `index.js` at the root

---

## Recommended Next Step

Once this Lambda is stable, the next service to implement is:

- **Access Request Lambda** for Part 2

That Lambda will handle:

- access request input
- whitelist/policy checks
- `AccessPolicy` smart contract writes
- approval responses for future frontend integration
