import fs from 'node:fs/promises';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
import {createCanvas} from '@napi-rs/canvas';
const file='deliverables/WhatIf_Laporan_Lengkap_Ali_Rifqi_2422052.pdf';
const index=JSON.parse(await fs.readFile('deliverables/report-index.json','utf8'));
const doc=await getDocument({data:new Uint8Array(await fs.readFile(file)),useSystemFonts:true}).promise;
if(doc.numPages!==index.totalPages)throw new Error('Jumlah halaman tidak cocok.');
const checked=[];let mainText='';
for(let i=1;i<=doc.numPages;i++){const page=await doc.getPage(i);const text=(await page.getTextContent()).items.map(x=>x.str??'').join(' ');if(text.replace(/\s/g,'').length<20)throw new Error(`Halaman kosong: ${i}`);checked.push({page:i,characters:text.length});if(i<=index.mainPages)mainText+=text+'\n';}
for(const text of ['Ali Rifqi Rafsanjani','2422052','TECHNOPRENEUR','Interaksi Manusia','Zainul Munir','Abstrak','Daftar Pustaka','892','6.600.000','45','14','github.com/qibytecom/whatif'])if(!mainText.includes(text))throw new Error('Konten PDF hilang: '+text);
await fs.mkdir('deliverables/evidence/pdf-preview',{recursive:true});
const selected=[1,4,5,15,23,28,34,44,45,54,index.mainPages,index.mainPages+1,index.mainPages+15,doc.numPages];
for(const i of selected){const page=await doc.getPage(i),viewport=page.getViewport({scale:1.1}),canvas=createCanvas(Math.ceil(viewport.width),Math.ceil(viewport.height));await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;await fs.writeFile(`deliverables/evidence/pdf-preview/page-${String(i).padStart(3,'0')}.png`,canvas.toBuffer('image/png'));}
await fs.writeFile('deliverables/evidence/pdf-inspection.json',JSON.stringify({file,pages:doc.numPages,nonemptyPages:checked.length,requiredTextVerified:true,previews:selected,checked},null,2));console.log(JSON.stringify({pages:doc.numPages,nonempty:checked.length,previews:selected.length}));await doc.cleanup();
