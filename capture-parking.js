const { chromium } = require("playwright");

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: {
      width: 412,
      height: 732,
      isMobile: true,
    },
    deviceScaleFactor: 1,
  });

  await page.goto("http://localhost:8081", {
    waitUntil: "networkidle",
  });

  await page.screenshot({
    path: "parking-full-page.png",
    fullPage: true,
  });

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
