import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {brotliCompressSync,brotliDecompressSync,constants} from 'node:zlib';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'school-pdf-v35-'));
try{
 const dir=path.join(temp,'source');fs.mkdirSync(dir);
 const old=path.join(temp,'source.tar');
 fs.writeFileSync(old,brotliDecompressSync(Buffer.from(fs.readFileSync('backend-package.b64','utf8').trim(),'base64')));
 execFileSync('tar',['-xf',old,'-C',dir]);
 const at=p=>path.join(dir,p);
 const replace=(filename,before,after)=>{
  let text=fs.readFileSync(at(filename),'utf8');
  if(!text.includes(before))throw Error('Cannot locate marker: '+filename+' '+before.slice(0,70));
  fs.writeFileSync(at(filename),text.replace(before,after));
 };
 const diagnostic=fs.readFileSync(at('backend/server.mjs'),'utf8');
 const evidenceRoute=diagnostic.indexOf("if(req.method==='POST'&&url.pathname==='/api/evidences')");
 console.log('DIAGNOSTIC PDF evidence route:',diagnostic.slice(evidenceRoute-30,evidenceRoute+2200));
 if(fs.readFileSync(at('backend/server.mjs'),'utf8').includes('preparePdfForStorage'))throw Error('PDF patch already present');
 fs.copyFileSync('scripts/pdf-compression-v35.mjs',at('backend/pdf-compression.mjs'));
 fs.copyFileSync('scripts/pdf-compression-v35.test.mjs',at('backend/pdf-compression.test.mjs'));
 fs.mkdirSync(at('scripts'),{recursive:true});
 fs.copyFileSync('scripts/patch-pdf-ui-v35.mjs',at('scripts/patch-pdf-ui-v35.mjs'));
 replace('backend/security.mjs','export const MAX_FILE_BYTES = 6 * 1024 * 1024;',
  'export const MAX_FILE_BYTES = 6 * 1024 * 1024;\nexport const MAX_INCOMING_PDF_BYTES = 24 * 1024 * 1024;');
 replace('backend/security.mjs',"if(typeof input!=='string'||input.length>(MAX_FILE_BYTES*4/3+200)||!MIME_TYPES.has(mime))",
  "const maxBytes=mime==='application/pdf'?MAX_INCOMING_PDF_BYTES:MAX_FILE_BYTES;\n if(typeof input!=='string'||input.length>(Math.ceil(maxBytes*4/3)+200)||!MIME_TYPES.has(mime))");
 replace('backend/security.mjs',"if(!bytes.length||bytes.length>MAX_FILE_BYTES) throw fail('حجم الملف يتجاوز الحد الأقصى (6 ميغابايت).');",
  "if(!bytes.length||bytes.length>maxBytes) throw fail('حجم الملف يتجاوز الحد الأقصى المسموح لهذا النوع.',413);");
 replace('backend/server.mjs',"import {Pool} from 'pg';",
  "import {Pool} from 'pg';\nimport {preparePdfForStorage} from './pdf-compression.mjs';");
 replace('backend/server.mjs',"version:'3.4.0'","version:'3.5.0'");
 replace('backend/server.mjs',"requireWrite(user);const b=await readJson(req,9*1024*1024),itemId=shortText(b.itemId,80);",
  "requireWrite(user);const b=await readJson(req,34*1024*1024),itemId=shortText(b.itemId,80);");
 const sourcePath=at('backend/server.mjs');
 let source=fs.readFileSync(sourcePath,'utf8');
 const postRoute=source.indexOf("if(req.method==='POST'&&url.pathname==='/api/evidences'){");
 const idLocation=source.indexOf('const id=randomUUID();',postRoute);
 if(postRoute<0||idLocation<postRoute)throw Error('Cannot find school evidence POST id assignment');
 source=source.slice(0,idLocation)+"const originalFile=type==='file'?await preparePdfForStorage(bytes,mimetype):null;\n  if(originalFile)bytes=originalFile.bytes;\n  "+source.slice(idLocation);
 fs.writeFileSync(sourcePath,source);
 replace('backend/server.mjs',"await audit(user,'evidence_add',id);return send(res,201,{id});",
  "await audit(user,'evidence_add',id);return send(res,201,{id,...(originalFile?{compression:{originalBytes:originalFile.originalBytes,storedBytes:originalFile.storedBytes,compressed:originalFile.compressed,reason:originalFile.reason}}:{})});");
 replace('backend/structure.test.mjs','readJson\\(req,9\\*1024\\*1024\\),itemId',
  'readJson\\(req,34\\*1024\\*1024\\),itemId');
 fs.appendFileSync(at('patch-release.mjs'),"\n// PDF compression UI is applied after protected sharing/QR features.\nawait import('./scripts/patch-pdf-ui-v35.mjs');\n");
 const pkgFile=at('package.json');const pkg=JSON.parse(fs.readFileSync(pkgFile,'utf8'));pkg.version='3.5.0';fs.writeFileSync(pkgFile,JSON.stringify(pkg,null,2)+'\n');
 fs.mkdirSync(at('public'),{recursive:true});
 execFileSync('unzip',['-q','-o',path.resolve('site.zip'),'-d',at('public')],{stdio:'inherit'});
 execFileSync('node',['patch-release.mjs'],{cwd:dir,stdio:'inherit'});
 execFileSync('node',['--check',at('backend/server.mjs')],{stdio:'inherit'});
 execFileSync('node',['--check',at('backend/pdf-compression.mjs')],{stdio:'inherit'});
 const tests=fs.readdirSync(at('backend')).filter(x=>x.endsWith('.test.mjs')).map(x=>at('backend/'+x));
 execFileSync('node',['--test',...tests],{stdio:'inherit'});
 const ui=fs.readFileSync(at('public/index.html'),'utf8');
 if(!ui.includes('CLOUD_MAX_INCOMING_PDF')||!ui.includes('result.compression'))throw Error('Upload UI missing');
 if(!fs.readFileSync(at('public/sw.js'),'utf8').includes('school-evidence-pwa-cloud-v3.5.0'))throw Error('PWA cache not refreshed');
 const archive=path.join(temp,'output.tar');
 execFileSync('tar',['-cf',archive,'-C',dir,'.']);
 fs.writeFileSync('backend-package.b64',brotliCompressSync(fs.readFileSync(archive),{params:{[constants.BROTLI_PARAM_QUALITY]:10}}).toString('base64'));
 console.log('PDF compression v3.5.0 packaged; all tests passed.');
}finally{fs.rmSync(temp,{recursive:true,force:true})}
