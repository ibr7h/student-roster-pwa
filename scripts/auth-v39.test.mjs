import {test} from 'node:test';
import assert from 'node:assert/strict';
import {email,phone,username,digest,codeIsValid,fields,mailSettingsReady,sendMail} from './auth-v39.mjs';
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

test('Resend sandbox fails closed unless a single verified-test recipient is configured',async()=>{
 const names=['SCHOOL_RESEND_API_KEY','SCHOOL_OTP_HMAC_SECRET','SCHOOL_OTP_FROM','SCHOOL_OTP_TEST_MODE','SCHOOL_OTP_TEST_RECIPIENT'];
 const saved=Object.fromEntries(names.map(n=>[n,process.env[n]]));
 try{
  process.env.SCHOOL_RESEND_API_KEY='ci-only-placeholder';
  process.env.SCHOOL_OTP_HMAC_SECRET='a'.repeat(48);
  process.env.SCHOOL_OTP_FROM='onboarding@resend.dev';
  process.env.SCHOOL_OTP_TEST_MODE='true';
  delete process.env.SCHOOL_OTP_TEST_RECIPIENT;
  assert.equal(mailSettingsReady(),false);
  process.env.SCHOOL_OTP_TEST_RECIPIENT='sandbox.owner@example.test';
  assert.equal(mailSettingsReady(),true);
  let sent=false;
  await assert.rejects(()=>sendMail('stranger@example.test','123456',async()=>{sent=true;return {ok:true}}),e=>e.status===503);
  assert.equal(sent,false);
  await sendMail('SANDBOX.OWNER@example.test','123456',async(url,request)=>{
   assert.match(url,/api.resend.com/);
   const body=JSON.parse(request.body);
   assert.equal(body.from,'onboarding@resend.dev');
   assert.deepEqual(body.to,['SANDBOX.OWNER@example.test']);
   sent=true;return {ok:true};
  });
  assert.equal(sent,true);
  process.env.SCHOOL_OTP_FROM='verification@mail.dhahabk.com';
  assert.equal(mailSettingsReady(),false);
 }finally{
  for(const name of names){if(saved[name]===undefined)delete process.env[name];else process.env[name]=saved[name]}
 }
});
