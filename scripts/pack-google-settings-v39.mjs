import fs from 'node:fs';
import {brotliCompressSync,brotliDecompressSync,constants} from 'node:zlib';
import {mkdtempSync,rmSync,mkdirSync,readFileSync,writeFileSync,copyFileSync,appendFileSync} from 'node:fs';
import {tmpdir} from 'node:os';import path from 'node:path';import {execFileSync} from 'node:child_process';
const base=mkdtempSync(path.join(tmpdir(),'school-drive-owner-'));
try{
 const pkg=path.join(base,'pkg');mkdirSync(pkg);
 const original=path.join(base,'source.tar');
 writeFileSync(original,brotliDecompressSync(Buffer.from(readFileSync('backend-package.b64','utf8').trim(),'base64')));
 execFileSync('tar',['-xf',original,'-C',pkg]);
 const serverFile=path.join(pkg,'backend/server.mjs'),schemaFile=path.join(pkg,'backend/schema.sql');
 let server=readFileSync(serverFile,'utf8');
 if(!server.includes("if(req.method==='GET'&&url.pathname==='/api/platform/me')"))throw Error('Owner-only platform route missing');
 if(!server.includes("import {Pool} from 'pg';"))throw Error('Expected pg import missing');
 if(!server.includes("'/api/platform/google-drive'")){
  server=server.replace("import {Pool} from 'pg';","import {Pool} from 'pg';\nimport {getGoogleStatus,saveGoogleConfig} from './google-settings-v39.mjs';");
  const anchor=/^[ \\t]*if\\(req\\.method==='GET'&&url\\.pathname==='\\/api\\/platform\\/me'\\)\\{/m;
  const routes=[
   "  if(req.method==='GET'&&url.pathname==='/api/platform/google-drive'){",
   "   requireOwner(user);return send(res,200,await getGoogleStatus(pool));",
   "  }",
   "  if(req.method==='POST'&&url.pathname==='/api/platform/google-drive'){",
   "   requireOwner(user);",
   "   await durableThrottle(pool,clientAddress(req),'owner-google-config',{limit:8,windowSeconds:900});",
   "   return send(res,200,await saveGoogleConfig(pool,(await readJson(req,65536)).googleClient,user.id));",
   "  }"
  ].join('\n');
  if(!anchor.test(server))throw Error('Authenticated route insertion marker missing');
  server=server.replace(anchor,matched=>routes+'\n'+matched);
 }
 writeFileSync(serverFile,server);
 const schema=readFileSync(schemaFile,'utf8');
 if(!schema.includes('CREATE TABLE IF NOT EXISTS platform_google_oauth')){
  appendFileSync(schemaFile,'\n-- Per-platform credentials: AES-256-GCM ciphertext, never plaintext.\nCREATE TABLE IF NOT EXISTS platform_google_oauth (id smallint PRIMARY KEY DEFAULT 1 CHECK (id=1), client_id text NOT NULL, secret_enc text NOT NULL, updated_by uuid REFERENCES platform_owners(id), updated_at timestamptz NOT NULL DEFAULT now());\n');
 }
 copyFileSync('scripts/google-settings-v39.mjs',path.join(pkg,'backend/google-settings-v39.mjs'));
 copyFileSync('scripts/google-settings-v39.test.mjs',path.join(pkg,'backend/google-settings-v39.test.mjs'));
 execFileSync('node',['--check',serverFile],{stdio:'inherit'});
 execFileSync('node',['--test',path.join(pkg,'backend/google-settings-v39.test.mjs')],{stdio:'inherit'});
 const out=path.join(base,'with-google.tar');execFileSync('tar',['-cf',out,'-C',pkg,'.']);
 writeFileSync('backend-package.b64',brotliCompressSync(readFileSync(out),{params:{[constants.BROTLI_PARAM_QUALITY]:10}}).toString('base64'));
 console.log('PASS packaged owner Google Drive settings API; encrypted storage, owner auth, read/write throttling');
}finally{rmSync(base,{recursive:true,force:true})}
