import {randomUUID,randomInt} from 'node:crypto';
import {email,digest,codeIsValid,sendMail,config} from './auth-v39.mjs';
import {hashPassword,fail} from './security.mjs';
const reply={ok:true,note:'إذا كان البريد مرتبطًا بحساب مؤكد، فستصلك تعليمات الاستعادة.'};
export async function beginReset(pool,body,send=sendMail){
 config();const addr=email(body.email);
 await pool.query("DELETE FROM password_reset_challenges WHERE id IN (SELECT id FROM password_reset_challenges WHERE expires_at<NOW()-interval '7 days' LIMIT 200)");
 const member=(await pool.query('SELECT id,email FROM members WHERE lower(email)=$1 AND email_verified_at IS NOT NULL LIMIT 1',[addr])).rows[0];
 if(!member)return {...reply,challengeId:randomUUID()};
 const recent=await pool.query("SELECT count(*)::int AS n FROM password_reset_challenges WHERE member_id=$1 AND created_at>NOW()-interval '15 minutes'",[member.id]);
 if(recent.rows[0].n>=3)return {...reply,challengeId:randomUUID()};
 const id=randomUUID(),otp=String(randomInt(100000,1000000));
 await pool.query("INSERT INTO password_reset_challenges(id,member_id,email,otp_hmac,expires_at) VALUES($1,$2,$3,$4,NOW()+interval '10 minutes')",[id,member.id,addr,digest(id,addr,otp,process.env.SCHOOL_OTP_HMAC_SECRET)]);
 try{await send(addr,otp)}
 catch{await pool.query('DELETE FROM password_reset_challenges WHERE id=$1',[id]).catch(()=>{});return {...reply,challengeId:randomUUID()}}
 return {...reply,challengeId:id};
}
export async function finishReset(pool,body){
 config();if(!/^[0-9a-f-]{36}$/.test(body.challengeId||''))throw fail('طلب الاستعادة غير صالح.');
 const passwordHash=await hashPassword(body.password);
 const c=await pool.connect();let committed=false;
 try{
  await c.query('BEGIN');
  const row=(await c.query('SELECT * FROM password_reset_challenges WHERE id=$1 FOR UPDATE',[body.challengeId])).rows[0];
  if(!row||row.consumed_at||row.attempts>=5||new Date(row.expires_at)<=new Date())throw fail('انتهت صلاحية رمز الاستعادة.',410);
  if(!codeIsValid({id:row.id,email:row.email,otp_hmac:row.otp_hmac},body.code,process.env.SCHOOL_OTP_HMAC_SECRET)){
   await c.query('UPDATE password_reset_challenges SET attempts=attempts+1 WHERE id=$1',[row.id]);
   await c.query('COMMIT');committed=true;throw fail('رمز الاستعادة غير صحيح.');
  }
  await c.query('UPDATE members SET password_hash=$1 WHERE id=$2 AND email_verified_at IS NOT NULL',[passwordHash,row.member_id]);
  await c.query('DELETE FROM sessions WHERE member_id=$1',[row.member_id]);
  await c.query('UPDATE password_reset_challenges SET consumed_at=NOW() WHERE id=$1',[row.id]);
  await c.query("INSERT INTO activity_log(member_id,school_id,action,target) SELECT id,school_id,'password_recovered',id FROM members WHERE id=$1",[row.member_id]);
  await c.query('COMMIT');committed=true;return {ok:true,needsLogin:true};
 }catch(e){if(!committed)await c.query('ROLLBACK').catch(()=>{});throw e}finally{c.release()}
}
