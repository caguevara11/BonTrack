import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = "http://localhost:3000";
const PASS = "Bontrack2026!";
const OUT = "screenshots";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();

async function shot(page, name) {
  await page.waitForTimeout(700); // dejar correr los reveals de Motion
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
  console.log("✓", name);
}

async function newCtx() {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  return ctx;
}

async function login(page, email) {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.fill("#email", email);
  await page.fill("#password", PASS);
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.pathname.startsWith("/login") && !u.pathname.startsWith("/inicio"), {
    timeout: 60000,
  });
  await page.waitForLoadState("load");
}

// ── Público (sin login) ──────────────────────────────────────────
{
  const ctx = await newCtx();
  const page = await ctx.newPage();
  page.setDefaultNavigationTimeout(60000);
  page.setDefaultTimeout(60000);
  page.setDefaultNavigationTimeout(60000);
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await shot(page, "01-publico-PUB-1");

  // Buscar bono PLN/A/4 (partido y serie toman el default del catálogo).
  await page.fill("#numero", "4");
  await page.click('button:has-text("Buscar")');
  await page.waitForSelector("text=Historial de custodia", { timeout: 60000 });
  await shot(page, "02-publico-resultado");

  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await shot(page, "03-login");

  await page.goto(`${BASE}/bono/3`, { waitUntil: "domcontentloaded" });
  await shot(page, "04-bono-historial");
  await ctx.close();
}

// ── Tenedor (Carlos) ─────────────────────────────────────────────
{
  const ctx = await newCtx();
  const page = await ctx.newPage();
  page.setDefaultNavigationTimeout(60000);
  page.setDefaultTimeout(60000);
  page.setDefaultNavigationTimeout(60000);
  await login(page, "carlos@bontrack.cr");
  await shot(page, "05-TEN-1-mis-bonos");
  // Bono #5 = token_id 4 (Carlos aún lo posee).
  await page.goto(`${BASE}/tenedor/transferir/4`, { waitUntil: "domcontentloaded" });
  await shot(page, "06-TEN-2-transferir");
  await ctx.close();
}

// ── TSE ──────────────────────────────────────────────────────────
{
  const ctx = await newCtx();
  const page = await ctx.newPage();
  page.setDefaultNavigationTimeout(60000);
  page.setDefaultTimeout(60000);
  page.setDefaultNavigationTimeout(60000);
  await login(page, "tse@bontrack.cr");
  await shot(page, "07-TSE-3-trazabilidad");
  await page.fill("#numero", "4");
  await page.click('button:has-text("Buscar")');
  await page.waitForSelector("text=Historial de custodia", { timeout: 60000 });
  await shot(page, "08-TSE-3-resultado");
  await ctx.close();
}

// ── Partido (PLN) ────────────────────────────────────────────────
{
  const ctx = await newCtx();
  const page = await ctx.newPage();
  page.setDefaultNavigationTimeout(60000);
  page.setDefaultTimeout(60000);
  page.setDefaultNavigationTimeout(60000);
  await login(page, "pln@bontrack.cr");
  await shot(page, "09-partido-panel");
  await ctx.close();
}

await browser.close();
console.log("\nListo → web/screenshots/");
