import {randomInt,randomUUID,randomBytes,createHmac,timingSafeEqual} from 'node:crypto';
import {hashPassword,shortText,fail,SECTIONS} from './security.mjs';
const ministryCode=value=>{const v=String(value??'').trim();if(!/^[0-9]{5,12}$/.test(v))throw fail('الرقم الوزاري يجب أن يتكون من 5 إلى 12 رقمًا.');return v;};
import {cleanSchoolSettings} from './school-settings.mjs';
import {claimLicense,newLicenseUntil} from './licensing.mjs';
export const norm=x=>typeof x==='string'?x.trim().toLowerCase():'';
export function email(x){const s=norm(x);if(s.length>254||!/^[^\s@]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(s)||s.includes('..'))throw fail('البريد الإلكتروني غير صالح.');return s;}
export function phone(x){let s=typeof x==='string'?x.replace(/[\s()-]/g,''):'';if(/^05\d{8}$/.test(s))s='+966'+s.slice(1);if(/^9665\d{8}$/.test(s))s='+'+s;if(!/^\+[1-9]\d{7,14}$/.test(s))throw fail('رقم الجوال غير صالح.');return s;}
export function username(x){const s=norm(x);if(!/^[a-z0-9._-]{3,64}$/.test(s))throw fail('اسم المستخدم غير صالح.');return s;}
export function digest(id,addr,otp,secret){if(typeof secret!=='string'||secret.length<32)throw fail('التحقق بالبريد غير مهيأ.',503);return createHmac('sha256',secret).update(id+'\0'+addr+'\0'+otp).digest('hex');}
export function codeIsValid(row,code,secret){if(!/^\d{6}$/.test(code||''))return false;const a=Buffer.from(digest(row.id,row.email,code,secret),'hex'),b=Buffer.from(row.otp_hmac||'','hex');return a.length===b.length&&timingSafeEqual(a,b);}
export function config(){if((process.env.SCHOOL_OTP_HMAC_SECRET||'').length<32||!process.env.SCHOOL_RESEND_API_KEY||!process.env.SCHOOL_OTP_FROM)throw fail('خدمة البريد الخاصة بالشواهد لم تُجهّز بعد.',503);}
export async function sendMail(address,otp,fetcher=fetch){
 const sender=process.env.SCHOOL_OTP_FROM;
 if(!sender||!/^.+@[^@]+\.[^@]+$/.test(sender)||/@(?:dhahabk\.com|mail\.dhahabk\.com)$/i.test(sender))throw fail('عنوان البريد الخاص بالشواهد غير صالح.',503);
 let r;try{r=await fetcher('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+process.env.SCHOOL_RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':randomUUID()},body:JSON.stringify({from:sender,to:[address],subject:'رمز التحقق — منصة شواهد التقويم',text:'رمز التحقق: '+otp+'\nصالح لمدة 10 دقائق. لا تشارك الرمز.'}),signal:AbortSignal.timeout(12000)})}catch{throw fail('تعذّر إرسال البريد الآن. حاول لاحقًا.',503)}
 if(!r.ok)throw fail('تعذّر إرسال البريد الآن. حاول لاحقًا.',503);
}
export function fields(b){
 const schoolName=shortText(b.schoolName,130),name=shortText(b.name,130),schoolType=b.schoolType;
 if(!schoolName||!name||!['boys','girls','early'].includes(schoolType))throw fail('أدخل بيانات المدرسة والمدير ونوع المدرسة.');
 if(typeof b.password!=='string'||b.password!==b.confirmPassword)throw fail('كلمتا المرور غير متطابقتين.');
 return {schoolName,name,schoolType,ministry:ministryCode(b.ministryCode),email:email(b.email),phone:phone(b.phone),username:username(b.username),password:b.password};
}
export async function start(pool,body,send=sendMail){
 config();const b=fields(body);
 await pool.query("DELETE FROM school_signup_challenges WHERE id IN (SELECT id FROM school_signup_challenges WHERE expires_at<NOW()-interval '7 days' LIMIT 200)");
 const c=await pool.query("SELECT EXISTS(SELECT 1 FROM schools WHERE school->>'code'=$1) AS school, EXISTS(SELECT 1 FROM members WHERE lower(username)=$2 OR lower(email)=$3) AS member",[b.ministry,b.username,b.email]);
 if(c.rows[0].school||c.rows[0].member)throw fail('بيانات المدرسة أو الحساب مستخدمة بالفعل.',409);
 const attempts=await pool.query("SELECT count(*)::int AS n FROM school_signup_challenges WHERE created_at>NOW()-interval '15 minutes' AND (lower(email)=$1 OR phone_e164=$2)",[b.email,b.phone]);
 if(attempts.rows[0].n>=3)throw fail('تجاوزت محاولات التسجيل. انتظر قليلًا.',429);
 const passwordHash=await hashPassword(b.password),id=randomUUID(),otp=String(randomInt(100000,1000000));
 await pool.query("INSERT INTO school_signup_challenges (id,school_name,school_type,ministry_code,manager_name,email,phone_e164,username,password_hash,otp_hmac,expires_at,resend_after) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW()+interval '10 minutes',NOW()+interval '60 seconds')",[id,b.schoolName,b.schoolType,b.ministry,b.name,b.email,b.phone,b.username,passwordHash,digest(id,b.email,otp,process.env.SCHOOL_OTP_HMAC_SECRET)]);
 try{await send(b.email,otp)}catch(e){await pool.query('DELETE FROM school_signup_challenges WHERE id=$1',[id]).catch(()=>{});throw e}
 return {challengeId:id,expiresInSeconds:600,resendAfterSeconds:60};
}
export async function resend(pool,body,send=sendMail){
 config();if(!/^[0-9a-f-]{36}$/.test(body.challengeId||''))throw fail('طلب التحقق غير صالح.');
 const c=await pool.connect();
 try{await c.query('BEGIN');const row=(await c.query('SELECT * FROM school_signup_challenges WHERE id=$1 FOR UPDATE',[body.challengeId])).rows[0];
  if(!row||row.consumed_at||row.attempts>=5||new Date(row.expires_at)<=new Date())throw fail('انتهت صلاحية الرمز. ابدأ التسجيل مجددًا.',410);
  if(new Date(row.resend_after)>new Date())throw fail('انتظر 60 ثانية قبل إعادة الإرسال.',429);
  const otp=String(randomInt(100000,1000000));await send(row.email,otp);
  await c.query("UPDATE school_signup_challenges SET otp_hmac=$1,expires_at=NOW()+interval '10 minutes',resend_after=NOW()+interval '60 seconds',attempts=0 WHERE id=$2",[digest(row.id,row.email,otp,process.env.SCHOOL_OTP_HMAC_SECRET),row.id]);
  await c.query('COMMIT');return {ok:true,expiresInSeconds:600,resendAfterSeconds:60};
 }catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}
}
export async function verify(pool,body){
 config();if(!/^[0-9a-f-]{36}$/.test(body.challengeId||''))throw fail('طلب التحقق غير صالح.');
 const c=await pool.connect();let committed=false;
 try{
  await c.query('BEGIN');
  const row=(await c.query('SELECT * FROM school_signup_challenges WHERE id=$1 FOR UPDATE',[body.challengeId])).rows[0];
  if(!row||row.consumed_at||row.attempts>=5||new Date(row.expires_at)<=new Date())throw fail('الرمز منتهي أو مستخدم.',410);
  if(!codeIsValid(row,body.code,process.env.SCHOOL_OTP_HMAC_SECRET)){
   await c.query('UPDATE school_signup_challenges SET attempts=attempts+1 WHERE id=$1',[row.id]);
   await c.query('COMMIT');committed=true;throw fail('رمز التحقق غير صحيح.',400);
  }
  const id=randomUUID(),memberId=randomUUID(),schoolCode='SCH-'+randomBytes(7).toString('hex').toUpperCase();
  const school=cleanSchoolSettings({name:row.school_name,code:row.ministry_code,schoolType:row.school_type,theme:'auto'});
  await c.query("INSERT INTO schools(id,login_code,school,license_until,activation_status) VALUES($1,$2,$3,'epoch','pending_activation')",[id,schoolCode,JSON.stringify(school)]);
  const role=row.school_type==='girls'?'مديرة المدرسة':row.school_type==='early'?'إدارة المدرسة':'مدير المدرسة';
  await c.query('INSERT INTO members(id,school_id,username,name,role,is_admin,allowed_sections,password_hash,email,phone_e164,email_verified_at) VALUES($1,$2,$3,$4,$5,true,$6,$7,$8,$9,NOW())',[memberId,id,row.username,row.manager_name,role,SECTIONS,row.password_hash,row.email,row.phone_e164]);
  await c.query('UPDATE school_signup_challenges SET consumed_at=NOW(),verified_at=NOW() WHERE id=$1',[row.id]);
  await c.query("INSERT INTO activity_log(school_id,member_id,action,target) VALUES($1,$2,'registration_verified',$3)",[id,memberId,id]);
  await c.query('COMMIT');committed=true;return {verified:true,needsLogin:true,activationRequired:true};
 }catch(e){if(!committed)await c.query('ROLLBACK').catch(()=>{});if(e.code==='23505')throw fail('المدرسة أو الحساب موجود بالفعل.',409);throw e}finally{c.release()}
}
export async function activate(pool,user,body){
 if(user?.kind!=='school'||!user.isAdmin)throw fail('مدير المدرسة فقط يستطيع التفعيل.',403);
 if(!user.activationRequired)throw fail('المدرسة مفعلة بالفعل.',409);
 const c=await pool.connect();
 try{await c.query('BEGIN');
  const row=(await c.query('SELECT s.activation_status,m.email_verified_at FROM schools s JOIN members m ON m.school_id=s.id AND m.id=$2 WHERE s.id=$1 FOR UPDATE OF s',[user.schoolId,user.id])).rows[0];
  if(!row||row.activation_status!=='pending_activation')throw fail('حالة المدرسة تغيرت.',409);
  if(!row.email_verified_at)throw fail('يلزم تأكيد البريد الإلكتروني أولًا.',403);
  const serial=await claimLicense(c,{serial:body.serial,kind:'activation'});
  const until=newLicenseUntil(null);
  await c.query("UPDATE schools SET activation_status='active',license_until=$1,updated_at=NOW() WHERE id=$2",[until,user.schoolId]);
  await c.query('UPDATE serial_keys SET redeemed_at=NOW(),redeemed_school_id=$1 WHERE id=$2 AND redeemed_at IS NULL',[user.schoolId,serial.id]);
  await c.query("INSERT INTO license_events(school_id,serial_id,event_type,new_until) VALUES($1,$2,'activation',$3)",[user.schoolId,serial.id,until]);
  await c.query("INSERT INTO activity_log(school_id,member_id,action,target) VALUES($1,$2,'school_activate_post_login',$3)",[user.schoolId,user.id,serial.id]);
  await c.query('COMMIT');return {ok:true,licenseUntil:until.toISOString()};
 }catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}
}
