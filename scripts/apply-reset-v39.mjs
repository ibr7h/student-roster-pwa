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

 // The archived v3.8 share handler references downloadEvidence but may lack its import.
 // Verify the handler symbol is resolvable before bundling; preserves private bucket checks.
 if(server.includes('downloadEvidence(')&&!/^import\s*\{[^}]*\bdownloadEvidence\b[^}]*\}\s*from\s*['"]\.\/storage\.mjs['"]/m.test(server)){
  server="import {downloadEvidence} from './storage.mjs';\n"+server;
 }
 fs.writeFileSync(f('backend/server.mjs'),server);
 fs.copyFileSync('scripts/reset-v39.mjs',f('backend/reset-v39.mjs'));
 const schema=f('backend/schema.sql'),old=fs.readFileSync(schema,'utf8');
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
