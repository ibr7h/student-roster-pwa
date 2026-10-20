import {test} from 'node:test';
import assert from 'node:assert/strict';
import {email,phone,username,digest,codeIsValid,fields} from './auth-v39.mjs';
import {randomUUID} from 'node:crypto';
test('global account identifiers normalized',()=>{assert.equal(email('  SOME.Name@School.edu.SA '),'some.name@school.edu.sa');assert.equal(username(' School.Admin '),'school.admin');assert.throws(()=>username('مدير'));assert.throws(()=>email('not-an-email'));});
test('mandatory phone E.164 and Saudi local normalization',()=>{assert.equal(phone('0551234567'),'+966551234567');assert.equal(phone('+966551234567'),'+966551234567');assert.throws(()=>phone('005'));});
test('registration requires valid name, school, ministry and confirmed strong password',()=>{
 const b={schoolName:'مدرسة تجريبية',schoolType:'boys',ministryCode:'123456',name:'مسؤول المدرسة',email:'test@example.edu',phone:'0551234567',username:'new.admin',password:'securePassw0rd!!',confirmPassword:'securePassw0rd!!'};
 assert.equal(fields(b).ministry,'123456');
 assert.throws(()=>fields({...b,phone:''}));
 assert.throws(()=>fields({...b,confirmPassword:'wrong'}));
});
test('one-way HMAC OTP checks exact 6 digits and challenge-specific salt',()=>{
 const secret='q'.repeat(48),id=randomUUID(),addr='a@example.com',code='123456';
 const row={id,email:addr,otp_hmac:digest(id,addr,code,secret)};
 assert.equal(codeIsValid(row,code,secret),true);
 for(const x of ['999999','12345','1234567',''])assert.equal(codeIsValid(row,x,secret),false);
 assert.equal(codeIsValid({...row,id:randomUUID()},code,secret),false);
 assert.equal(codeIsValid({...row,email:'another@example.com'},code,secret),false);
 assert.throws(()=>digest(id,addr,code,'short'),e=>e.status===503);
});
test('signed user school role and activation never supplied by signup payload',()=>{
 const b={schoolName:'School Test',schoolType:'girls',ministryCode:'555666',name:'Manager',email:'manager@example.edu',phone:'+966551234567',username:'manager.1',password:'LongValidPassword!1',confirmPassword:'LongValidPassword!1',is_admin:true,activation_status:'active'};
 const validated=fields(b);
 assert.equal('is_admin' in validated,false);
 assert.equal('activation_status' in validated,false);
});
