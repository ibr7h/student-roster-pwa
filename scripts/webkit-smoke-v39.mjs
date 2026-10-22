import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {webkit} from 'playwright-core';

const root=path.resolve('public');
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json'};
const server=http.createServer((request,response)=>{
 const pathname=new URL(request.url,'http://localhost').pathname;
 const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
 if(!file.startsWith(root+path.sep))return response.writeHead(403).end();
 fs.readFile(file,(error,data)=>{
  if(error)return response.writeHead(404).end();
  response.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'}).end(data);
 });
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
try{
 browser=await webkit.launch({headless:true});
 for(const width of [390,320]){
  const context=await browser.newContext({viewport:{width,height:844},locale:'ar-SA',isMobile:true,hasTouch:true,deviceScaleFactor:3,serviceWorkers:'block'});
  await context.route('https://school-evidence-v39-api-preview.onrender.com/api/**',async route=>{
   const url=route.request().url();
   await route.fulfill({status:url.endsWith('/health')?200:401,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:url.endsWith('/health')?'{"ok":true}':'{"error":"غير مصرح"}'});
  });
  const page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+server.address().port+'/',{waitUntil:'domcontentloaded'});
  await page.locator('#auth39-login').waitFor({state:'visible',timeout:15000});
  assert.equal(await page.locator('#auth39-retryConnection').count(),1,'Explicit reconnect action must exist for sleeping backend');
  // A human-visible build number is essential for diagnosing old installed PWA caches.
  const loginRelease=page.locator('#authV39Shell [data-school-release]');
  await loginRelease.waitFor({state:'visible',timeout:5000});
  assert.equal(await loginRelease.textContent(),'الإصدار v3.9.0-r8');
  const releaseResponse=await page.request.get('http://127.0.0.1:'+server.address().port+'/release.json');
  assert.equal((await releaseResponse.json()).version,'v3.9.0-r8');
  const checkButton=page.locator('#authV39Shell .school-release-check');
  assert.equal(await checkButton.isVisible(),true);
  await page.waitForTimeout(300);
  await checkButton.click();
  await page.waitForFunction(()=>document.querySelector('#authV39Shell .school-release-status')?.textContent.includes('أنت تستخدم أحدث إصدار'),null,{timeout:7000});
  // Emulate a newer public release only; do not install a service worker in CI.
  await page.route('**/release.json?check=*',async route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({version:'v3.9.0-r9',channel:'preview'})}));
  await checkButton.click();
  await page.waitForFunction(()=>document.querySelector('#authV39Shell .school-release-check')?.textContent.includes('تثبيت التحديث v3.9.0-r9'),null,{timeout:7000});


  const layout=await page.evaluate(()=>{
   const shell=document.getElementById('authV39Shell'),outer=document.getElementById('loginScreenOverlay');
   return {width:innerWidth,root:document.documentElement.scrollWidth,shell:shell.getBoundingClientRect().width,outer:outer.getBoundingClientRect().width,font:parseFloat(getComputedStyle(document.getElementById('auth39-identity')).fontSize)};
  });
  assert.ok(layout.root<=width+2&&layout.shell<=width+2&&layout.outer<=width+2,JSON.stringify(layout));
  assert.ok(layout.font>=16,'Prevent WebKit auto-zoom on focus');
  await page.getByRole('button',{name:'إنشاء حساب مدرسة'}).click();
  await page.locator('#auth39-register').waitFor({state:'visible'});
  await page.locator('#auth39-registerForm input').first().focus();
  const horizontal=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2);
  assert.equal(horizontal,false,'No horizontal overflow with focused form');
  await page.getByRole('button',{name:/العودة للدخول/}).click();
  await page.locator('#auth39-login').waitFor({state:'visible'});
  // Test the nested official report at WebKit mobile viewport sizes.
  await page.evaluate(()=>document.getElementById('loginScreenOverlay').classList.add('hidden'));
  assert.equal(await page.locator('#appHeader [data-school-release]').textContent(),'الإصدار v3.9.0-r8');
  assert.equal(await page.locator('#officialReportModal').evaluate(el=>el.parentElement.tagName),'BODY');

  const iconMetrics=await page.evaluate(()=>{
   const nodes=[...document.querySelectorAll('i.fa-solid,i.fa-regular,i.fa-brands')];
   const sample=nodes.slice(0,20).map(icon=>{
    const svg=icon.querySelector('svg.school-vector-icon');
    const rect=icon.getBoundingClientRect();
    const vb=svg?.viewBox.baseVal;
    return {name:[...icon.classList].find(x=>x.startsWith('fa-')&&x!=='fa-solid'),ready:icon.classList.contains('school-vector-ready'),svg:!!svg,display:getComputedStyle(icon).display,color:getComputedStyle(icon).color,size:[rect.width,rect.height],viewBox:vb?[vb.x,vb.y,vb.width,vb.height]:null};
   });
   return {total:nodes.length,ready:nodes.filter(x=>x.classList.contains('school-vector-ready')).length,withSvg:nodes.filter(x=>x.querySelector('svg.school-vector-icon')).length,sample};
  });
  console.log('ICON_WEBKIT_METRICS',JSON.stringify({width,iconMetrics}));
  await page.locator('#mobileMenuToggle').click();
  if(width===390){
   const pic=await page.locator('button[onclick="openOfficialReportModal()"]').screenshot();
   console.log('ICON_SCREENSHOT_BASE64',pic.toString('base64'));
  }
  await page.locator('button[onclick="openOfficialReportModal()"]').click({timeout:7000});
  const report=page.locator('#officialReportModal');
  await report.waitFor({state:'visible',timeout:5000});
  await page.locator('#formalPrintableDocument .a4-page').first().waitFor({state:'attached',timeout:12000});
  await page.waitForFunction(()=>document.body.classList.contains('school-report-open'),null,{timeout:5000});
  await page.waitForFunction(()=>!document.body.classList.contains('mobile-menu-open'),null,{timeout:5000});
  const reportOnTop=await page.evaluate(()=>{
   const report=document.getElementById('officialReportModal');
   const rect=report.getBoundingClientRect();
   const front=document.elementFromPoint(rect.left+rect.width/2,rect.top+rect.height/2);
   return report.contains(front);
  });
  assert.equal(reportOnTop,true,'A4 report must be above the closed mobile tools menu, not hidden behind it');

  const chrome=await page.evaluate(()=>{
   const el=id=>document.getElementById(id);
   const report=el('officialReportModal');
   const header=el('appHeader'),nav=document.querySelector('.mobile-bottom-nav');
   const bounds=node=>node.getBoundingClientRect();
   return {header:getComputedStyle(header).visibility,nav:getComputedStyle(nav).visibility,
    icons:report.querySelectorAll('button svg,button i').length,back:bounds(report.querySelector('.school-native-back')).height>0,
    horizontal:document.documentElement.scrollWidth>innerWidth+2};
  });
  assert.equal(chrome.header,'visible','Report must preserve WebKit header');
  assert.equal(chrome.nav,'visible','Report must preserve WebKit tab navigation');
  assert.ok(chrome.icons>=2,'Report action icons must exist in WebKit');
  assert.ok(chrome.back,'Report back control must be visible in WebKit');
  assert.equal(chrome.horizontal,false,'Report must not create horizontal scroll');
  await report.locator('.school-native-back').click();
  await report.waitFor({state:'hidden',timeout:5000});
  // A renderer exception must not make the report button appear unresponsive.
  await page.evaluate(()=>{
   window.__reportCiRenderer=window.renderFormalReportPreview;
   window.renderFormalReportPreview=()=>{throw new Error('Simulated invalid report data')};
  });
  await page.locator('#mobileMenuToggle').click();
  await page.locator('button[onclick="openOfficialReportModal()"]').click();
  await report.waitFor({state:'visible',timeout:5000});
  await page.getByRole('button',{name:'إعادة محاولة التقرير'}).waitFor({state:'visible',timeout:12000});
  await page.evaluate(()=>{window.renderFormalReportPreview=window.__reportCiRenderer});
  await report.locator('.school-native-back').click();
  await report.waitFor({state:'hidden',timeout:5000});
  assert.equal(errors.length,0,errors.join('; '));
  console.log('PASS WebKit mobile layout and account navigation '+width+'px');
  await context.close();
 }
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve))}
