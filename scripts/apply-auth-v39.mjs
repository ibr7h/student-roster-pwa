import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {brotliCompressSync,brotliDecompressSync,constants} from 'node:zlib';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'school-auth-v39-'));
try{
 const pkg=path.join(dir,'pkg');fs.mkdirSync(pkg);
 const source='backend-package.b64',tar=path.join(dir,'current.tar');
 fs.writeFileSync(tar,brotliDecompressSync(Buffer.from(fs.readFileSync(source,'utf8').trim(),'base64')));
 execFileSync('tar',['-xf',tar,'-C',pkg]);
 const f=name=>path.join(pkg,name);
 let s=fs.readFileSync(f('backend/server.mjs'),'utf8');
 if(s.includes('register/start'))throw Error('Auth v3.9 patch already applied');
 function patch(before,after){
  if(!s.includes(before))throw Error('Missing v3.9 server marker: '+before.slice(0,100));
  s=s.replace(before,after);
 }
 patch("import {Pool} from 'pg';","import {Pool} from 'pg';\nimport {start as signupStart,resend as signupResend,verify as signupVerify,activate as signupActivate} from './auth-v39.mjs';");
 patch("const mapUser=m=>({id:m.id,schoolId:m.school_id,schoolCode:m.login_code,name:m.name,role:m.role,isAdmin:!!m.is_admin,allowedSections:m.is_admin?SECTIONS:allowedSections(m.allowed_sections),license:licenseState(m)});",
  "const mapUser=m=>({id:m.id,schoolId:m.school_id,name:m.name,role:m.role,isAdmin:!!m.is_admin,allowedSections:m.is_admin?SECTIONS:allowedSections(m.allowed_sections),activationRequired:m.activation_status==='pending_activation',license:licenseState(m)});");
 patch("sc.login_code,sc.license_until,sc.suspended_at,o.name AS owner_name",
  "sc.login_code,sc.license_until,sc.suspended_at,sc.activation_status,o.name AS owner_name");
 const loginStart=s.indexOf(" if(req.method==='POST'&&url.pathname==='/api/login'){");
 const loginEnd=s.indexOf(" // A bearer share token is separate from the school session.",loginStart);
 if(loginStart<0||loginEnd<loginStart)throw Error('Login endpoint markers absent');
 const code=[
 " if(req.method==='POST'&&url.pathname==='/api/register/start'){",
 "  throttle(req.socket.remoteAddress,'school-registration',5);",
 "  return send(res,202,await signupStart(pool,await readJson(req,22000)));",
 " }",
 " if(req.method==='POST'&&url.pathname==='/api/register/resend'){",
 "  throttle(req.socket.remoteAddress,'school-registration-resend',10);",
 "  return send(res,200,await signupResend(pool,await readJson(req,5000)));",
 " }",
 " if(req.method==='POST'&&url.pathname==='/api/register/verify'){",
 "  throttle(req.socket.remoteAddress,'school-registration-verify',12);",
 "  return send(res,201,await signupVerify(pool,await readJson(req,5000)));",
 " }",
 " if(req.method==='GET'&&url.pathname==='/api/register/status')return send(res,200,{emailReady:!!(process.env.SCHOOL_OTP_HMAC_SECRET?.length>=32&&process.env.SCHOOL_RESEND_API_KEY&&process.env.SCHOOL_OTP_FROM)});",
 " if(req.method==='POST'&&url.pathname==='/api/login'){",
 "  throttle(req.socket.remoteAddress,'school-login',15);const b=await readJson(req,10000);",
 "  const identity=shortText(b.username||b.email,254).toLowerCase();",
 "  if(!identity||typeof b.password!=='string')throw fail('اسم المستخدم أو كلمة المرور غير صحيحة.',401);",
 "  const oldSchoolCode=shortText(b.schoolCode,48).toUpperCase();",
 "  const candidate=await pool.query('SELECT m.*,s.login_code,s.license_until,s.suspended_at,s.activation_status FROM members m JOIN schools s ON s.id=m.school_id WHERE (lower(m.username)=$1 OR lower(m.email)=$1) AND ($2::text=\\'\\' OR s.login_code=$2) LIMIT 2',[identity,oldSchoolCode]);",
 "  const member=candidate.rows.length===1?candidate.rows[0]:null;",
 "  if(!member||!await verifyPassword(b.password,member.password_hash))throw fail('اسم المستخدم أو كلمة المرور غير صحيحة.',401);",
 "  await issueSession(req,res,member.id,member.school_id,null);",
 "  await audit({kind:'school',id:member.id,schoolId:member.school_id},'login',null);",
 "  return send(res,200,{user:mapUser(member)});",
 " }",
 "",
 ].join('\n');
 s=s.slice(0,loginStart)+code+s.slice(loginEnd);
 patch(" const user=await auth(req);\n",
  " const user=await auth(req);\n if(req.method==='POST'&&url.pathname==='/api/school/activate')return send(res,200,await signupActivate(pool,user,await readJson(req,10000)));\n if(user?.kind==='school'&&user.activationRequired&&!((url.pathname==='/api/me'&&req.method==='GET')||(url.pathname==='/api/logout'&&req.method==='POST')))throw fail('يلزم تفعيل المدرسة أولًا من حساب المدير.',403);\n");
 if(!/version:'3\.[0-9]+\.[0-9]+'/.test(s))throw Error('Backend version marker missing');
 s=s.replace(/version:'3\.[0-9]+\.[0-9]+'/,'version:\'3.9.0\'');
 fs.writeFileSync(f('backend/server.mjs'),s);
 fs.copyFileSync('scripts/auth-v39.mjs',f('backend/auth-v39.mjs'));
 fs.copyFileSync('scripts/auth-v39.test.mjs',f('backend/auth-v39.test.mjs'));
 const schema=f('backend/schema.sql'),migration=fs.readFileSync('migrations/20261020-v3.9-auth.sql','utf8');
 fs.appendFileSync(schema,'\n-- School v3.9 additive auth migration.\n'+migration);
 const pack=f('package.json');let data=JSON.parse(fs.readFileSync(pack));data.version='3.9.0';fs.writeFileSync(pack,JSON.stringify(data,null,2)+'\n');
 execFileSync('node',['--check',f('backend/server.mjs')],{stdio:'inherit'});
 execFileSync('node',['--check',f('backend/auth-v39.mjs')],{stdio:'inherit'});
 const pdfTests=fs.readdirSync(f('backend')).filter(x=>x.endsWith('.test.mjs')).map(x=>f('backend/'+x));
 execFileSync('node',['--test',...pdfTests],{stdio:'inherit'});
 // Validate build patch against the original site assets and avoid bundling CI's public tree.
 const saved=path.join(dir,'old-public');if(fs.existsSync(f('public')))fs.cpSync(f('public'),saved,{recursive:true});
 fs.rmSync(f('public'),{recursive:true,force:true});fs.mkdirSync(f('public'),{recursive:true});
 execFileSync('unzip',['-q','-o',path.resolve('site.zip'),'-d',f('public')]);
 execFileSync('node',['patch-release.mjs'],{cwd:pkg,stdio:'inherit'});
 // CI can verify all front-end assets; files are regenerated from site.zip by Render.
 fs.rmSync(f('public'),{recursive:true,force:true});if(fs.existsSync(saved))fs.cpSync(saved,f('public'),{recursive:true});
 const out=path.join(dir,'new.tar');execFileSync('tar',['-cf',out,'-C',pkg,'.']);
 fs.writeFileSync(source,brotliCompressSync(fs.readFileSync(out),{params:{[constants.BROTLI_PARAM_QUALITY]:10}}).toString('base64'));
 console.log('Prepared v3.9 auth API with regression-tested bundled backend.');
}finally{fs.rmSync(dir,{recursive:true,force:true})}
