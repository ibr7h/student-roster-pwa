import test from 'node:test';
import assert from 'node:assert/strict';
import {parseGoogleFile,saveGoogleConfig,googleConfigStatus} from './owner-google-v39.mjs';
const valid={web:{project_id:'shawahed-school',client_id:'839613940331-e1356j8bkt407nqndv7kpll0q9ll1s77.apps.googleusercontent.com',client_secret:'TEST_ONLY_DO_NOT_USE_SECRET',redirect_uris:['https://school-evidence-v39-api-preview.onrender.com/api/google/callback']}};
test('only the exact shawahed-school web OAuth JSON is accepted',()=>{
 const parsed=parseGoogleFile(valid);
 assert.equal(parsed.projectId,'shawahed-school');
 assert.equal(parsed.redirectUris.length,1);
 for(const invalid of [{installed:valid.web},{web:{...valid.web,project_id:'unrelated-school'}},{web:{...valid.web,client_secret:''}},{web:{...valid.web,redirect_uris:['javascript:alert(1)']}},{web:valid.web,other:'extraneous'}]){
  assert.throws(()=>parseGoogleFile(invalid));
 }
});
test('encrypted stored data is opaque; no secret returned to the owner UI',async()=>{
 process.env.SCHOOL_GOOGLE_OAUTH_VAULT_KEY=Buffer.alloc(32,29).toString('base64');
 let stored=null;
 const pool={query:async(sql,args)=>{
  if(sql.startsWith('CREATE TABLE'))return {rows:[]};
  if(sql.startsWith('INSERT INTO')){stored=args;return {rows:[]}}
  if(sql.startsWith('SELECT iv'))return {rows:stored?[{iv:stored[0],tag:stored[1],data:stored[2],updated_at:new Date()}]:[]};
  throw Error('Unexpected query');
 }};
 const saved=await saveGoogleConfig(pool,valid);
 assert.equal(saved.configured,true);
 assert.equal(saved.redirectConfigured,true);
 assert.equal(JSON.stringify(saved).includes('TEST_ONLY'),false);
 assert.equal(JSON.stringify(stored).includes('TEST_ONLY'),false);
 const status=await googleConfigStatus(pool);
 assert.equal(status.configured,true);
 assert.equal(status.projectId,'shawahed-school');
 assert.equal(JSON.stringify(status).includes('TEST_ONLY'),false);
 delete process.env.SCHOOL_GOOGLE_OAUTH_VAULT_KEY;
});
test('server fails closed if vault encryption key is not configured',async()=>{
 delete process.env.SCHOOL_GOOGLE_OAUTH_VAULT_KEY;
 await assert.rejects(()=>saveGoogleConfig({query:async()=>({rows:[]})},valid),e=>e.status===503);
});
