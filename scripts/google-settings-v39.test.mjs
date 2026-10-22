import test from 'node:test';import assert from 'node:assert/strict';
import {parseWebClient,encryptSecret,decryptSecret,getGoogleStatus,saveGoogleConfig} from './google-settings-v39.mjs';
const sample={web:{project_id:'shawahed-school',client_id:'839613940331-e1356j8bkt407nqndv7kpll0q9ll1s77.apps.googleusercontent.com',client_secret:'GOCSPX-test-not-secret',auth_uri:'https://accounts.google.com/o/oauth2/auth',token_uri:'https://oauth2.googleapis.com/token'}};
test('accepts only Google web OAuth client JSON, rejects service account or unsafe auth origin',()=>{
 assert.equal(parseWebClient(sample).clientId,sample.web.client_id);
 for(const input of [{web:{...sample.web,project_id:'wrong-project'}},{installed:sample.web},{type:'service_account',private_key:'secret'},{web:{...sample.web,auth_uri:'https://evil.example/oauth'}},{web:{...sample.web,client_secret:''}}]){
  assert.throws(()=>parseWebClient(input),e=>e.status===400);
 }
});
test('AES-256-GCM encrypts at rest, can be rotated, rejects tamper and absent key',()=>{
 const old=process.env.SCHOOL_GOOGLE_CONFIG_KEY;
 try{
  delete process.env.SCHOOL_GOOGLE_CONFIG_KEY;
  assert.throws(()=>encryptSecret('abc'),e=>e.status===503);
  process.env.SCHOOL_GOOGLE_CONFIG_KEY='11'.repeat(32);
  const x=encryptSecret(sample.web.client_secret),y=encryptSecret(sample.web.client_secret);
  assert.notEqual(x,y);assert.ok(!x.includes(sample.web.client_secret));
  assert.equal(decryptSecret(x),sample.web.client_secret);
  const bytes=Buffer.from(x,'base64');bytes[bytes.length-1]^=2;
  assert.throws(()=>decryptSecret(bytes.toString('base64')));
 }finally{if(old===undefined)delete process.env.SCHOOL_GOOGLE_CONFIG_KEY;else process.env.SCHOOL_GOOGLE_CONFIG_KEY=old}
});
test('never returns secret from status/upload, stores encrypted record and audit in transaction',async()=>{
 const old=process.env.SCHOOL_GOOGLE_CONFIG_KEY;process.env.SCHOOL_GOOGLE_CONFIG_KEY='22'.repeat(32);
 const queries=[];const client={query:async(q,params)=>{queries.push({q,params});return {rows:[],rowCount:1}},release:()=>{}};
 const pool={connect:async()=>client,query:async()=>({rows:[{client_id:sample.web.client_id,updated_at:new Date('2026-10-22T00:00:00Z')}]})};
 try{
  const result=await saveGoogleConfig(pool,sample,'00000000-0000-4000-8000-000000000001');
  assert.equal(result.linkingEnabled,false);
  assert.ok(!JSON.stringify(result).includes(sample.web.client_secret));
  const write=queries.find(x=>x.q.includes('platform_google_oauth'));
  assert.ok(write&&write.params[1]!==sample.web.client_secret);
  assert.equal(decryptSecret(write.params[1]),sample.web.client_secret);
  assert.ok(queries.some(x=>x.q.includes('activity_log')));
  const status=await getGoogleStatus(pool);
  assert.equal(status.configured,true);assert.equal(status.linkingEnabled,false);
  assert.ok(!JSON.stringify(status).includes(sample.web.client_secret));
 }finally{if(old===undefined)delete process.env.SCHOOL_GOOGLE_CONFIG_KEY;else process.env.SCHOOL_GOOGLE_CONFIG_KEY=old}
});
