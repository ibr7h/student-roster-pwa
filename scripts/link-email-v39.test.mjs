import test from 'node:test';
import assert from 'node:assert/strict';
import {startEmailLink,verifyEmailLink} from './link-email-v39.mjs';
const secret='another-test-secret-0123456789abcdef1234567890';
test('school members and unauthenticated users cannot link a manager email',async()=>{
 const disabledPool={query(){throw Error('No database should be accessed')}};
 for(const user of [null,{kind:'school',id:'x',schoolId:'s',isAdmin:false},{kind:'platform',id:'o',schoolId:'s',isAdmin:true}]){
  await assert.rejects(()=>startEmailLink(disabledPool,user,{email:'a@example.edu',password:'password'}),e=>e.status===403);
  await assert.rejects(()=>verifyEmailLink(disabledPool,user,{challengeId:'00000000-0000-0000-0000-000000000000',code:'123456'}),e=>e.status===403);
 }
});
test('verified email-link flow requires a valid challenge bound to the authorized member',async()=>{
 const user={kind:'school',id:'member',schoolId:'school',isAdmin:true};
 process.env.SCHOOL_OTP_HMAC_SECRET=secret;
 process.env.SCHOOL_RESEND_API_KEY='ci-mail-dummy';
 process.env.SCHOOL_OTP_FROM='verify@example.edu';
 const pool={query:async()=>({rows:[]}),connect:async()=>({query:async()=>({rows:[]}),release(){}})};
 await assert.rejects(()=>verifyEmailLink(pool,user,{challengeId:'incorrect',code:'123456'}),e=>e.status===400);
});
