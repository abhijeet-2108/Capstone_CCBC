const { runCSPMScan } = require("../scanner/cspmScanner");

async function test() {
  try {
    const result = await runCSPMScan();
    console.log("CSPM scan result:");
    console.dir(result, { depth: null });
  } catch (error) {
    console.error("Test failed:");
    console.error(error);
  }
}

test();