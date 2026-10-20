import {test} from 'node:test';
import assert from 'node:assert/strict';
import {durableThrottle,rateBucketId} from './rate-limit-v39.mjs';
const SECRET='CI-only-rate-secret-20261020-should-never-be-used-in-production';
test('rate limiter stores only a one-way HMAC bucket key, not the client IP',()=>{
 const key=rateBucketId('203.0.113.10','school-login',SECRET);
 assert.match(key,/^school-login:[0-9a-f]{64}$/);
 assert.ok(!key.includes('203.0.113.10'));
 assert.notEqual(key,rateBucketId('203.0.113.11','school-login',SECRET));
 assert.notEqual(key,rateBucketId('203.0.113.10','password-reset-start',SECRET));
 assert.throws(()=>rateBucketId('203.0.113.10','school-login','short'),x=>x.status===503);
});
test('PG-backed counters reject excessive calls and survive module-level state changes',async()=>{
 let hits=0;const q=[];
 const pool={query:async(sql,args)=>{q.push([sql,args]);return {rows:[{hits:++hits}]} }};
 const settings={secret:SECRET,limit:2,windowSeconds:120};
 assert.deepEqual(await durableThrottle(pool,'203.0.113.10','school-login',settings),{ok:true});
 assert.deepEqual(await durableThrottle(pool,'203.0.113.10','school-login',settings),{ok:true});
 await assert.rejects(()=>durableThrottle(pool,'203.0.113.10','school-login',settings),x=>x.status===429);
 assert.equal(q.length,3);
 for(const [sql,args] of q){
  assert.match(sql,/ON CONFLICT\(bucket\) DO UPDATE/);
  assert.match(sql,/RETURNING hits/);
  assert.equal(args[1],120);
  assert.ok(!sql.includes('203.0.113.10'));
  assert.ok(!JSON.stringify(args).includes('203.0.113.10'));
 }
});
test('invalid limit parameters rejected before accessing database',async()=>{
 const pool={query(){throw Error('DB should not be touched')}};
 await assert.rejects(()=>durableThrottle(pool,'127.0.0.1','school-login',{limit:-1,windowSeconds:10,secret:SECRET}),/Invalid limit settings/);
});
