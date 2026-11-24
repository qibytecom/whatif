import fs from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
await fs.mkdir('deliverables/evidence',{recursive:true});
const cases=[['lint',['node_modules/eslint/bin/eslint.js','.']],['typecheck',['node_modules/typescript/bin/tsc','-b']],['build',['node_modules/vite/bin/vite.js','build']]];
const evidence=[];for(const [name,args] of cases){const start=Date.now();const r=spawnSync(process.execPath,args,{encoding:'utf8',env:{...process.env,NO_COLOR:'1',FORCE_COLOR:'0'}});await fs.writeFile(`deliverables/evidence/${name}.txt`,(r.stdout??'')+(r.stderr??''));evidence.push({name,command:['node',...args],exitCode:r.status,durationMs:Date.now()-start});console.log(name,r.status);if(r.status!==0)throw new Error(name+' failed');}
await fs.writeFile('deliverables/evidence/build-checks.json',JSON.stringify({date:new Date().toISOString(),node:process.version,checks:evidence},null,2));
