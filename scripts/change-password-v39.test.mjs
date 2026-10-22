import {test} from 'node:test';
import assert from 'node:assert/strict';
import {changePassword} from './change-password-v39.mjs';
import {hashPassword,verifyPassword} from './security.mjs';

const user={kind:'school',id:'legacy-member',schoolId:'legacy-school'};
test('authenticated password change does not require a verified email but revokes all sessions',async()=>{
 let passwordHash=await hashPassword('ExistingSchoolPassword!2026'),revoked=false,logged=false;
 const queries=[];
 const pool={connect:async()=>({query:async(sql,args=[])=>{
  queries.push(sql);
  if(sql.startsWith('SELECT password_hash'))return {rows:[{password_hash:passwordHash}]};
  if(sql.startsWith('UPDATE members')){passwordHash=args[0];return {rowCount:1}};
  if(sql.startsWith('DELETE FROM sessions'))revoked=true;
  if(sql.startsWith('INSERT INTO activity_log'))logged=true;
  return {rows:[]};
 },release(){}})};
 await assert.rejects(()=>changePassword(pool,user,{currentPassword:'incorrect',newPassword:'NewSchoolPassword!2026',confirmPassword:'NewSchoolPassword!2026'}),e=>e.status===401);
 assert.equal(revoked,false);
 const result=await changePassword(pool,user,{currentPassword:'ExistingSchoolPassword!2026',newPassword:'NewSchoolPassword!2026',confirmPassword:'NewSchoolPassword!2026'});
 assert.deepEqual(result,{ok:true,needsLogin:true});
 assert.equal(await verifyPassword('NewSchoolPassword!2026',passwordHash),true);
 assert.equal(await verifyPassword('ExistingSchoolPassword!2026',passwordHash),false);
 assert.equal(revoked,true);assert.equal(logged,true);
 assert.ok(queries.some(x=>x.includes('FOR UPDATE')));
});
test('password change enforces school scope and strong matching credentials',async()=>{
 const dummy={connect(){throw Error('Unexpected DB access')}};
 await assert.rejects(()=>changePassword(dummy,{kind:'platform',id:'owner',schoolId:'s'},{currentPassword:'x',newPassword:'LongNewPassword!12',confirmPassword:'LongNewPassword!12'}),e=>e.status===403);
 for(const body of [{currentPassword:'x',newPassword:'short',confirmPassword:'short'},{currentPassword:'x',newPassword:'LongNewPassword!12',confirmPassword:'mismatch'},{currentPassword:'SamePassword!2026',newPassword:'SamePassword!2026',confirmPassword:'SamePassword!2026'}])
  await assert.rejects(()=>changePassword(dummy,user,body),e=>e.status===400);
});
