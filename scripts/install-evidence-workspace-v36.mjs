import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {brotliDecompressSync,brotliCompressSync,constants} from 'node:zlib';

const temp=fs.mkdtempSync(path.join(os.tmpdir(),'evidence-workspace-v36-'));
const run=(bin,args,cwd)=>execFileSync(bin,args,{cwd,stdio:'inherit'});
try{
 const unpack=path.join(temp,'unpacked');fs.mkdirSync(unpack);
 const tar=path.join(temp,'current.tar');
 fs.writeFileSync(tar,brotliDecompressSync(Buffer.from(fs.readFileSync('backend-package.b64','utf8').trim(),'base64')));
 run('tar',['-xf',tar,'-C',unpack]);
 const patchFile=path.join(unpack,'patch-release.mjs');
 let patch=fs.readFileSync(patchFile,'utf8');
 if(patch.includes('evidence-workspace-v36.js'))throw Error('Evidence workspace patch already installed');
 const extra=[
 "// v3.6.0: evidence management as a page, never a fullscreen modal.",
 "const evidenceFs=await import('node:fs');",
 "evidenceFs.copyFileSync('scripts/evidence-workspace-v36.js','public/assets/evidence-workspace.js');",
 "evidenceFs.copyFileSync('scripts/evidence-workspace-v36.css','public/assets/evidence-workspace.css');",
 "let evidenceHtml=evidenceFs.readFileSync('public/index.html','utf8');",
 "if(!evidenceHtml.includes('</body>')||!evidenceHtml.includes('./assets/school-themes.css'))throw Error('Evidence page injection marker missing');",
 "evidenceHtml=evidenceHtml.replace('<link rel=\"stylesheet\" href=\"./assets/school-themes.css\">','<link rel=\"stylesheet\" href=\"./assets/school-themes.css\">\\n<link rel=\"stylesheet\" href=\"./assets/evidence-workspace.css\">');",
 "evidenceHtml=evidenceHtml.replace('</body>','<script src=\"./assets/evidence-workspace.js\"></script>\\n</body>');",
 "evidenceFs.writeFileSync('public/index.html',evidenceHtml);",
 "let evidenceSw=evidenceFs.readFileSync('public/sw.js','utf8');",
 "evidenceSw=evidenceSw.replace(/school-evidence-pwa-cloud-v3\\.\\d+\\.\\d+/g,'school-evidence-pwa-cloud-v3.6.0');",
 "if(!evidenceSw.includes(\"'./assets/mobile.js'\"))throw Error('PWA shell marker missing');",
 "evidenceSw=evidenceSw.replace(\"'./assets/mobile.js'\",\"'./assets/mobile.js','./assets/evidence-workspace.js','./assets/evidence-workspace.css'\");",
 "evidenceFs.writeFileSync('public/sw.js',evidenceSw);",
 "let evidenceViewer=evidenceFs.readFileSync('public/view.js','utf8');",
 "const oldPdf=\"else if(e.mime_type==='application/pdf'){const frame=document.createElement('iframe');frame.src=file;frame.title='معاينة الشاهد';box.append(frame)}\";",
 "const newPdf=\"else if(e.mime_type==='application/pdf'){const note=document.createElement('p');note.textContent='ملف PDF محمي. افتحه في عارض الجهاز لتجنب مشكلات العرض على الآيفون.';box.append(note);const a=document.createElement('a');a.href=file;a.textContent='عرض ملف PDF';box.append(a)}\";",
 "if(!evidenceViewer.includes(oldPdf))throw Error('Protected PDF viewer marker missing');",
 "evidenceViewer=evidenceViewer.replace(oldPdf,newPdf);",
 "evidenceFs.writeFileSync('public/view.js',evidenceViewer);"
 ].join('\n');
 fs.writeFileSync(patchFile,patch+'\n'+extra+'\n');
 const pkgFile=path.join(unpack,'package.json'),pkg=JSON.parse(fs.readFileSync(pkgFile,'utf8'));
 pkg.version='3.6.0';fs.writeFileSync(pkgFile,JSON.stringify(pkg,null,2)+'\n');
 run('node',['--check',patchFile]);
 // Test the EXACT build patch in an isolated copy, without double-applying in Render.
 const check=path.join(temp,'check');fs.mkdirSync(check);
 run('tar',['-xf',tar,'-C',check]);
 fs.copyFileSync(patchFile,path.join(check,'patch-release.mjs'));
 fs.mkdirSync(path.join(check,'public'),{recursive:true});
 run('unzip',['-q','-o',path.resolve('site.zip'),'-d',path.join(check,'public')]);
 fs.mkdirSync(path.join(check,'scripts'),{recursive:true});
 for(const name of ['evidence-workspace-v36.js','evidence-workspace-v36.css'])fs.copyFileSync(path.resolve('scripts',name),path.join(check,'scripts',name));
 run('node',['patch-release.mjs'],check);
 for(const file of ['public/assets/evidence-workspace.js','public/assets/evidence-workspace.css'])if(!fs.existsSync(path.join(check,file)))throw Error('Missing '+file);
 const html=fs.readFileSync(path.join(check,'public/index.html'),'utf8');
 if(!html.includes('evidence-workspace.js')||!html.includes('evidence-workspace.css'))throw Error('Inline evidence assets missing');
 const sw=fs.readFileSync(path.join(check,'public/sw.js'),'utf8');
 if(!sw.includes('school-evidence-pwa-cloud-v3.6.0'))throw Error('PWA cache version not upgraded');
 run('node',['--check','public/assets/evidence-workspace.js'],check);
 const tests=fs.readdirSync(path.join(check,'backend')).filter(x=>x.endsWith('.test.mjs')).map(x=>'backend/'+x);
 run('node',['--test',...tests],check);
 const out=path.join(temp,'patched.tar');
 run('tar',['-cf',out,'-C',unpack,'.']);
 const bytes=brotliCompressSync(fs.readFileSync(out),{params:{[constants.BROTLI_PARAM_QUALITY]:10}});
 fs.writeFileSync('backend-package.b64',bytes.toString('base64'));
 console.log('v3.6.0 evidence workspace patch verified, archive staged');
}finally{fs.rmSync(temp,{recursive:true,force:true});}
