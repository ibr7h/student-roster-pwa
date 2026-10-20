import {randomUUID,randomInt} from 'node:crypto';
import {email,digest,codeIsValid,sendMail,config} from './auth-v39.mjs';
import {verifyPassword,fail} from './security.mjs';
function checkUser(user){
 if(user?.kind!=='school'||!user.isAdmin||!user.schoolId||!user.id)throw fail('يتطلب ربط البريد حساب مدير المدرسة.',403);
}
export async function startEmailLink(pool,user,body,send=sendMail){
 checkUser(user);config();
 const addr=email(body?.email);
 if(typeof body?.password!=='string'||!body.password)throw fail('أدخل كلمة المرور الحالية.',400);
 const account=(await pool.query('SELECT password_hash,email_verified_at FROM members WHERE id=$1 AND school_id=$2',[user.id,user.schoolId])).rows[0];
 if(!account||!await verifyPassword(body.password,account.password_hash))throw fail('تعذر التحقق من بيانات الحساب.',401);
 if(account.email_verified_at)throw fail('هذا الحساب مرتبط ببريد مؤكد بالفعل.',409);
 const taken=(await pool.query('SELECT id FROM members WHERE lower(email)=$1 AND id<>$2 LIMIT 1',[addr,user.id])).rows[0];
 if(taken)throw fail('تعذر استخدام هذا البريد.',409);
 const recent=(await pool.query("SELECT count(*)::int AS n FROM member_email_challenges WHERE member_id=$1 AND created_at>NOW()-interval '15 minutes'",[user.id])).rows[0].n;
 if(recent>=3)throw fail('تجاوزت محاولات الربط؛ انتظر قليلًا.',429);
 const id=randomUUID(),code=String(randomInt(100000,1000000));
 await pool.query("INSERT INTO member_email_challenges(id,member_id,school_id,email,otp_hmac,expires_at) VALUES($1,$2,$3,$4,$5,NOW()+interval '10 minutes')",[id,user.id,user.schoolId,addr,digest(id,addr,code,process.env.SCHOOL_OTP_HMAC_SECRET)]);
 try{await send(addr,code)}catch(e){await pool.query('DELETE FROM member_email_challenges WHERE id=$1',[id]).catch(()=>{});throw e}
 return {challengeId:id,expiresInSeconds:600};
}
export async function verifyEmailLink(pool,user,body){
 checkUser(user);config();
 if(!/^[0-9a-f-]{36}$/.test(body?.challengeId||''))throw fail('طلب ربط البريد غير صالح.',400);
 const c=await pool.connect();let committed=false;
 try{
  await c.query('BEGIN');
  const row=(await c.query('SELECT * FROM member_email_challenges WHERE id=$1 AND member_id=$2 AND school_id=$3 FOR UPDATE',[body.challengeId,user.id,user.schoolId])).rows[0];
  if(!row||row.consumed_at||row.attempts>=5||new Date(row.expires_at)<=new Date())throw fail('رمز التحقق منتهي أو مستخدم.',410);
  if(!codeIsValid(row,body.code,process.env.SCHOOL_OTP_HMAC_SECRET)){
   await c.query('UPDATE member_email_challenges SET attempts=attempts+1 WHERE id=$1',[row.id]);
   await c.query('COMMIT');committed=true;throw fail('رمز التحقق غير صحيح.',400);
  }
  const linked=await c.query("UPDATE members SET email=$1,email_verified_at=NOW() WHERE id=$2 AND school_id=$3 AND email_verified_at IS NULL RETURNING id",[row.email,user.id,user.schoolId]);
  if(linked.rowCount!==1)throw fail('تم ربط بريد بهذا الحساب مسبقًا.',409);
  await c.query('UPDATE member_email_challenges SET consumed_at=NOW() WHERE id=$1',[row.id]);
  await c.query("INSERT INTO activity_log(member_id,school_id,action,target) VALUES($1,$2,'manager_email_linked',$1)",[user.id,user.schoolId]);
  await c.query('COMMIT');committed=true;return {verified:true};
 }catch(e){if(!committed)await c.query('ROLLBACK').catch(()=>{});if(e.code==='23505')throw fail('البريد مستخدم بالفعل.',409);throw e}finally{c.release()}
}
