const { recordFinding } = require("../blockchain/evidence");

async function main() {
  try {
    const result = await recordFinding(
      "ManualTest",
      "0x1234567890123456789012345678901234567890123456789012345678901234",
      1
    );

    console.log(result);
  } catch (err) {
    console.error(err);
  }
}

main();