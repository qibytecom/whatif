import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root=process.cwd(),mode=process.argv[2]??'list',group=process.argv[3]??'source';
async function walk(dir){let files=[];for(const e of await fs.readdir(dir,{withFileTypes:true})){const name=path.join(dir,e.name);if(e.isDirectory())files.push(...await walk(name));else files.push(name.replaceAll('\\','/'));}return files;}
const source=[...await walk('src'),...await walk('e2e'),...await walk('scripts'),...await walk('.github'),...await walk('docs'),...await walk('public'),'README.md','package.json','package-lock.json','tsconfig.json','vite.config.ts','playwright.config.ts','eslint.config.js','index.html','.gitignore','start-local.ps1'].sort();
const docs=(await walk('deliverables')).filter(f=>!f.endsWith('.rar')&&!f.endsWith('.zip')&&!f.includes('/pdf-preview/')&&!f.endsWith('report-cover-preview.png')&&!f.endsWith('.html')).sort();
const files=group==='docs'?docs:source;
if(mode==='list'){const entries=await Promise.all(files.map(async(file,index)=>{const data=await fs.readFile(file);return {index,path:file,bytes:data.length,base64Length:data.toString('base64').length,sha256:createHash('sha256').update(data).digest('hex')};}));console.log(JSON.stringify(entries));}
else if(mode==='read'){const index=Number(process.argv[4]),offset=Number(process.argv[5]??0);if(!Number.isInteger(index)||index<0||index>=files.length||!Number.isInteger(offset)||offset<0)throw new Error('Invalid read range');const text=(await fs.readFile(files[index])).toString('base64'),chunk=text.slice(offset,offset+16384);console.log(JSON.stringify({path:files[index],chunk,next:offset+chunk.length,total:text.length}));}
else throw new Error('Unknown mode');
