import assert from 'node:assert/strict';
const WEB='https://school-evidence-mobile-v37.onrender.com';
const API='https://school-evidence-v33-cloud-preview.onrender.com';
const req=async (url,opts={})=>fetch(url,{...opts,signal:AbortSignal.timeout(110000),cache:'no-store'});
const check=async (desc,fn)=>{await fn();console.log('PASS '+desc)};
await check('frontend served separately without waiting for Node API',async()=>{
 const response=await req(WEB+'/index.html');assert.equal(response.status,200);
 const html=await response.text();assert.ok(html.includes('static-api-v37.js'));assert.ok(html.includes('SchoolBridge.request'));
});
await check('static owner activation and protected viewer',async()=>{
 for(const path of ['/owner.html','/activate.html','/view.html','/assets/static-api-v37.js','/view.js']){
  const r=await req(WEB+path);assert.equal(r.status,200,path);
 }
});
await check('static PWA service worker cache version',async()=>{
 const r=await req(WEB+'/sw.js');assert.equal(r.status,200);
 const s=await r.text();assert.ok(s.includes('v3.7.0'));assert.ok(s.includes('static-api-v37.js'));
});
await check('Neon-backed API health returns successfully',async()=>{
 const r=await req(API+'/api/health',{headers:{Origin:WEB}});assert.equal(r.status,200);const d=await r.json();
 assert.equal(d.ok,true);assert.equal(r.headers.get('access-control-allow-origin'),WEB);
});
await check('cross-origin preflight authorizes only the new static site',async()=>{
 const r=await req(API+'/api/me',{method:'OPTIONS',headers:{Origin:WEB,'Access-Control-Request-Method':'GET','Access-Control-Request-Headers':'authorization,content-type'}});
 assert.equal(r.status,204);assert.equal(r.headers.get('access-control-allow-origin'),WEB);
 assert.match(r.headers.get('access-control-allow-headers')||'',/Authorization/);
 assert.equal(r.headers.get('access-control-allow-credentials'),null);
});
await check('unauthenticated and forged-bearer school data rejected',async()=>{
 for(const headers of [{Origin:WEB},{Origin:WEB,Authorization:'Bearer '+ 'a'.repeat(43)}]){
  const r=await req(API+'/api/data',{headers});assert.equal(r.status,401);
 }
});
await check('untrusted origin cannot request privileged cross-origin API',async()=>{
 const r=await req(API+'/api/me',{method:'OPTIONS',headers:{Origin:'https://invalid.test','Access-Control-Request-Method':'GET','Access-Control-Request-Headers':'authorization'}});
 assert.equal(r.headers.get('access-control-allow-origin'),null);assert.notEqual(r.status,204);
});
console.log('Static PWA and API smoke verification complete. Authenticated school login requires user testing, and is not claimed by these checks.');
