import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {brotliDecompressSync,brotliCompressSync,constants} from 'node:zlib';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'school-ui-fix-'));
try {
 const root=path.join(temp,'src');fs.mkdirSync(root);
 const tar=path.join(temp,'original.tar');
 fs.writeFileSync(tar,brotliDecompressSync(Buffer.from(fs.readFileSync('backend-package.b64','utf8').trim(),'base64')));
 execFileSync('tar',['-xf',tar,'-C',root]);
 const at=p=>path.join(root,p);
 let p=fs.readFileSync(at('patch-release.mjs'),'utf8');
 if(p.includes('school-evidence-pwa-cloud-v3.3.2')){console.log('Already patched');process.exit(0)}
 if(!p.includes('school-evidence-pwa-cloud-v3.3.1'))throw Error('Unexpected existing version');
 p=p.replace('school-evidence-pwa-cloud-v3.3.1','school-evidence-pwa-cloud-v3.3.2');
 p += '\n// Only report successful cloud load once a server data request has succeeded.\n'+[
 "const cloudFs=await import('node:fs');",
 "const pagePath='public/index.html';",
 "let page=cloudFs.readFileSync(pagePath,'utf8');",
 "const first=page.indexOf('<aside id=\"storageNotice\"');",
 "const last=page.indexOf('</aside>',first);",
 "if(first<0||last<0)throw Error('Old storage banner not found');",
 "page=page.slice(0,first)+'<aside id=\"storageNotice\" class=\"hidden no-print px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold leading-relaxed\" role=\"status\" aria-live=\"polite\">تم تحميل بيانات المدرسة من الخادم بنجاح؛ يلزم الاتصال بالإنترنت لحفظ التعديلات.</aside>'+page.slice(last+8);",
 "const marker=\"      const snapshot = await cloudRequest('/data');\";",
 "if(!page.includes(marker))throw Error('Cloud load marker not found');",
 "page=page.replace(marker,marker+\"\\n      document.getElementById('storageNotice')?.classList.remove('hidden');\");",
 "cloudFs.writeFileSync(pagePath,page);"
 ].join('\n')+'\n';
 fs.writeFileSync(at('patch-release.mjs'),p);
 const pkg=JSON.parse(fs.readFileSync(at('package.json'),'utf8'));
 pkg.version='3.3.2';fs.writeFileSync(at('package.json'),JSON.stringify(pkg,null,2)+'\n');
 execFileSync('node',['--check',at('patch-release.mjs')],{stdio:'inherit'});
 execFileSync('node',['--test',...fs.readdirSync(at('backend')).filter(f=>f.endsWith('.test.mjs')).map(f=>at('backend/'+f))],{stdio:'inherit'});
 const output=path.join(temp,'new.tar');execFileSync('tar',['-cf',output,'-C',root,'.']);
 fs.writeFileSync('backend-package.b64',brotliCompressSync(fs.readFileSync(output),{params:{[constants.BROTLI_PARAM_QUALITY]:10}}).toString('base64'));
 console.log('Cloud notice fix packed for v3.3.2');
}finally{fs.rmSync(temp,{recursive:true,force:true});}
