import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {webkit,chromium} from 'playwright-core';
const root=path.resolve('public');
const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
 const pathname=new URL(req.url,'http://127.0.0.1').pathname;
 const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
 if(!file.startsWith(root+path.sep))return res.writeHead(403).end();
 fs.readFile(file,(err,data)=>err?res.writeHead(404).end():res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'}).end(data));
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const url='http://127.0.0.1:'+server.address().port;
const api='https://school-evidence-v39-api-preview.onrender.com/api/**';
const browser=process.env.TEST_BROWSER==='chromium'?
 await chromium.launch({headless:true,executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']}):
 await webkit.launch({headless:true});
try{
 for(const width of [390,320]){
  let calls=[],errors=[];
  const context=await browser.newContext({viewport:{width,height:844},locale:'ar-SA',isMobile:true,hasTouch:true,serviceWorkers:'block'});
  await context.addInitScript(()=>sessionStorage.setItem('school_evidence_session_v37','X'.repeat(43)));
  const current={id:'manager-ci',name:'مدير اختبار',isAdmin:true,allowedSections:[],activationRequired:false,license:{status:'active',canWrite:true,until:'2027-10-26',daysRemaining:365}};
  await context.route(api,async route=>{
   const req=route.request(),p=new URL(req.url()).pathname,method=req.method();calls.push({p,method});
   const payload=p==='/api/health'?{ok:true}:p==='/api/me'?{user:current}:p==='/api/data'?
    {school:{name:'مدرسة اختبار',stage:'ابتدائي',year:'1448',code:'123456'},team:[],evidences:{},user:current,license:current.license}:
    p==='/api/setup/status'?{setupRequired:false}:{error:'Unknown endpoint'};
   await route.fulfill({status:payload.error?404:200,contentType:'application/json',
    headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Authorization,Content-Type'},
    body:JSON.stringify(payload)});
  });
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url+'/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.SchoolConnectivityUX&&document.querySelector('#loginScreenOverlay')?.classList.contains('hidden'),null,{timeout:20000});
  // Main page is visually quiet; license details remain discoverable in settings.
  assert.equal(await page.locator('#storageNotice').count(),0,'Remove redundant server success banner from main');
  assert.equal(await page.locator('#licenseBanner').evaluate(el=>el.closest('#schoolConnectLicenseHost')!==null),true,'License should move to settings');
  const head=await page.locator('#appHeader').evaluate(el=>{
   const css=getComputedStyle(el);
   return {background:css.backgroundColor,filter:css.backdropFilter,image:css.backgroundImage};
  });
  const ios=await page.evaluate(()=>{
   const meta=name=>[...document.querySelectorAll('meta[name="'+name+'"]')].map(el=>el.content);
   const top=getComputedStyle(document.getElementById('appHeader'),'::before');
   const root=getComputedStyle(document.documentElement);
   return {status:meta('apple-mobile-web-app-status-bar-style'),standalone:meta('apple-mobile-web-app-capable'),
    theme:meta('theme-color'),rootColor:root.backgroundColor,topPseudo:top.content,topDisplay:top.display};
  });
  assert.deepEqual(ios.status,['black'],'Native iPhone status bar must be solid, with no translucent fade');
  assert.deepEqual(ios.standalone,['yes'],'Apple PWA standalone is required for status meta');
  assert.deepEqual(ios.theme,['#0d4153'],'Use a solid theme behind the native status bar');
  assert.equal(ios.topDisplay,'none','Remove legacy negative safe-area overlay');
  assert.equal(ios.rootColor,'rgb(13, 65, 83)','Root must remain same solid shade as header');
  const strip=await page.evaluate(()=>{
    const el=document.getElementById('schoolIosStatusBarSurface');
    if(!el)return null;
    const style=getComputedStyle(el);
    return {tag:el.tagName,first:document.body.firstElementChild===el,aria:el.getAttribute('aria-hidden'),
      display:style.display,parent:el.parentElement?.tagName,
      rules:[...document.styleSheets].flatMap(sheet=>{
       try{return [...sheet.cssRules].filter(rule=>rule.cssText.includes('schoolIosStatusBarSurface')).map(rule=>rule.cssText.slice(0,1200))}
       catch{return []}
      })};
  });
  assert.ok(strip?.first,'Solid status surface must be added as first body element before app paint');
  assert.equal(strip.aria,'true','Status surface must be excluded from accessibility tree');
  assert.equal(strip.display,'none','Do not cover Safari/browser-mode or desktop content');
  const css=fs.readFileSync(path.join(root,'assets/mobile-connectivity-ux-v39.css'),'utf8');
  assert.ok(css.includes('@media screen and (display-mode: standalone)'),'Only installed PWA can show status surface');
  assert.ok(css.includes('width:100%!important;height:10px!important'),'System blur workaround must fill the whole top edge');
  assert.ok(css.includes('position:fixed!important')&&css.includes('background:#0d4153!important')&&css.includes('pointer-events:none!important'),'Native iOS blur mitigation must be fixed, solid and non-interactive');
  assert.equal(head.filter,'none','No iOS top blur');
  assert.equal(head.image,'none','Opaque header must not use gradients');
  assert.equal(await page.locator('#schoolConnectivityOpen').count(),1);
  assert.equal(await page.locator('#headerTools .school-connect-menu-entry').count(),1,'More menu must also expose connectivity');
  await page.locator('#schoolConnectivityOpen').click();
  const panel=page.locator('#schoolConnectivityPanel');
  await panel.waitFor({state:'visible'});
  assert.equal(await panel.getAttribute('dir'),'rtl');
  assert.equal(await panel.locator('#schoolConnectModes button').count(),3);
  assert.equal(await panel.locator('#schoolConnectSync').isEnabled(),true);
  const dataBefore=calls.filter(x=>x.p==='/api/data').length;
  await panel.locator('#schoolConnectSync').click();
  await page.waitForFunction(()=>document.getElementById('schoolConnectFeedback').textContent.includes('تم تحديث بيانات المدرسة'),null,{timeout:17000});
  assert.ok(calls.filter(x=>x.p==='/api/data').length>dataBefore,'Actual /data refresh required');
  await panel.locator('button[data-mode=offline]').click();
  assert.equal(await panel.locator('#schoolConnectSync').isDisabled(),true);
  const beforeWrites=calls.filter(x=>x.method==='POST').length;
  const offline=await page.evaluate(async()=>{
   try{await cloudRequest('/evidences',{method:'POST',body:'{}'});return 'sent'}
   catch(e){return String(e.message)}
  });
  assert.ok(offline.includes('لم تُحفظ'),'Must not falsely claim offline changes were saved');
  assert.equal(calls.filter(x=>x.method==='POST').length,beforeWrites,'Never send writes in explicit offline mode');
  const text=await panel.locator('.school-connect-security').innerText();
  assert.ok(text.includes('الجلسة الحالية')&&text.includes('لا تُحفظ تعديلات'),'Honest limits must be disclosed');
  // Check route from More menu without mutating the user account.
  await panel.locator('#schoolConnectBack').click();
  assert.equal(await panel.isHidden(),true);
  await page.evaluate(()=>window.mobileNavigate('more'));
  await page.waitForFunction(()=>document.body.classList.contains('mobile-menu-open'),null,{timeout:7000});
  await page.locator('#headerTools .school-connect-menu-entry').click();
  await panel.waitFor({state:'visible'});
  assert.equal(await page.evaluate(()=>document.body.classList.contains('mobile-menu-open')),false);
    // Session logout must work even while explicitly offline.
  await page.evaluate(()=>window.SchoolConnectivityUX.request('/logout',{method:'POST',body:'{}'}));
  assert.equal(await page.evaluate(()=>window.SchoolBridge.token()),'');
  assert.deepEqual(errors,[],'No browser exceptions: '+errors.join('; '));
  console.log('PASS_MOBILE_CONNECTIVITY_UX',JSON.stringify({width,opaqueHeader:head.background,licenseRelocated:true,networkSync:true,offlineWritesBlocked:true,logoutClearsToken:true}));
  await context.close();
 }
}finally{await browser.close();await new Promise(r=>server.close(r))}
