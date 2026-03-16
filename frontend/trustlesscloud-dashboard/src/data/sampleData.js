export const sampleCspm = {
  success: true,
  reportId: "cspm-1773679862033",
  reportHash: "0xb4d51fca7ad05d862eeadccdcd005bf96f0abf5cb8580f87987fa875f387b33f",
  overallSeverity: 2,
  blockchain: {
    txHash: "0xb9b5ef3b41b142e94137e6c011187e9158c78c96b190f7eff3d84a341d391887",
    blockNumber: 10440118
  },
  summary: {
    findingCount: 2,
    findings: [
      {
        type: "SECURITY_GROUP_OPEN_PORT",
        title: "Public SSH port detected in security group sg-mock123",
        severity: 2,
        resourceId: "sg-mock123"
      },
      {
        type: "S3_PUBLIC_ACCESS_RISK",
        title: "Bucket trustlesscloud-mock-bucket may allow public access",
        severity: 1,
        resourceId: "trustlesscloud-mock-bucket"
      }
    ]
  }
};

export const sampleAccess = {
  success: true,
  approved: true,
  requestId: "access-1773686629805",
  requestedAt: "2026-03-16T18:43:49.805Z",
  userWallet: "0x91F5A3B60937dAC97631052CAceA30935d2c494C",
  resourceId: "s3://trustlesscloud-scan-reports",
  durationSeconds: 900,
  reason: "Approved by whitelist policy",
  blockchain: {
    txHash: "0x115ddd953a5212c6f13cd4dc58606c0e96acb09eb3b459b8cd4cbfcf64c0ac23",
    blockNumber: 10459237
  }
};

export const sampleIncident = {
  incidentId: "incident-1773688139614",
  recordedAt: "2026-03-16T19:08:59.614Z",
  incidentType: "UNAUTHORIZED_ACCESS_ATTEMPT",
  resourceId: "s3://trustlesscloud-scan-reports",
  severity: 2,
  action: "Access request denied and logged",
  actionHash: "0x7e94c9395a8b410adc4f1cab526ce20aa26ed17cc3aedd86746ae6289bf1e514",
  blockchain: {
    txHash: "0x21f14921943519870542441ea2135630b823ea9532011ed5522de5a7b56311fc",
    blockNumber: 10459342
  },
  status: "DETECTED"
};