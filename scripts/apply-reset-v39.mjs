import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {brotliDecompressSync,brotliCompressSync,constants} from 'node:zlib';
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'school-password-reset-'));
try{
 const dest=path.join(tmp,'pkg');fs.mkdirSync(dest);
 const archive=path.join(tmp,'before.tar');
 fs.writeFileSync(archive,brotliDecompressSync(Buffer.from(fs.readFileSync('backend-package.b64','utf8').trim(),'base64')));
 execFileSync('tar',['-xf',archive,'-C',dest]);
 const f=x=>path.join(dest,x);
 let server=fs.readFileSync(f('backend/server.mjs'),'utf8');
 const mark=" if(req.method==='POST'&&url.pathname==='/api/register/start'){";
 if(!server.includes(mark))throw Error('v3.9 registration backend is not installed yet');
 if(!server.includes('/api/password/reset/start')){
  const im="import {Pool} from 'pg';";
  if(!server.includes(im))throw Error('Backend import marker missing');
  server=server.replace(im,im+"\nimport {beginReset,finishReset} from './reset-v39.mjs';");
  const handlers=[
   " if(req.method==='POST'&&url.pathname==='/api/password/reset/start'){",
   "  throttle(req.socket.remoteAddress,'password-reset-start',5);",
   "  return send(res,202,await beginReset(pool,await readJson(req,4000)));",
   " }",
   " if(req.method==='POST'&&url.pathname==='/api/password/reset/verify'){",
   "  throttle(req.socket.remoteAddress,'password-reset-verify',10);",
   "  return send(res,200,await finishReset(pool,await readJson(req,10000)));",
   " }"
  ].join('\n');
  server=server.replace(mark,handlers+'\n'+mark);
 }
 const memberMarker=" const old=(await pool.query('SELECT id,password_hash,is_admin FROM members WHERE id=$1 AND school_id=$2',[id,user.schoolId])).rows[0];";
 if(!server.includes('username is already registered globally')){
  if(!server.includes(memberMarker))throw Error('School member validation marker missing');
  server=server.replace(memberMarker,
   " const already=(await pool.query('SELECT id FROM members WHERE lower(username)=lower($1) AND id<>$2 LIMIT 1',[b.username,id])).rows[0];\n"+
   " if(already)throw fail('اسم المستخدم مستخدم بالفعل في المنصة.',409); // username is already registered globally\n"+memberMarker);
 }



 // Keep private reviewer links tied to the *real* S3 reader exported by
 // this packaged backend (readSchoolEvidence). Fix the stale v3.4 call.
 server=server.split(String.fromCharCode(10)).filter(line=>!line.includes("import {downloadEvidence} from './storage.mjs'")).join(String.fromCharCode(10));
 if(server.includes('downloadEvidence(')){
  if(!server.includes("readSchoolEvidence"))throw Error('School-scoped private storage reader is missing');
  server=server.replaceAll('downloadEvidence(','readSchoolEvidence(');
 }
 if(server.includes('downloadEvidence('))throw Error('Deprecated PDF storage reader remains');
 // Durable PostgreSQL throttling keeps sensitive requests bounded across restarts.
 const rateImport="import {durableThrottle} from './rate-limit-v39.mjs';";
 if(!server.includes(rateImport)){
  if(!server.includes("import {Pool} from 'pg';"))throw Error('Cannot add rate-limit import');
  server=server.replace("import {Pool} from 'pg';","import {Pool} from 'pg';\n"+rateImport);
 }
 const guarded={
  "school-registration":{limit:6,windowSeconds:900},
  "school-registration-resend":{limit:15,windowSeconds:900},
  "school-registration-verify":{limit:20,windowSeconds:900},
  "school-login":{limit:35,windowSeconds:900},
  "password-reset-start":{limit:8,windowSeconds:900},
  "password-reset-verify":{limit:16,windowSeconds:900}
 };
 for(const [family,limits] of Object.entries(guarded)){
  const matcher=new RegExp("throttle\\(req\\.socket\\.remoteAddress,'"+family+"',\\d+\\);","g");
  server=server.replace(matcher,"await durableThrottle(pool,req.socket.remoteAddress,'"+family+"',"+JSON.stringify(limits)+");");
  if(!server.includes("await durableThrottle(pool,req.socket.remoteAddress,'"+family+"'"))throw Error('Throttled route missing: '+family);
 }
 fs.copyFileSync('scripts/rate-limit-v39.mjs',f('backend/rate-limit-v39.mjs'));
 fs.copyFileSync('scripts/rate-limit-v39.test.mjs',f('backend/rate-limit-v39.test.mjs'));

 // Legacy manager email verification, bound to the live authenticated school session.
 if(!server.includes('/api/profile/email/start')){
  const imp="import {startEmailLink,verifyEmailLink} from './link-email-v39.mjs';";
  const poolImport="import {Pool} from 'pg';";
  if(!server.includes(poolImport))throw Error('Legacy email-link import marker missing');
  server=server.replace(poolImport,poolImport+"\n"+imp);
  const anchor="if(req.method==='POST'&&url.pathname==='/api/school/activate')return send(res,200,await signupActivate(pool,user,await readJson(req,10000)));";
  if(!server.includes(anchor))throw Error('Email-link authenticated route marker missing');
  const routes=[
   " if(req.method==='POST'&&url.pathname==='/api/profile/email/start'){",
   "  await durableThrottle(pool,req.socket.remoteAddress,'email-link',{limit:8,windowSeconds:900});",
   "  return send(res,202,await startEmailLink(pool,user,await readJson(req,10000)));",
   " }",
   " if(req.method==='POST'&&url.pathname==='/api/profile/email/verify'){",
   "  await durableThrottle(pool,req.socket.remoteAddress,'email-link',{limit:15,windowSeconds:900});",
   "  return send(res,200,await verifyEmailLink(pool,user,await readJson(req,5000)));",
   " }"
  ].join('\n');
  server=server.replace(anchor,anchor+'\n'+routes);
 }
 fs.copyFileSync('scripts/link-email-v39.mjs',f('backend/link-email-v39.mjs'));
 fs.copyFileSync('scripts/link-email-v39.test.mjs',f('backend/link-email-v39.test.mjs'));

 fs.writeFileSync(f('backend/server.mjs'),server);
 fs.copyFileSync('scripts/reset-v39.mjs',f('backend/reset-v39.mjs'));
 const schema=f('backend/schema.sql'),old=fs.readFileSync(schema,'utf8');
 if(!old.includes('CREATE TABLE IF NOT EXISTS member_email_challenges')){
  fs.appendFileSync(schema,
   "\nCREATE TABLE IF NOT EXISTS member_email_challenges (id TEXT PRIMARY KEY,member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,email TEXT NOT NULL,otp_hmac TEXT NOT NULL,attempts INTEGER NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 10),expires_at TIMESTAMPTZ NOT NULL,consumed_at TIMESTAMPTZ,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());\nCREATE INDEX IF NOT EXISTS member_email_challenges_recent_idx ON member_email_challenges(member_id,created_at DESC);\n");
 }

 if(!old.includes('CREATE TABLE IF NOT EXISTS api_rate_buckets')){
   fs.appendFileSync(schema,"\nCREATE TABLE IF NOT EXISTS api_rate_buckets (bucket TEXT PRIMARY KEY,hits INTEGER NOT NULL CHECK(hits>=1),expires_at TIMESTAMPTZ NOT NULL);\nCREATE INDEX IF NOT EXISTS api_rate_buckets_expiry_idx ON api_rate_buckets(expires_at);\n");
 }
 if(!old.includes('password_reset_challenges')){
  fs.appendFileSync(schema,
   "\nCREATE TABLE IF NOT EXISTS password_reset_challenges (id TEXT PRIMARY KEY,member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,email TEXT NOT NULL,otp_hmac TEXT NOT NULL,attempts INTEGER NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 10),expires_at TIMESTAMPTZ NOT NULL,consumed_at TIMESTAMPTZ,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());\nCREATE INDEX IF NOT EXISTS password_reset_challenges_recent_idx ON password_reset_challenges(member_id,created_at DESC);\nCREATE INDEX IF NOT EXISTS password_reset_challenges_expiry_idx ON password_reset_challenges(expires_at);\n"
  );
 }
 execFileSync('node',['--check',f('backend/server.mjs')],{stdio:'inherit'});
 const tests=fs.readdirSync(f('backend')).filter(x=>x.endsWith('.test.mjs')).map(x=>f('backend/'+x));
 execFileSync('node',['--test',...tests],{stdio:'inherit'});
 const out=path.join(tmp,'after.tar');execFileSync('tar',['-cf',out,'-C',dest,'.']);
 fs.writeFileSync('backend-package.b64',brotliCompressSync(fs.readFileSync(out),{params:{[constants.BROTLI_PARAM_QUALITY]:10}}).toString('base64'));
 console.log('Password recovery routes and schema bundled, all existing backend tests passed.');
}finally{fs.rmSync(tmp,{recursive:true,force:true})}
