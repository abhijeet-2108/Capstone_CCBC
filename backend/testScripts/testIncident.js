const { recordIncident } = require("../blockchain/incident");

async function main() {
  try {
    const result = await recordIncident(
      "INC-001",
      "0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd",
      0
    );

    console.log(result);
  } catch (err) {
    console.error(err);
  }
}

main();