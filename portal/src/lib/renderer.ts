import type { Browser } from "puppeteer-core";

export async function renderHtmlToPng(html: string): Promise<Buffer> {
  let browser: Browser;

  if (process.env.NODE_ENV === "development") {
    const puppeteer = await import("puppeteer");
    browser = await puppeteer.default.launch({ headless: true });
  } else {
    const chromium = await import("@sparticuz/chromium");
    const puppeteer = await import("puppeteer-core");
    browser = await puppeteer.default.launch({
      args: chromium.default.args,
      executablePath: await chromium.default.executablePath(),
      headless: true,
    });
  }

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.setContent(html, { waitUntil: "networkidle0", timeout: 15000 });
    const screenshot = await page.screenshot({ type: "png", fullPage: false });
    return Buffer.from(screenshot);
  } finally {
    await browser.close();
  }
}
