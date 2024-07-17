// Script to test URL availability in runtime

const urls = [
  "/",
  "/dev/docs",
  "/map",
  "/maps",
  "/projects",
  "/columns",
  "/docs",
  "/_simple_test",
  "/integrations/qgis/layers/macrostrat-carto-slim.qlr",
];

const baseURL = "http://localhost:3000";

let success = 0;
let errors = 0;

async function testURL(url) {
  const testURL = baseURL + url;
  console.log(`Testing URL ${testURL}`);
  const res = await fetch(testURL);
  if (res.status === 200) {
    console.log(`URL ${url} is available`);
    success++;
  } else {
    console.error(`URL ${url} is not available`);
    errors++;
  }
}

async function testAll() {
  for (const url of urls) {
    await testURL(url);
  }
  console.log(`Success: ${success}, Errors: ${errors}`);

  if (errors > 0) {
    process.exit(1);
  }
}

testAll();
