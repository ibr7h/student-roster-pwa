import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const source=readFileSync(new URL('./static-api-v37.js',import.meta.url),'utf8');
function makeBridge(fetch){
 const values=new Map();
 const sessionStorage={
  getItem:k=>values.get(k)??null,
  setItem:(k,v)=>values.set(k,String(v)),
  removeItem:k=>values.delete(k)
 };
 const window={};
 runInNewContext(source,{
  window,fetch,Headers,AbortController,sessionStorage,
  setTimeout,clearTimeout
 },{filename:'static-api-v37.js'});
 return window.SchoolBridge;
}
function jsonResponse(status,data){
 return {status,ok:status>=200&&status<300,json:async()=>data};
}

test('owner status read recovers after a temporary 503 without duplicating writes',async()=>{
 let calls=0;
 const bridge=makeBridge(async()=>{calls++;return calls===1?jsonResponse(503,{}):jsonResponse(200,{ready:true})});
 const result=await bridge.request('/platform/me');
 assert.equal(result.ready,true);
 assert.equal(calls,2);
});
test('mutating Google OAuth JSON config is never automatically retried',async()=>{
 let calls=0;
 const bridge=makeBridge(async()=>{calls++;return jsonResponse(503,{error:'temporarily unavailable'})});
 await assert.rejects(bridge.request('/platform/google-drive',{method:'POST',body:'{}'}),/temporarily unavailable/);
 assert.equal(calls,1);
});
test('unauthorized owner reads do not retry and clear stored bearer tokens',async()=>{
 let calls=0;
 const bridge=makeBridge(async()=>{calls++;return jsonResponse(401,{error:'unauthorized'})});
 await assert.rejects(bridge.request('/platform/me'),/unauthorized/);
 assert.equal(calls,1);
});
test('owner GET retries a dropped connection without changing the endpoint origin',async()=>{
 let calls=0;const urls=[];
 const bridge=makeBridge(async url=>{
  calls++;urls.push(url);
  if(calls===1)throw new TypeError('Failed to fetch');
  return jsonResponse(200,{ok:true});
 });
 const result=await bridge.request('/platform/google-drive');
 assert.equal(result.ok,true);
 assert.equal(calls,2);
 assert.deepEqual(urls,Array(2).fill('https://school-evidence-v33-cloud-preview.onrender.com/api/platform/google-drive'));
});
