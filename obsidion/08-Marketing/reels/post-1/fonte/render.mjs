// Uso: node render.mjs <index.html> <pasta-de-quadros> <executavel-chromium> [segundos separados por vírgula]
// Sem a lista de segundos, gera todos os quadros do Reel. FPS=120 dá os subquadros do desfoque de movimento.
// Precisa de playwright-core ao lado deste arquivo; o pacote não faz parte do app.
import { chromium } from "playwright-core";
import path from "node:path";
import { mkdir } from "node:fs/promises";

const [indice, saida, executavel, amostras] = process.argv.slice(2);
const FPS = Number(process.env.FPS ?? 30);
const pagina = path.resolve(indice);

await mkdir(saida, { recursive: true });
const browser = await chromium.launch({ executablePath: executavel });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
await page.goto(`file://${pagina}`);
await page.evaluate(async () => {
  await Promise.all([
    document.fonts.load("900 100px 'Sofia Sans Extra Condensed'", "VOCÊ"),
    document.fonts.load("700 50px 'Sofia Sans'", "Você"),
  ]);
  await document.fonts.ready;
});

const duracao = await page.evaluate(() => window.DURACAO);
const quadros = amostras
  ? amostras.split(",").map((s) => Math.round(Number(s) * FPS))
  : Array.from({ length: duracao * FPS }, (_, i) => i);

for (const q of quadros) {
  await page.evaluate((t) => window.render(t), q / FPS);
  const nome = String(q).padStart(5, "0");
  await page.screenshot({ path: path.join(saida, `${nome}.jpg`), type: "jpeg", quality: 96 });
}
await browser.close();
console.log(`${quadros.length} quadros`);
