require("dotenv").config();
const AWS = require("aws-sdk");

AWS.config.update({
  region: process.env.AWS_REGION || "us-east-1",
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const ec2 = new AWS.EC2();
const s3 = new AWS.S3();

async function scanSecurityGroups() {
  const results = [];
  const data = await ec2.describeSecurityGroups().promise();

  for (const group of data.SecurityGroups) {
    for (const perm of group.IpPermissions || []) {
      const fromPort = perm.FromPort;
      const toPort = perm.ToPort;
      const ipRanges = perm.IpRanges || [];

      for (const range of ipRanges) {
        if (
          range.CidrIp === "0.0.0.0/0" &&
          (fromPort === 22 || fromPort === 3389 || toPort === 22 || toPort === 3389)
        ) {
          results.push({
            type: "SECURITY_GROUP_OPEN_PORT",
            title: `Public administrative port exposed in ${group.GroupId}`,
            severity: 2,
            resourceId: group.GroupId,
            details: {
              fromPort,
              toPort,
              cidr: range.CidrIp,
              description: range.Description || ""
            }
          });
        }
      }
    }
  }

  return results;
}

async function scanS3Buckets() {
  const findings = [];
  const buckets = await s3.listBuckets().promise();

  for (const bucket of buckets.Buckets || []) {
    try {
      const status = await s3.getPublicAccessBlock({ Bucket: bucket.Name }).promise();

      const cfg = status.PublicAccessBlockConfiguration;
      const isProtected =
        cfg.BlockPublicAcls &&
        cfg.IgnorePublicAcls &&
        cfg.BlockPublicPolicy &&
        cfg.RestrictPublicBuckets;

      if (!isProtected) {
        findings.push({
          type: "S3_PUBLIC_ACCESS_RISK",
          title: `Bucket ${bucket.Name} may allow public access`,
          severity: 2,
          resourceId: bucket.Name,
          details: cfg
        });
      }
    } catch (err) {
      findings.push({
        type: "S3_PUBLIC_ACCESS_UNKNOWN",
        title: `Could not verify public access settings for ${bucket.Name}`,
        severity: 1,
        resourceId: bucket.Name,
        details: { error: err.message }
      });
    }
  }

  return findings;
}

async function runAwsScans() {
  const securityGroupFindings = await scanSecurityGroups();
  const s3Findings = await scanS3Buckets();

  return [...securityGroupFindings, ...s3Findings];
}

module.exports = {
  scanSecurityGroups,
  scanS3Buckets,
  runAwsScans
};