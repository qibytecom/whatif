import {chromium} from 'playwright';
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:390,height:1000},reducedMotion:'reduce'});
page.on('pageerror',e=>console.log('ERROR',e.message));
await page.goto('http://127.0.0.1:5173');await page.getByRole('button',{name:'Coba dengan data contoh'}).click();await page.goto('http://127.0.0.1:5173/history');
await page.getByLabel('Impor riwayat CSV').setInputFiles({name:'sample.csv',mimeType:'text/csv',buffer:Buffer.from('tanggal,pesanan,harga,biaya,kejadian,catatan\n2026-11-23,40,25000,10000,normal,CONTOH FIKTIF')});
await page.getByRole('dialog').waitFor();await page.screenshot({path:'test-results/mobile-import-confirm.png',fullPage:false});
console.log(await page.getByRole('dialog').boundingBox(),await page.getByRole('dialog').getByRole('button',{name:'Simpan catatan',exact:true}).boundingBox());
await page.getByRole('dialog').getByRole('button',{name:'Simpan catatan',exact:true}).click();console.log('Mobile import confirmed');await browser.close();
