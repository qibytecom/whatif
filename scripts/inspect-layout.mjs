import { chromium } from "playwright";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({
  viewport: { width: 390, height: 1000 },
  reducedMotion: "reduce",
});
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
await page.goto("http://127.0.0.1:5173");
await page.getByRole("button", { name: "Coba dengan data contoh" }).click();
for (const width of [1440, 768, 390]) {
  await page.setViewportSize({ width, height: 1000 });
  for (const path of [
    "/",
    "/simulator",
    "/scenarios",
    "/insights",
    "/reports",
    "/settings",
    "/history",
    "/decisions",
  ]) {
    await page.goto(`http://127.0.0.1:5173${path}`);
    await page.locator("h1").first().waitFor();
    const bounds=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));console.log(width,path,bounds);if(bounds.scroll>bounds.width)errors.push(`Overflow ${width} ${path}`);
    await page.screenshot({
      path: `test-results/${width}-${path.replaceAll("/", "") || "dashboard"}.png`,
      fullPage: true,
      animations: "disabled",
    });
  }
}
// Exercise filled views and every operating type in a fresh isolated browser.
await page.setViewportSize({width:1440,height:1000});
await page.goto('http://127.0.0.1:5173/history');
const localDate=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const samples=Array.from({length:56},(_,i)=>{const date=new Date(Date.parse(localDate+'T00:00:00Z')+(i-56)*86400000);const day=date.getUTCDay();return `${date.toISOString().slice(0,10)},${[0,32,35,38,40,45,50][day]},25000,10000,${day===0?'closed':'normal'},CONTOH FIKTIF QA`;});
await page.getByLabel('Impor riwayat CSV').setInputFiles({name:'qa-sales.csv',mimeType:'text/csv',buffer:Buffer.from('tanggal,pesanan,harga,biaya,kejadian,catatan\n'+samples.join('\n'))});
await page.getByRole('dialog').getByRole('button',{name:'Simpan catatan',exact:true}).click();
for(const width of [1440,768,390]){await page.setViewportSize({width,height:1000});for(const path of ['/history',...Array.from({length:8},(_,i)=>`/simulator?template=${i+3}`)]){await page.goto(`http://127.0.0.1:5173${path}`);await page.locator('h1').first().waitFor();const bounds=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));console.log('Filled',width,path,bounds);if(bounds.scroll>bounds.width)errors.push(`Overflow ${width} ${path}`);await page.screenshot({path:`test-results/filled-${width}-${path.replaceAll(/[^a-z0-9]/gi,'-')}.png`,fullPage:true,animations:'disabled'});}}
await page.goto('http://127.0.0.1:5173/simulator');await page.getByRole('button',{name:'Mulai uji keputusan',exact:true}).click();await page.getByRole('button',{name:'Simpan & mulai uji',exact:true}).click();await page.goto('http://127.0.0.1:5173/decisions');await page.getByLabel('Pesanan aktual periode uji').fill('1000');await page.getByLabel('Omzet aktual periode uji').fill('25000000');await page.getByLabel('Biaya variabel aktual periode uji').fill('10000000');await page.getByLabel('Biaya rutin aktual periode uji').fill('9000000');await page.getByRole('button',{name:'Simpan evaluasi',exact:true}).click();
for(const width of [1440,768,390]){await page.setViewportSize({width,height:1000});await page.screenshot({path:`test-results/filled-${width}-evaluation.png`,fullPage:true,animations:'disabled'});}
await page.setViewportSize({ width: 1440, height: 1000 });
await page.goto("http://127.0.0.1:5173/reports");
await page.pdf({
  path: "test-results/whatif-report.pdf",
  format: "A4",
  printBackground: true,
  preferCSSPageSize: true,
});
console.log("Page errors:", errors);
if (errors.length) process.exitCode = 1;
await browser.close();
