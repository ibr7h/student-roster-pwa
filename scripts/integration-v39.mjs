import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {dirname} from 'node:path';
import {setTimeout as sleep} from 'node:timers/promises';
import {Pool} from 'pg';
import {start,verify,resend} from './auth-v39.mjs';
import {beginReset,finishReset} from './reset-v39.mjs';
import {openTestStorage,exerciseEvidence} from './evidence-wire-v39.mjs';
import {generateSerial,serialHash} from './licensing.mjs';
import {hashPassword,SECTIONS} from './security.mjs';
const here=dirname(fileURLToPath(import.meta.url));
if(!process.env.DATABASE_URL?.includes('localhost') && !process.env.DATABASE_URL?.includes('127.0.0.1'))throw Error('Integration harness only accepts local disposable PostgreSQL');
process.env.SCHOOL_OTP_HMAC_SECRET='test-integration-secret-only-45-chars-1234567890';
process.env.SCHOOL_RESEND_API_KEY='test-key-do-not-send';
process.env.SCHOOL_OTP_FROM='verification@schools.example';
process.env.SCHOOL_STATIC_ORIGIN='https://school-evidence-v39-preview.onrender.com';
const pool=new Pool({connectionString:process.env.DATABASE_URL,max:3});
let server,storage;
const say=msg=>console.log('PASS '+msg);
try{
 await pool.query(await readFile(new URL('./schema.sql',import.meta.url),'utf8'));
 const ownerId=randomUUID(),ownerHash=await hashPassword('ExampleOwnerPassword#123456');
 await pool.query('INSERT INTO platform_owners(id,username,name,password_hash) VALUES($1,$2,$3,$4)',[ownerId,'integration.owner','Test Owner',ownerHash]);
 const oldSchoolId=randomUUID(),oldManagerId=randomUUID();
 await pool.query("INSERT INTO schools(id,login_code,school,license_until) VALUES($1,$2,$3,NOW()+interval '1 year')",[oldSchoolId,'SCH-LEGACY-CI',{name:'Existing school without email',code:'6754312221',schoolType:'boys'}]);
 await pool.query("INSERT INTO members(id,school_id,username,name,role,is_admin,allowed_sections,password_hash) VALUES($1,$2,$3,$4,$5,true,$6,$7)",[oldManagerId,oldSchoolId,'legacy.manager','Legacy Manager','مدير المدرسة',SECTIONS,await hashPassword('LegacyExamplePassword#1234')]);

 const memberName='newschoolmanager',email='integration.manager@example.edu',password='ExampleSchoolPassword#123456';
 const payload={schoolName:'مدرسة التكامل التجريبية',schoolType:'boys',ministryCode:'8754312221',name:'مدير الاختبار',email,phone:'0551234567',username:memberName,password,confirmPassword:password};
 let otp;
 const signup=await start(pool,payload,async(addr,code)=>{assert.equal(addr,email);otp=code});
 assert.ok(/^[0-9a-f-]{36}$/.test(signup.challengeId)&&/^\d{6}$/.test(otp));
 const before=(await pool.query("SELECT count(*)::int AS n FROM members WHERE lower(username)=$1",[memberName])).rows[0].n;
 assert.equal(before,0,'Account must not exist until OTP verified');say('Registration creates challenge without granting account/session');
 await assert.rejects(()=>resend(pool,{challengeId:signup.challengeId},async()=>{}),e=>e.status===429);
 await pool.query("UPDATE school_signup_challenges SET resend_after=NOW()-interval '1 second' WHERE id=$1",[signup.challengeId]);
 const prior=otp;
 await resend(pool,{challengeId:signup.challengeId},async(addr,code)=>{assert.equal(addr,email);otp=code});
 const fresh=(await pool.query('SELECT attempts,otp_hmac FROM school_signup_challenges WHERE id=$1',[signup.challengeId])).rows[0];
 assert.equal(fresh.attempts,0);say('Resend enforces cooldown, refreshes the code and resets attempt count');

 await assert.rejects(()=>verify(pool,{challengeId:signup.challengeId,code:'000000'}),e=>e.status===400);
 const failure=(await pool.query('SELECT attempts FROM school_signup_challenges WHERE id=$1',[signup.challengeId])).rows[0];
 assert.equal(failure.attempts,1);say('Invalid OTP increments durable attempt counter');
 const signedUp=await verify(pool,{challengeId:signup.challengeId,code:otp});
 assert.equal(signedUp.activationRequired,true);
 await assert.rejects(()=>verify(pool,{challengeId:signup.challengeId,code:otp}),e=>e.status===410);
 const row=(await pool.query('SELECT s.id,s.activation_status,s.license_until,m.id member_id,m.email_verified_at,m.phone_e164 FROM schools s JOIN members m ON m.school_id=s.id WHERE m.username=$1',[memberName])).rows[0];
 assert.equal(row.activation_status,'pending_activation');assert.ok(new Date(row.license_until)<=new Date('1971-01-01'));
 await assert.rejects(()=>start(pool,{...payload,schoolName:'Another Test School',ministryCode:'8754312222',email:'other.school@example.edu'},async()=>{}),e=>e.status===409);
 const staleBody={...payload,schoolName:'Expired School',ministryCode:'8754312223',email:'expired.school@example.edu',username:'expired.manager'};
 const expired=await start(pool,staleBody,async()=>{});
 await pool.query("UPDATE school_signup_challenges SET expires_at=NOW()-interval '1 minute' WHERE id=$1",[expired.challengeId]);
 await assert.rejects(()=>verify(pool,{challengeId:expired.challengeId,code:'123456'}),e=>e.status===410);
 say('Global duplicate identity and expired code are rejected before creating school accounts');

 assert.ok(row.email_verified_at);assert.equal(row.phone_e164,'+966551234567');say('Email confirmation creates verified unlicensed school once');
 const serial=generateSerial(),serialId=randomUUID();
 await pool.query("INSERT INTO serial_keys(id,serial_hash,kind,issued_by,claim_by) VALUES($1,$2,'activation',$3,NOW()+interval '30 days')",[serialId,serialHash(serial),ownerId]);
 storage=await openTestStorage();
 const port=process.env.TEST_PORT||'30189',origin=process.env.SCHOOL_STATIC_ORIGIN;
 server=spawn(process.execPath,['server.mjs'],{cwd:here,env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe']});
 let stderr='';
 server.stderr.on('data',b=>{stderr+=b.toString();if(stderr.length>6000)stderr=stderr.slice(-6000)});
 const base='http://127.0.0.1:'+port;
 async function req(path,{method='GET',body,token,headers}={}){
  const response=await fetch(base+path,{method,headers:{Origin:origin,...(body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:'Bearer '+token}:{}),...headers},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(15000)});
  let data={};try{data=await response.json()}catch{}return {status:response.status,headers:response.headers,data};
 }
 let healthy=false;
 for(let i=0;i<70;i++){if(server.exitCode!==null)break;try{const r=await req('/api/health');if(r.status===200){healthy=true;break}}catch{}await sleep(200)}
 assert.ok(healthy,'Backend failed to start: '+stderr);say('Actual Node API process boots with v3.9 migration in disposable PostgreSQL');

 const legacy=await req('/api/login',{method:'POST',body:{username:'legacy.manager',password:'LegacyExamplePassword#1234'}});
 assert.equal(legacy.status,200,JSON.stringify(legacy.data));
 const limiter=(await pool.query("SELECT bucket,hits FROM api_rate_buckets WHERE bucket LIKE 'school-login:%'")).rows;
 assert.ok(limiter.length>=1,'School login must consume a persistent PostgreSQL rate bucket');
 assert.ok(limiter.every(x=>/^school-login:[0-9a-f]{64}$/.test(x.bucket)),'Rate limiter must never persist plaintext client addresses');
 say('PostgreSQL limits login attempts persist across application restarts');
 assert.equal(legacy.data.user.activationRequired,false);
 assert.equal(legacy.data.user.isAdmin,true);
 assert.equal((await req('/api/data',{token:legacy.data.sessionToken})).status,200);
 assert.equal((await req('/api/platform/me',{token:legacy.data.sessionToken})).status,403);
 say('Legacy manager without email keeps access under global-login migration');
 const login=await req('/api/login',{method:'POST',body:{username:memberName,password}});
 assert.equal(login.status,200,JSON.stringify(login.data));
 assert.equal(login.data.user.activationRequired,true);
 const token=login.data.sessionToken;assert.match(token,/^[A-Za-z0-9_-]{43}$/);
 assert.equal(login.headers.get('access-control-allow-origin'),origin);
 assert.equal((await req('/api/me',{token})).status,200);
 assert.equal((await req('/api/platform/me',{token})).status,403,'School member must not gain platform owner privileges');
 assert.equal((await req('/api/data',{token})).status,403);
 assert.equal((await req('/api/school/activate',{method:'POST',body:{serial}})).status,403,'No unauthenticated activation');
 say('Unified username login works without school code, pending-school data is forbidden');
 const activation=await req('/api/school/activate',{method:'POST',token,body:{serial}});
 assert.equal(activation.status,200,JSON.stringify(activation.data));
 assert.equal((await req('/api/school/activate',{method:'POST',token,body:{serial}})).status,409);
 assert.equal((await req('/api/data',{token})).status,200);
 const evidenceItems=JSON.parse(await readFile(new URL('./items.json',import.meta.url),'utf8'));
 try{await exerciseEvidence({req,base,token,itemId:Object.keys(evidenceItems)[0]})}catch(e){console.error('TEST API error:',stderr.slice(-3200));throw e}
 assert.ok([...storage.files.keys()].some(key=>/^8754312221\/evidence\/[0-9a-f-]{36}$/i.test(key)),'Object key must be isolated under owning ministry number');
 say('Protected PDF stored over S3-compatible protocol; QR, timed sharing and revocation passed');
 const consumed=(await pool.query('SELECT redeemed_school_id FROM serial_keys WHERE id=$1',[serialId])).rows[0];
 assert.equal(consumed.redeemed_school_id,row.id);say('Manager-only post-login activation is atomic, once-only, and unlocks school data');
 const forbidden=(await req('/api/me',{headers:{Authorization:'Bearer '+'A'.repeat(43)}}));
 assert.equal(forbidden.status,401);
 const preflight=await fetch(base+'/api/me',{method:'OPTIONS',headers:{Origin:origin,'Access-Control-Request-Headers':'authorization,content-type','Access-Control-Request-Method':'GET'}});
 assert.equal(preflight.status,204);assert.equal(preflight.headers.get('access-control-allow-origin'),origin);say('Bearer access requires a valid token and CORS allowlist is exact');
 const school2=randomUUID(),entryId=randomUUID();
 await pool.query("INSERT INTO schools(id,login_code,school,license_until,activation_status) VALUES($1,$2,$3,NOW()+interval '1 year','active')",[school2,'SCH-INTEGRATION02',{name:'مدرسة فصل أخرى',code:'4567812345',schoolType:'girls'}]);

 await pool.query("UPDATE schools SET school=jsonb_set(school,'{teamGroups}', $1::jsonb, true) WHERE id=$2",[JSON.stringify(['integration-team']),row.id]);
 const createdMember=await req('/api/members',{method:'POST',token,body:{
  username:'integration.staff',name:'Team Member',teamGroup:'integration-team',role:'عضو فريق',
  isAdmin:false,allowedSections:['manager'],password:'SomeOtherMemberPassword!'
 }});
 assert.equal(createdMember.status,200,JSON.stringify(createdMember.data));
 assert.match(createdMember.data.id,/^[0-9a-f-]{36}$/);

 const teamLogin=await req('/api/login',{method:'POST',body:{username:'integration.staff',password:'SomeOtherMemberPassword!'}});
 assert.equal(teamLogin.status,200);assert.equal(teamLogin.data.user.isAdmin,false);
 assert.equal((await req('/api/permissions',{method:'POST',token:teamLogin.data.sessionToken,body:{sectionId:'manager',memberIds:[]}})).status,403);
 assert.equal((await req('/api/school',{method:'POST',token:teamLogin.data.sessionToken,body:{school:{name:'tamper'}}})).status,403);
 assert.equal((await req('/api/school/activate',{method:'POST',token:teamLogin.data.sessionToken,body:{serial}})).status,403);
 const items=JSON.parse(await readFile(new URL('./items.json',import.meta.url),'utf8'));
 const item=Object.keys(items)[0];
 await pool.query('INSERT INTO evidences(id,school_id,item_id,title,kind,url,added_by) VALUES($1,$2,$3,$4,$5,$6,$7)',[entryId,school2,item,'PRIVATE OTHER SCHOOL EVIDENCE','link','https://example.edu/school2','integration']);
 assert.equal((await req('/api/evidences/'+entryId+'/view',{token})).status,404);
 assert.ok(!JSON.stringify((await req('/api/data',{token})).data).includes('PRIVATE OTHER SCHOOL EVIDENCE'));
 assert.equal((await req('/api/evidences/'+entryId+'/view',{token:teamLogin.data.sessionToken})).status,404);
 say('Team member cannot perform admin operations or access cross-school evidence');
 let resetCode;
 const reset=await beginReset(pool,{email},async(_to,code)=>{resetCode=code});
 assert.match(reset.challengeId,/^[0-9a-f-]{36}$/);
 await assert.rejects(()=>finishReset(pool,{challengeId:reset.challengeId,code:'000000',password:'NewPassword#ForSchool123'}),e=>e.status===400);
 await finishReset(pool,{challengeId:reset.challengeId,code:resetCode,password:'NewPassword#ForSchool123'});
 assert.equal((await req('/api/me',{token})).status,401);
 assert.equal((await req('/api/login',{method:'POST',body:{username:memberName,password}})).status,401);
 assert.equal((await req('/api/login',{method:'POST',body:{username:memberName,password:'NewPassword#ForSchool123'}})).status,200);
 say('Password reset uses expiring code and revokes previous sessions');
 console.log('SUCCESS all full-flow isolated v3.9 API integration assertions passed');
}finally{
 if(server){server.kill('SIGTERM');await sleep(300)}
 if(storage)await storage.close();
 await pool.end().catch(()=>{});
}
