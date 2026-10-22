import {verifyPassword,hashPassword,fail} from './security.mjs';

export async function changePassword(pool,user,body){
 if(user?.kind!=='school'||!user.id||!user.schoolId)throw fail('سجّل الدخول إلى حساب المدرسة أولاً.',403);
 const current=body?.currentPassword,next=body?.newPassword,confirmation=body?.confirmPassword;
 if(typeof current!=='string'||!current||typeof next!=='string'||next.length<12||next.length>256||next!==confirmation)
  throw fail('أدخل كلمة المرور الحالية وكلمة جديدة قوية ومتطابقة (12 حرفًا على الأقل).',400);
 if(current===next)throw fail('يجب أن تختلف كلمة المرور الجديدة عن الحالية.',400);
 const client=await pool.connect();let complete=false;
 try{
  await client.query('BEGIN');
  const m=(await client.query('SELECT password_hash FROM members WHERE id=$1 AND school_id=$2 FOR UPDATE',[user.id,user.schoolId])).rows[0];
  if(!m||!await verifyPassword(current,m.password_hash))throw fail('كلمة المرور الحالية غير صحيحة.',401);
  const passwordHash=await hashPassword(next);
  await client.query('UPDATE members SET password_hash=$1 WHERE id=$2 AND school_id=$3',[passwordHash,user.id,user.schoolId]);
  await client.query('DELETE FROM sessions WHERE member_id=$1',[user.id]);
  await client.query("INSERT INTO activity_log(member_id,school_id,action,target) VALUES($1,$2,'password_changed',$1)",[user.id,user.schoolId]);
  await client.query('COMMIT');complete=true;
  return {ok:true,needsLogin:true};
 }catch(error){if(!complete)await client.query('ROLLBACK').catch(()=>{});throw error}
 finally{client.release()}
}
