import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
const origin='https://school-evidence-v39-preview.onrender.com';
const api='https://school-evidence-v39-api-preview.onrender.com';
const browser=await chromium.launch({headless:true});
try{
 const context=await browser.newContext({viewport:{width:390,height:844},locale:'ar-SA',serviceWorkers:'block'});
 const page=await context.newPage(),failures=[],apiRequests=[];
 page.on('pageerror',error=>failures.push('JS '+String(error.message).slice(0,160)));
 page.on('requestfailed',request=>failures.push('NETWORK '+request.method()+' '+new URL(request.url()).pathname+' '+String(request.failure()?.errorText||'').slice(0,80)));
 page.on('response',response=>{if(response.url().startsWith(api))apiRequests.push({method:response.request().method(),path:new URL(response.url()).pathname,status:response.status()})});
 await page.goto(origin+'/owner.html?live-owner-cors='+Date.now(),{waitUntil:'domcontentloaded',timeout:50000});
 await page.waitForTimeout(7000);
 const result=await page.evaluate(async api=>{
  const check=async(path,withHeader)=>{
   try{
    const reply=await fetch(api+path,{method:'GET',mode:'cors',credentials:'omit',cache:'no-store',headers:withHeader?{'Content-Type':'application/json'}:{}});
    const json=await reply.json().catch(()=>({}));
    return {ok:reply.ok,status:reply.status,keys:Object.keys(json).sort()};
   }catch(error){return {error:error.name+': '+error.message}}
  };
  return {origin:window.SCHOOL_API_ORIGIN,ownerStatus:document.getElementById('status')?.textContent,
   ownerLoginVisible:!!document.querySelector('#loginUsername')&&getComputedStyle(document.getElementById('login')).display!=='none',
   hasRetry:!!document.querySelector('.owner-drive-retry'),
   statusWithHeader:await check('/api/platform/status',true),
   statusSimple:await check('/api/platform/status',false),
   healthWithHeader:await check('/api/health',true),
   ownerUnauth:await check('/api/platform/google-drive',true)};
 },api);
 console.log('LIVE_OWNER_DIAGNOSTIC',JSON.stringify({result,apiRequests,failures}));
 assert.equal(result.origin,api,'Owner PWA uses incorrect API origin');
 assert.equal(result.statusWithHeader.status,200,'Owner CORS/network status failed');
 assert.equal(result.statusSimple.status,200,'Owner public platform status failed');
 assert.equal(result.healthWithHeader.status,200,'Owner browser API health failed');
 assert.ok([401,403].includes(result.ownerUnauth.status),'Unauthenticated owner configuration must remain private');
 assert.equal(failures.length,0,failures.join('; '));
 console.log('PASS live owner cross-origin access and protected Google configuration; no credentials or writes used');
 await context.close();
}finally{await browser.close()}
