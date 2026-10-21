import test from 'node:test';
import assert from 'node:assert/strict';
import {clientAddress} from './client-ip-v39.mjs';
const req=(headers={},remoteAddress='10.1.2.3')=>({headers,socket:{remoteAddress}});
test('trusted Render edge separates independent real users',()=>{
 assert.equal(clientAddress(req({'cf-connecting-ip':'203.0.113.10'}),{onRender:true}),'203.0.113.10');
 assert.equal(clientAddress(req({'cf-connecting-ip':'203.0.113.11'}),{onRender:true}),'203.0.113.11');
});
test('do not trust spoofed forwarded chains or proxy metadata off Render',()=>{
 const spoof={'cf-connecting-ip':'198.51.100.30','x-forwarded-for':'1.2.3.4'};
 assert.equal(clientAddress(req(spoof),{onRender:false}),'10.1.2.3');
 assert.equal(clientAddress(req({'x-forwarded-for':'1.2.3.4, 5.6.7.8'}),{onRender:true}),'10.1.2.3');
});
test('reject malformed or injected client IP, use safe fallback',()=>{
 for(const val of ['1.2.3.4, 5.6.7.8','anything','127.0.0.1\\r\\nX-Secret: n','', '1.2.3.4:1234']){
  assert.equal(clientAddress(req({'cf-connecting-ip':val}),{onRender:true}),'10.1.2.3');
 }
 assert.equal(clientAddress(req({'cf-connecting-ip':'2001:db8::5'}),{onRender:true}),'2001:db8::5');
 assert.equal(clientAddress({}, {onRender:true}), 'unknown');
});
