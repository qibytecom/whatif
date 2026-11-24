import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root=process.cwd(),target=path.resolve('release/WhatIf');
if(!target.startsWith(path.resolve(root,'release')+path.sep))throw new Error('Target keluar dari workspace.');
await fs.mkdir(target,{recursive:true});
const dirs=['src','e2e','scripts','docs','public','.github','dist'];
const files=['README.md','package.json','package-lock.json','tsconfig.json','vite.config.ts','playwright.config.ts','eslint.config.js','index.html','.gitignore','start-local.ps1'];
for(const dir of dirs)await fs.cp(path.join(root,dir),path.join(target,dir),{recursive:true});
for(const file of files)await fs.copyFile(path.join(root,file),path.join(target,file));
await fs.cp(path.join(root,'deliverables'),path.join(target,'deliverables'),{recursive:true,filter:source=>!source.endsWith('.rar')&&!source.endsWith('.zip')&&!source.includes(path.join('evidence','pdf-preview'))});
await fs.writeFile(path.join(target,'MULAI_DI_SINI.txt'),`WHATIF — TUGAS KULIAH\nAli Rifqi Rafsanjani | NIM 2422052\nProdi Technopreneur | Institut Teknologi Batam\n\nLAPORAN: deliverables/WhatIf_Laporan_Lengkap_Ali_Rifqi_2422052.pdf\nLAPORAN UTAMA: deliverables/Laporan_Utama_WhatIf.pdf\nKODE LENGKAP PDF: deliverables/Lampiran_Kode_WhatIf.pdf\nGITHUB: https://github.com/qibytecom/whatif\n\nMENJALANKAN APLIKASI\n1. Pasang Node.js 22+ dari https://nodejs.org/\n2. Buka terminal pada folder ini.\n3. Jalankan: npm ci\n4. Jalankan: npm run dev -- --port 5173 --strictPort\n5. Buka http://127.0.0.1:5173/\n\nPENGUJIAN: npm test, npm run lint, npm run build, npm run test:e2e\nBrowser test menggunakan Chrome lokal. Pada CI digunakan Chromium.\n\nArsip tidak memuat node_modules atau runtime portable. Semua kode aplikasi, konfigurasi, tes, output build dist, laporan dan screenshot disertakan.\nData contoh sepenuhnya fiktif. Data usaha sebenarnya tersimpan di browser masing-masing.\n`);
async function walk(dir){let rows=[];for(const e of await fs.readdir(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())rows.push(...await walk(p));else rows.push(p);}return rows;}
const manifest=[];for(const file of await walk(target)){if(file.endsWith('MANIFEST_SHA256.json'))continue;const bytes=await fs.readFile(file);manifest.push({path:path.relative(target,file).replaceAll('\\','/'),bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});}
await fs.writeFile(path.join(target,'MANIFEST_SHA256.json'),JSON.stringify({project:'WhatIf',repository:'https://github.com/qibytecom/whatif',files:manifest},null,2));console.log(JSON.stringify({target,files:manifest.length,bytes:manifest.reduce((a,x)=>a+x.bytes,0)}));
