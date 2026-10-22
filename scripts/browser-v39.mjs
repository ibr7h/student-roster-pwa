import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright-core';
const root=path.resolve('public'),origin='https://school-evidence-v39-api-preview.onrender.com';
const reqLog=[];
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2','.ttf':'font/ttf'};
const server=http.createServer((req,res)=>{
 const uri=new URL(req.url,'http://localhost');
 const safe=path.resolve(root,'.'+(uri.pathname==='/'?'/index.html':decodeURIComponent(uri.pathname)));
 if(!safe.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 fs.stat(safe,(e,st)=>{if(e||!st.isFile()){res.writeHead(404).end();return}
  res.setHeader('Content-Type',mime[path.extname(safe)]||'application/octet-stream');
  fs.createReadStream(safe).pipe(res);
 });
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port;
let browser;
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true,locale:'ar-SA',serviceWorkers:'block'});
 let active=false;
 await ctx.route(origin+'/api/**',async route=>{
  const request=route.request(),url=new URL(request.url()),p=url.pathname,method=request.method();
  const body=method==='POST'?JSON.parse(request.postData()||'{}'):{};
  reqLog.push({path:p,method,body});
  const res=(status,data)=>route.fulfill({status,contentType:'application/json; charset=utf-8',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify(data)});
  if(method==='OPTIONS')return route.fulfill({status:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type,Authorization'}});
  if(p==='/api/health')return res(200,{ok:true,database:'connected',version:'3.9.0'});
  if(p==='/api/me')return active?res(200,{user:{id:'ci-test',name:'Manager',isAdmin:true,allowedSections:[],activationRequired:false,license:{canWrite:true,status:'active'}}}):res(401,{error:'غير مصرح'});
  if(p==='/api/register/start')return res(202,{challengeId:'12345678-abcd-4def-8899-123456789012',resendAfterSeconds:60});
  if(p==='/api/register/verify')return res(201,{verified:true,needsLogin:true});
  if(p==='/api/register/resend')return res(200,{ok:true,resendAfterSeconds:60});
  if(p==='/api/login')return res(200,{user:{id:'ci-test',name:'Manager',isAdmin:true,activationRequired:true,allowedSections:[],license:{canWrite:false,status:'expired'}},sessionToken:'p'.repeat(43)});
  if(p==='/api/school/activate'){active=true;return res(200,{ok:true})}
  if(p==='/api/data')return res(200,{school:{name:'Test school'},team:[],evidences:{},user:{id:'ci-test',name:'Manager',isAdmin:true,allowedSections:[],license:{canWrite:true,status:'active'}},license:{canWrite:true,status:'active'}});
  if(p==='/api/profile/email/start')return res(202,{challengeId:'c2345678-abcd-4def-8899-123456789012'});
  if(p==='/api/profile/email/verify')return res(200,{verified:true});
  if(p==='/api/password/reset/start')return res(202,{ok:true,challengeId:'b2345678-abcd-4def-8899-123456789012'});
  if(p==='/api/password/reset/verify')return res(200,{ok:true});
  if(p==='/api/profile/password/change')return res(200,{ok:true,needsLogin:true});
  return res(404,{error:'Route not mocked '+p});
 });
 const page=await ctx.newPage();
 const exceptions=[];
 page.on('pageerror',e=>exceptions.push(e.message));
 await page.goto(base+'/',{waitUntil:'domcontentloaded'});
 await page.locator('#auth39-login').waitFor({state:'visible',timeout:15000});
 assert.equal(await page.locator('#schoolLoginCode').isVisible(),false);
 assert.equal(await page.locator('#loginTabMember').isVisible(),false);
 assert.equal(await page.locator('#auth39-identity').isVisible(),true);
 const testViewport=async()=>{
  const v=await page.evaluate(()=>{
   const shell=document.querySelector('#authV39Shell'),overlay=document.getElementById('loginScreenOverlay');
   return {screen:window.innerWidth,shell:shell.getBoundingClientRect().width,
    overlay:overlay.getBoundingClientRect().width,
    scroller:overlay.scrollWidth,root:document.documentElement.scrollWidth,font:parseFloat(getComputedStyle(document.getElementById('auth39-identity')).fontSize)};
  });
  assert.ok(v.shell<=v.screen+2&&v.overlay<=v.screen+2,'Overflow '+JSON.stringify(v));
  assert.ok(v.font>=16,'Avoid Safari zoom on focus');
 };
 await testViewport();
 await page.getByRole('button',{name:'إنشاء حساب مدرسة'}).click();
 await page.locator('#auth39-register').waitFor({state:'visible'});
 await page.locator('#auth39-schoolName').fill('مدرسة اختبار');
 await page.locator('#auth39-schoolType').selectOption('boys');
 await page.locator('#auth39-ministryCode').fill('9876543210');
 await page.locator('#auth39-name').fill('مدير تجريبي');
 await page.locator('#auth39-email').fill('test@example.edu');
 await page.locator('#auth39-phone').fill('0551234567');
 await page.locator('#auth39-username').fill('ci.username');
 await page.locator('#auth39-newPassword').fill('SecureTestPassword!2026');
 await page.locator('#auth39-confirmPassword').fill('SecureTestPassword!2026');
 await page.locator('#auth39-registerSubmit').click();
 await page.locator('#auth39-verify').waitFor({state:'visible'});
 const submitted=reqLog.find(x=>x.path==='/api/register/start');
 assert.equal(submitted.body.email,'test@example.edu');
 assert.equal(submitted.body.phone,'0551234567');
 assert.equal(submitted.body.schoolCode,undefined);
 await page.locator('#auth39-code').fill('123456');
 await page.locator('#auth39-verifyForm button[type=submit]').click();
 await page.locator('#auth39-login').waitFor({state:'visible'});
 assert.equal(await page.locator('#auth39-identity').inputValue(),'ci.username');
 await page.locator('#auth39-password').fill('SecureTestPassword!2026');
 await page.locator('#auth39-loginSubmit').click();
 await page.locator('#auth39-activation').waitFor({state:'visible'});
 const login=reqLog.find(x=>x.path==='/api/login');
 assert.deepEqual(Object.keys(login.body).sort(),['password','username']);
 assert.equal(await page.evaluate(()=>sessionStorage.getItem('school_evidence_session_v37')),'p'.repeat(43));
 await page.locator('#auth39-serial').fill('EDU-ABCDE-ABCDE-ABCDE-ABCDE');
 await page.locator('#auth39-activationForm button[type=submit]').click();
 await page.waitForTimeout(800);
 assert.ok(reqLog.some(x=>x.path==='/api/school/activate'&&x.body.serial==='EDU-ABCDE-ABCDE-ABCDE-ABCDE'));
 const linkButton=page.locator('#auth39-link-email-action');
 assert.equal(await linkButton.count(),1);
 assert.equal(await linkButton.evaluate(e=>e.hidden),false,'Old manager must be offered verified email linking');
 await linkButton.evaluate(el=>el.click());
 await page.locator('#auth39-emailLink').waitFor({state:'visible'});
 // Both Back and Cancel must leave the screen without trapping the manager.
 await page.locator('#auth39-emailBack').click();
 await page.locator('#auth39-emailLink').waitFor({state:'hidden'});
 await linkButton.evaluate(el=>el.click());
 await page.locator('#auth39-emailCancel').click();
 await page.locator('#auth39-emailLink').waitFor({state:'hidden'});
 // Changing a known password must not require email verification for legacy accounts.
 const passwordButton=page.locator('#auth39-change-password-action');
 assert.equal(await passwordButton.evaluate(el=>el.hidden),false);
 await passwordButton.evaluate(el=>el.click());
 await page.locator('#auth39-change').waitFor({state:'visible'});
 assert.equal(await page.locator('#auth39-emailLink').isVisible(),false);
 await page.locator('#auth39-changeCancel').click();
 await page.locator('#auth39-change').waitFor({state:'hidden'});
 await linkButton.evaluate(el=>el.click());
 await page.locator('#auth39-emailToLink').fill('legacy.manager@example.edu');
 await page.locator('#auth39-emailPassword').fill('LegacyExamplePassword#1234');
 await page.locator('#auth39-emailLinkForm button[type=submit]').click();
 await page.locator('#auth39-emailVerify').waitFor({state:'visible'});
 await page.locator('#auth39-emailCode').fill('123456');
 await page.locator('#auth39-emailVerifyForm button[type=submit]').click();
 await page.locator('#auth39-emailVerify').waitFor({state:'hidden'});
 assert.equal(await linkButton.evaluate(e=>e.hidden),true,'Email-link action must disappear after verification');
 assert.ok(reqLog.some(x=>x.path==='/api/profile/email/start'&&x.body.email==='legacy.manager@example.edu'));
 assert.ok(reqLog.some(x=>x.path==='/api/profile/email/verify'&&x.body.code==='123456'));
 // Both verified and legacy accounts open the same authenticated change screen.
 await passwordButton.evaluate(el=>el.click());
 await page.locator('#auth39-change').waitFor({state:'visible'});
 await page.locator('#auth39-changeBack').click();
 await page.locator('#auth39-change').waitFor({state:'hidden'});
 // Regression: click the actual report button rather than manually showing its modal.
 const launchReport=page.locator('button[onclick="openOfficialReportModal()"]');
 assert.equal(await launchReport.count(),1,'There must be one actual A4 report launcher');
 console.log('REPORT_LAUNCHER_STATE',JSON.stringify(await launchReport.evaluate(button=>({
  visible:getComputedStyle(button).visibility,
  display:getComputedStyle(button).display,
  rect:button.getBoundingClientRect().toJSON(),
  atPoint:document.elementFromPoint(button.getBoundingClientRect().left+button.getBoundingClientRect().width/2,button.getBoundingClientRect().top+button.getBoundingClientRect().height/2)?.outerHTML.slice(0,170)
 }))));
 await launchReport.evaluate(button=>button.click());
 await page.locator('#officialReportModal').waitFor({state:'visible',timeout:6000});
 await page.locator('#officialReportModal .school-native-back').click();
 await page.locator('#officialReportModal').waitFor({state:'hidden',timeout:5000});
 // Reproduce report inside its two screen containers, not as a detached hidden modal.
 const report=page.locator('#officialReportModal');
 assert.equal(await report.count(),1);
 assert.equal(await report.evaluate(el=>el.parentElement.tagName),'BODY');
 await launchReport.evaluate(button=>button.click());
 await report.waitFor({state:'visible',timeout:5000});
 await page.waitForFunction(()=>document.body.classList.contains('school-report-open'),null,{timeout:5000});
 const checks=await page.evaluate(()=>{
  const header=document.getElementById('appHeader');
  const nav=document.querySelector('.mobile-bottom-nav');
  const report=document.getElementById('officialReportModal');
  const back=report.querySelector('.school-native-back');
  const rect=x=>x.getBoundingClientRect();
  return {
   header:getComputedStyle(header).visibility,
   nav:getComputedStyle(nav).visibility,
   backVisible:rect(back).height>0,
   actionCount:report.querySelectorAll('button svg,button i').length,
   bounds:{header:rect(header).bottom,top:rect(report).top,bottom:rect(report).bottom,nav:rect(nav).top}
  };
 });
 console.log('REPORT_VISIBLE_CHECK',JSON.stringify(checks));
 console.log('REPORT_BACK_RECT',await page.locator('#officialReportModal .school-native-back').evaluate(e=>({button:e.getBoundingClientRect().toJSON(),bar:e.parentElement.getBoundingClientRect().toJSON(),atPoint:document.elementFromPoint(e.getBoundingClientRect().x+15,e.getBoundingClientRect().y+15)?.id||null})));

 assert.equal(checks.header,'visible');
 assert.equal(checks.nav,'visible');
 assert.ok(checks.backVisible,'Report back control must be visible');
 assert.ok(checks.actionCount>=2,'Report action icons must exist');
 await page.locator('#officialReportModal .school-native-back').click();
 await report.waitFor({state:'hidden',timeout:5000});
 // The mobile school-profile back action must actually dismiss the full-screen modal.
 const profile=page.locator('#schoolProfileModal');
 assert.equal(await profile.count(),1);
 await profile.evaluate(el=>el.classList.remove('hidden'));
 await page.locator('#schoolProfileModal .school-native-back').click();
 await profile.waitFor({state:'hidden'});
 assert.equal(await page.evaluate(()=>document.body.classList.contains('school-screen-open')),false);

 // Change password using the current secret; successful change returns to sign-in.
 await passwordButton.evaluate(el=>el.click());
 await page.locator('#auth39-change').waitFor({state:'visible'});
 await page.locator('#auth39-currentPassword').fill('LegacyExamplePassword#1234');
 await page.locator('#auth39-nextPassword').fill('NextStrongSchoolPassword!2026');
 await page.locator('#auth39-nextConfirm').fill('NextStrongSchoolPassword!2026');
 await page.locator('#auth39-changeForm button[type=submit]').click();
 await page.locator('#auth39-login').waitFor({state:'visible'});
 const changeRequest=reqLog.find(x=>x.path==='/api/profile/password/change');
 assert.equal(changeRequest.body.currentPassword,'LegacyExamplePassword#1234');
 assert.equal(changeRequest.body.newPassword,'NextStrongSchoolPassword!2026');
 assert.equal(await page.locator('#auth39-emailLink').isVisible(),false);
 const manifestResponse=await page.request.get(base+'/manifest.webmanifest');
 const manifest=await manifestResponse.json();assert.equal(manifest.display,'standalone');
 active=false;
 await page.setViewportSize({width:320,height:700});await page.reload({waitUntil:'domcontentloaded'});
 await page.locator('#auth39-login').waitFor({state:'visible'});
 await testViewport();
 await page.getByRole('button',{name:'نسيت كلمة المرور؟'}).click();
 await page.locator('#auth39-reset').waitFor({state:'visible'});
 await page.locator('#auth39-resetEmail').fill('verified@example.edu');
 await page.locator('#auth39-resetStartForm button[type=submit]').click();
 await page.locator('#auth39-resetVerify').waitFor({state:'visible'});
 await page.locator('#auth39-resetCode').fill('123456');
 await page.locator('#auth39-resetPassword').fill('FreshSchoolPassword!2026');
 await page.locator('#auth39-resetConfirm').fill('FreshSchoolPassword!2026');
 await page.locator('#auth39-resetVerifyForm button[type=submit]').click();
 await page.locator('#auth39-login').waitFor({state:'visible'});

 // Platform owner console: connection retry and optional OAuth JSON import.
 const ownerPage=await ctx.newPage();
 let ownerAuthorized=false,ownerGoogleStored=false;const ownerPosts=[];
 ownerPage.on('pageerror',e=>exceptions.push('owner: '+e.message));
 await ownerPage.route(origin+'/api/**',async route=>{
  const request=route.request(),p=new URL(request.url()).pathname,method=request.method();
  const response=(status,data)=>route.fulfill({status,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify(data)});
  if(method==='OPTIONS')return route.fulfill({status:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type,Authorization'}});
  if(p==='/api/health')return response(200,{ok:true,version:'3.9.0'});
  if(p==='/api/platform/status')return response(200,{setupRequired:false});
  if(p==='/api/platform/me')return ownerAuthorized?response(200,{owner:{name:'Testing owner'}}):response(401,{error:'غير مصرح'});
  if(p==='/api/platform/login'){ownerAuthorized=true;return response(200,{owner:{name:'Testing owner'},sessionToken:'o'.repeat(43)})}
  if(p==='/api/platform/schools')return response(200,{schools:[]});
  if(p==='/api/platform/serials')return response(200,{serials:[]});
  if(p==='/api/platform/google-drive/config'){
   if(!ownerAuthorized)return response(401,{error:'غير مصرح'});
   if(method==='POST'){
    const raw=JSON.parse(request.postData()||'{}');ownerPosts.push(raw);
    ownerGoogleStored=true;return response(200,{configured:true,projectId:'shawahed-school',clientIdSuffix:'usercontent.com',redirectConfigured:false});
   }
   return response(200,{configured:ownerGoogleStored,serverVaultReady:true,projectId:ownerGoogleStored?'shawahed-school':undefined});
  }
  return response(404,{error:'Unmocked owner API '+p});
 });
 await ownerPage.goto(base+'/owner.html',{waitUntil:'domcontentloaded'});
 await ownerPage.locator('#loginUsername').waitFor({state:'visible'});
 assert.equal(await ownerPage.locator('.owner-drive-retry').isVisible(),true,'Owner must have a reconnect button');
 await ownerPage.locator('.owner-drive-retry').click();
 await ownerPage.locator('#loginUsername').fill('ci-owner');
 await ownerPage.locator('#loginPassword').fill('ExampleOnlyPassword#1234');
 await ownerPage.locator('#loginForm button[type=submit]').click();
 await ownerPage.locator('#ownerGoogleDriveSettings').waitFor({state:'visible'});
 const example={web:{project_id:'shawahed-school',client_id:'839613940331-e1356j8bkt407nqndv7kpll0q9ll1s77.apps.googleusercontent.com',client_secret:'CI_SYNTHETIC_ONLY_NOT_REAL',redirect_uris:[]}};
 await ownerPage.locator('#ownerGoogleJson').setInputFiles({name:'oauth-test.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(example))});
 await ownerPage.locator('.owner-drive-summary').waitFor({state:'visible'});
 await ownerPage.locator('.owner-drive-save').click();
 await ownerPage.waitForFunction(()=>document.querySelector('.owner-drive-status')?.textContent.includes('تم حفظ إعداد Google Drive'),null,{timeout:8000});
 assert.equal(ownerPosts.length,1,'Owner must send JSON once to authorized API only');
 assert.equal(ownerPosts[0].web.project_id,'shawahed-school');
 assert.ok(!(await ownerPage.locator('body').innerText()).includes(example.web.client_secret),'Never display imported secret in owner UI');
 await ownerPage.close();
 assert.deepEqual(exceptions,[],'Browser errors: '+exceptions.join('; '));
 console.log('SUCCESS iPhone 390/320 responsive login, unified identity, mobile registration, OTP, activation, password reset, legacy account email confirmation, and standalone PWA manifest');
}finally{
 await browser?.close().catch(()=>{});
 await new Promise(resolve=>server.close(resolve));
}
