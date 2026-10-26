import assert from 'node:assert/strict';
const base='https://school-evidence-v39-api-preview.onrender.com';
async function check(path){
 let error;
 for(let attempt=1;attempt<=6;attempt++){
  try{
   const response=await fetch(base+path,{method:'GET',headers:{Accept:'application/json'},signal:AbortSignal.timeout(20000)});
   const payload=await response.json();
   assert.equal(response.status,200,path+' HTTP status');
   assert.equal(typeof payload,'object');
   return payload;
  }catch(e){error=e;await new Promise(r=>setTimeout(r,4000))}
 }
 throw new Error(path+' failed after cold-start retries: '+String(error));
}
const health=await check('/api/health');
assert.equal(health.ok,true,'API health must report ok');
const status=await check('/api/register/status');
assert.equal(typeof status.emailReady,'boolean','OTP configuration indicator must be boolean');
assert.equal(status.emailReady,true);
assert.deepEqual(Object.keys(status).sort(),['emailReady'],'Public registration status must not reveal sender, test mailbox or API credentials');
assert.equal(status.emailReady,true,'Preview Resend sandbox should be configured; do not log credentials or recipient');
console.log('PASS public API health; email configured:',status.emailReady);
if(status.emailReady)console.log('NOTE configured does not prove OTP mail delivery');

const ui='https://school-evidence-v39-preview.onrender.com';
async function fetchText(path){
 let last;
 for(let retry=0;retry<6;retry++){
  try{
   const response=await fetch(ui+path,{signal:AbortSignal.timeout(20000),cache:'no-store'});
   assert.equal(response.status,200,'PWA resource '+path);
   return response.text();
  }catch(e){last=e;await new Promise(done=>setTimeout(done,4000))}
 }
 throw new Error('PWA request failed '+path+': '+String(last));
}
const serviceWorker=await fetchText('/sw.js');
assert.ok(serviceWorker.includes('school-evidence-pwa-cloud-v3.9.0-owner-drive-20261026-r17'),'PWA cache not updated on live preview');
const authScript=await fetchText('/assets/auth-ui-v39.js');
assert.ok(authScript.includes('إذا كانت بيانات التسجيل متاحة'),'Updated non-enumerating signup copy not deployed');
assert.ok(authScript.includes('auth39-retryConnection'),'Updated login retry action not deployed');
assert.ok(authScript.includes('/profile/password/change')&&authScript.includes('auth39-currentPassword'),'Password change must use current secret, not force email verification');
const mobileScript=await fetchText('/assets/mobile-native-v38.js');
assert.ok(mobileScript.includes('schoolReportMenuGuard'),'Mobile report must dismiss tools menu before showing report');
const documentHtml=await fetchText('/index.html');
assert.ok(documentHtml.includes('جارٍ إعداد التقرير المدرسي')&&documentHtml.includes('إعادة محاولة التقرير'),'Published A4 launch must paint before rendering and show retry on failure');
const releaseData=JSON.parse(await fetchText('/release.json'));
assert.equal(releaseData.version,'v3.9.0-r17','Published release manifest must match displayed build');
const releaseScript=await fetchText('/assets/release-ui-v39.js');
assert.ok(releaseScript.includes("CURRENT='v3.9.0-r17'")&&releaseScript.includes('school-release-badge'),'Published version label must match manifest');
assert.ok(documentHtml.includes('release-ui-v39.js'),'Visible PWA version script not attached to live page');
assert.ok(documentHtml.includes('window.schoolMemberSaving')&&documentHtml.includes('window.schoolPermissionsSaving'),'Deployed team management handlers must be active');
assert.ok(documentHtml.includes('mobile-report-fix-v39.css'),'Deployed school A4 phone layout must be linked');
assert.ok((await fetchText('/assets/mobile-report-fix-v39.css')).includes('#formalPrintableDocument'),'Published responsive report CSS missing');
assert.ok(documentHtml.includes('id="schoolReportSavePdf"')&&documentHtml.includes('school-report-export-v39.js'),'Real PDF save control not deployed');
assert.ok((await fetchText('/assets/school-report-export-v39.js')).includes('getPageMetrics'),'PDF A4 layout parity data missing');
assert.ok((await fetchText('/assets/school-report-a4-preview-v39.js')).includes('school-a4-sheet'),'A4 scaled preview is not deployed');
assert.ok((await fetchText('/assets/school-report-a4-preview-v39.css')).includes('210mm'),'Matching A4 layout styles are missing');
assert.ok(documentHtml.includes('schoolReportToggleView'),'Phone/A4 preview toggle not in deployed HTML');
assert.ok(documentHtml.includes('repOptMainCover')&&documentHtml.includes('template.updateIndexPageNumbers(docContainer)'),'Published report cover and TOC integration missing');
assert.ok(documentHtml.includes('mobile-connectivity-ux-v39.js'),'Connectivity UX script not loaded');
assert.ok(documentHtml.includes('black-translucent')&&documentHtml.includes('name="theme-color"'),'iPhone opaque header metadata missing');
assert.ok((await fetchText('/assets/mobile-connectivity-ux-v39.js')).includes('schoolConnectivityPanel'),'Connectivity screen asset not deployed');
assert.ok((await fetchText('/assets/mobile-connectivity-ux-v39.css')).includes('school-connect-sheet'),'Connectivity UI CSS not deployed');
assert.ok((await fetchText('/assets/school-report-cover-v39.js')).includes('ShawahedReportDesign'),'Report designer script not on live service');
assert.ok((await fetchText('/assets/school-report-cover-v39.css')).includes('.shd-cover'),'Institutional report CSS not served');
assert.ok(documentHtml.includes('school-mobile-menu-ux-v39.js'),'RTL grouped mobile menu not loaded');
assert.ok((await fetchText('/assets/school-mobile-menu-ux-v39.js')).includes('school-menu-account'),'Mobile account section missing');
assert.ok((await fetchText('/assets/school-mobile-menu-ux-v39.css')).includes('school-menu-action'),'Mobile menu UX stylesheet missing');
for(const asset of ['/assets/school-report-export-v39.js','/assets/school-report-rtl-v39.css','/assets/html2canvas-pro-v2.4.5.min.js','/assets/pdf-lib-v1.17.1.min.js'])assert.ok((await fetchText(asset)).length>100,'Missing PDF asset '+asset);
const ownerHtml=await fetchText('/owner.html');
assert.ok(ownerHtml.includes('owner-google-ui-v39.js'),'Owner settings UI must be present in deployed preview');
assert.ok(ownerHtml.includes('owner-connect-20261023-r11'),'Owner HTML must load fresh cache-busted API and OAuth scripts');
const ownerScript=await fetchText('/assets/owner-google-ui-v39.js');
assert.ok(ownerScript.includes('ownerGoogleJson')&&ownerScript.includes('إعادة الاتصال بالخادم'),'Owner import and reconnect UI must be deployed');
assert.ok(ownerScript.includes('owner-r11')&&ownerScript.includes('جارٍ فحص الاتصال'),'Owner must expose build identity and bounded reconnect probes');
const reportScript=await fetchText('/assets/evidence-workspace.js');
assert.ok(reportScript.includes('host.contains(report)')&&reportScript.includes('document.body.appendChild(report)'),'The published report is still nested inside the hidden evidence workspace');
console.log('PASS live PWA cache and privacy signup copy');

async function unauthenticated(path){
 const r=await fetch(base+path,{method:'GET',headers:{Accept:'application/json'},signal:AbortSignal.timeout(20000)});
 assert.ok([401,403,404].includes(r.status),path+' returned '+r.status+' without authentication');
 return r.status;
}
// These requests intentionally do not include accounts, passwords, session cookies or write methods.
for(const route of ['/api/me','/api/data','/api/members','/api/platform/me','/api/platform/google-drive','/api/evidences']){
 await unauthenticated(route);
}
const hostileOrigin='https://untrusted-school-client.invalid';
const preflight=await fetch(base+'/api/me',{method:'OPTIONS',headers:{Origin:hostileOrigin,'Access-Control-Request-Method':'GET','Access-Control-Request-Headers':'authorization'},signal:AbortSignal.timeout(20000)});
assert.notEqual(preflight.headers.get('access-control-allow-origin'),hostileOrigin,'Untrusted site gained cross-origin access');
assert.notEqual(preflight.headers.get('access-control-allow-origin'),'*','Never grant credentialed endpoints wildcard origin');
const trustedOrigin='https://school-evidence-v39-preview.onrender.com';
const trusted=await fetch(base+'/api/me',{method:'OPTIONS',headers:{Origin:trustedOrigin,'Access-Control-Request-Method':'GET','Access-Control-Request-Headers':'authorization'},signal:AbortSignal.timeout(20000)});
assert.equal(trusted.headers.get('access-control-allow-origin'),trustedOrigin,'Official preview origin must be allowed');
console.log('PASS live unauthorized API routes and strict CORS (read-only)');
