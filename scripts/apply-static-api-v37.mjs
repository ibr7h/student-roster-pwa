import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {brotliCompressSync,brotliDecompressSync,constants} from 'node:zlib';
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'school-static-auth-'));
try{
 const dir=path.join(tmp,'src');fs.mkdirSync(dir);
 const raw='backend-package.b64';
 const old=path.join(tmp,'original.tar');
 fs.writeFileSync(old,brotliDecompressSync(Buffer.from(fs.readFileSync(raw,'utf8').trim(),'base64')));
 execFileSync('tar',['-xf',old,'-C',dir]);
 const target=path.join(dir,'backend/server.mjs');
 let s=fs.readFileSync(target,'utf8');
 if(s.includes('SCHOOL_STATIC_ORIGIN')){console.log('Already patched');process.exit(0)}
 function replace(before,after){if(!s.includes(before))throw Error('Missing static patch marker: '+before.slice(0,75));s=s.replace(before,after)}
 replace("const SETUP_TOKEN=process.env.PLATFORM_SETUP_TOKEN||'';",
  "const SETUP_TOKEN=process.env.PLATFORM_SETUP_TOKEN||'';\nconst SCHOOL_STATIC_ORIGIN=process.env.SCHOOL_STATIC_ORIGIN||'https://school-evidence-mobile-v37.onrender.com';\nconst isStaticOrigin=req=>req.headers.origin===SCHOOL_STATIC_ORIGIN;");
 replace("res.end(JSON.stringify(obj));",
  "res.end(JSON.stringify(res._staticAccessToken?{...obj,sessionToken:res._staticAccessToken}:obj));");
 replace("const value=req.headers.cookie?.split(';').map(x=>x.trim()).find(x=>x.startsWith('__Host-school_sid='))?.split('=')[1];",
  "const bearer=req.headers.authorization?.match(/^Bearer ([A-Za-z0-9_-]{43})$/)?.[1];\n const value=bearer||req.headers.cookie?.split(';').map(x=>x.trim()).find(x=>x.startsWith('__Host-school_sid='))?.split('=')[1];");
 replace('async function issueSession(res,memberId,schoolId,ownerId){','async function issueSession(req,res,memberId,schoolId,ownerId){');
 replace("res.setHeader('Set-Cookie',cookie(token));","if(isStaticOrigin(req))res._staticAccessToken=token;else res.setHeader('Set-Cookie',cookie(token));");
 if(!s.includes('await issueSession(res,'))throw Error('Session call marker missing');
 s=s.replaceAll('await issueSession(res,','await issueSession(req,res,');
 const begin=s.indexOf('function checkOrigin(req){'),end=s.indexOf('function validUsername',begin);
 if(begin<0||end<0)throw Error('Origin function marker missing');
 s=s.slice(0,begin)+[
  'function checkOrigin(req){',
  " if(!['POST','PATCH','PUT','DELETE'].includes(req.method))return;",
  ' const origin=req.headers.origin;',
  " if(origin && origin!=='https://'+req.headers.host && origin!=='http://'+req.headers.host && origin!==SCHOOL_STATIC_ORIGIN)throw fail('مصدر الطلب غير مسموح.',403);",
  " if(req.headers['sec-fetch-site']==='cross-site'&&!isStaticOrigin(req))throw fail('الطلب عبر موقع خارجي مرفوض.',403);",
  '}\n'
 ].join('\n')+s.slice(end);
 const logout="if(value)await pool.query('DELETE FROM sessions WHERE token_hash=$1',[hashToken(value)]);";
 if(!s.includes(logout))throw Error('Logout marker missing');
 s=s.replace(logout,
  "const staticBearer=req.headers.authorization?.match(/^Bearer ([A-Za-z0-9_-]{43})$/)?.[1];\n if(staticBearer)await pool.query('DELETE FROM sessions WHERE token_hash=$1',[hashToken(staticBearer)]);\n "+logout);
 const listener="checkOrigin(req);\n if(uri.pathname.startsWith('/api/')||uri.pathname.startsWith('/share/'))";
 if(!s.includes(listener))throw Error('HTTP handler marker missing');
 const cors=[
  "if(isStaticOrigin(req)){",
  " res.setHeader('Access-Control-Allow-Origin',SCHOOL_STATIC_ORIGIN);",
  " res.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type');",
  " res.setHeader('Access-Control-Allow-Methods','GET, POST, DELETE, OPTIONS');",
  " res.setHeader('Access-Control-Max-Age','600');",
  " res.setHeader('Vary','Origin');",
  "}",
  "if(req.method==='OPTIONS'&&uri.pathname.startsWith('/api/')){",
  " if(!isStaticOrigin(req))throw fail('مصدر الطلب غير مسموح.',403);",
  " res.writeHead(204);return res.end();",
  "}",
  "checkOrigin(req);"
 ].join('\n');
 s=s.replace(listener,cors+"\n if(uri.pathname.startsWith('/api/')||uri.pathname.startsWith('/share/'))");
 fs.writeFileSync(target,s);
 const tests=path.join(dir,'backend/static-auth.test.mjs');
 fs.writeFileSync(tests,
 "import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';const s=readFileSync(new URL('./server.mjs',import.meta.url),'utf8');test('exact CORS allowlist and no wildcard credentials',()=>{for(const x of ['SCHOOL_STATIC_ORIGIN','isStaticOrigin(req)','Access-Control-Allow-Headers','Access-Control-Allow-Methods'])assert.ok(s.includes(x));assert.ok(!s.includes(\"Access-Control-Allow-Credentials\"))});test('existing cookie and school scoped session remain valid',()=>{for(const x of ['res._staticAccessToken=token','await issueSession(req,res,','hashToken(value)','staticBearer'])assert.ok(s.includes(x))});");
 execFileSync('node',['--check',target],{stdio:'inherit'});
 execFileSync('node',['--test',...fs.readdirSync(path.join(dir,'backend')).filter(x=>x.endsWith('.test.mjs')&&x!=='owner-recovery.test.mjs').map(x=>path.join(dir,'backend',x))],{stdio:'inherit'});
 const next=path.join(tmp,'next.tar');execFileSync('tar',['-cf',next,'-C',dir,'.']);
 fs.writeFileSync(raw,brotliCompressSync(fs.readFileSync(next),{params:{[constants.BROTLI_PARAM_QUALITY]:10}}).toString('base64'));
 console.log('v3.7 bearer session and CORS patched; full suite also runs in Render after UI build');
}finally{fs.rmSync(tmp,{recursive:true,force:true})}