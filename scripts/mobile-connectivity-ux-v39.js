/* School Evidence v3.9 r17 — Arabic-first connectivity UX.
 * No fabricated offline upload queue: writes remain server-authoritative and
 * offline use is read-only within an authenticated, already-loaded session.
 */
(()=>{'use strict';
const header=document.getElementById('appHeader');
const login=document.getElementById('loginScreenOverlay');
const source=document.getElementById('licenseBanner');
if(!header||!login)return;
const api=window.SchoolBridge;
const KEY='shawahed_connectivity_preference_v1';
const modes=['auto','online','offline'];
let mode='auto',checking=false,lastSuccess=null,lastCheck=null,reachable=navigator.onLine,started=false,manualSyncing=false;
try{const value=localStorage.getItem(KEY);if(modes.includes(value))mode=value}catch{}
const hasSession=()=>login.classList.contains('hidden')&&!!api?.token?.();
const effectiveOffline=()=>hasSession()&&(mode==='offline'||!navigator.onLine);
const saveAllowed=()=>hasSession()&&!effectiveOffline();
function create(tag,cls,txt){const e=document.createElement(tag);if(cls)e.className=cls;if(txt!==undefined)e.textContent=txt;return e}
function glyph(kind){const paths={
 cloud:'<path d="M6 17h12a4 4 0 0 0 1-7.9A7 7 0 0 0 5.4 8 4.5 4.5 0 0 0 6 17z"/>',
 refresh:'<path d="M20 7v5h-5M4 17v-5h5"/><path d="M5 9a7.5 7.5 0 0 1 13-2l2 5M19 15a7.5 7.5 0 0 1-13 2l-2-5"/>',
 wifi:'<path d="M2 8a16 16 0 0 1 20 0M5 11.5a11 11 0 0 1 14 0M8.5 15a5 5 0 0 1 7 0"/><circle cx="12" cy="19" r="1" fill="currentColor" stroke="none"/>',
 lock:'<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
 info:'<circle cx="12" cy="12" r="10"/><path d="M12 11v6M12 7h.01"/>',
 arrow:'<path d="m15 18-6-6 6-6"/>'
};const s=document.createElementNS('http://www.w3.org/2000/svg','svg');s.setAttribute('viewBox','0 0 24 24');s.setAttribute('width','19');s.setAttribute('height','19');s.setAttribute('fill','none');s.setAttribute('stroke','currentColor');s.setAttribute('stroke-width','1.9');s.setAttribute('stroke-linecap','round');s.setAttribute('stroke-linejoin','round');s.innerHTML=paths[kind]||paths.info;return s}
const openButton=create('button','school-connection-pill no-print');
openButton.id='schoolConnectivityOpen';openButton.type='button';openButton.setAttribute('aria-haspopup','dialog');openButton.setAttribute('aria-controls','schoolConnectivityPanel');openButton.append(glyph('wifi'),create('span','school-connection-pill-text','الاتصال'));
header.querySelector('.app-brand')?.append(openButton);
const overlay=create('div','school-connect-overlay');overlay.id='schoolConnectivityPanel';
overlay.setAttribute('dir','rtl');overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-labelledby','schoolConnectTitle');overlay.hidden=true;
overlay.innerHTML='<section class="school-connect-sheet"><header class="school-connect-head"><button id="schoolConnectBack" type="button" aria-label="إغلاق صفحة الاتصال" class="school-connect-back"></button><div><p class="school-connect-eyebrow">إعدادات المدرسة</p><h2 id="schoolConnectTitle">الاتصال والمزامنة</h2></div><span class="school-connect-head-glyph" aria-hidden="true"></span></header>'+
'<div class="school-connect-scroll"><section class="school-connect-overview"><div class="school-connect-overview-top"><span id="schoolConnectSignal" class="school-connect-signal">جارٍ التحقق</span><small id="schoolConnectLast">آخر تحديث: —</small></div><h3 id="schoolConnectHeadline">حالة الاتصال</h3><p id="schoolConnectDescription"></p></section>'+
'<section class="school-connect-section"><h3>وضع التشغيل</h3><p class="school-connect-hint">اختر طريقة التعامل مع الاتصال بهذا الجهاز.</p><div id="schoolConnectModes" class="school-connect-modes" role="group" aria-label="وضع التشغيل">'+
'<button type="button" data-mode="auto" aria-pressed="false"><b>تلقائي</b><small>بحسب توفر الاتصال</small></button>'+
'<button type="button" data-mode="online" aria-pressed="false"><b>متصل</b><small>التحديث من السحابة</small></button>'+
'<button type="button" data-mode="offline" aria-pressed="false"><b>دون اتصال</b><small>قراءة ما تم تحميله</small></button></div></section>'+
'<section class="school-connect-section school-connect-sync"><h3>مزامنة البيانات</h3><div class="school-connect-summary"><div class="school-connect-summary-icon" id="schoolConnectSummaryIcon"></div><div><strong id="schoolConnectQueue">لا توجد تعديلات محلية جاهزة للنشر</strong><small id="schoolConnectQueueHint">يتم حفظ التعديلات على الخادم عند تنفيذها أثناء الاتصال.</small></div></div>'+
'<button type="button" class="school-connect-primary" id="schoolConnectSync"><span class="school-connect-primary-icon"></span><span id="schoolConnectSyncText">مزامنة الآن</span></button><p id="schoolConnectFeedback" role="status" aria-live="polite" class="school-connect-feedback"></p></section>'+
'<section class="school-connect-section school-connect-license"><h3>الترخيص</h3><div id="schoolConnectLicenseHost"><p class="school-connect-hint">حالة الترخيص تُحدّث بعد الاتصال.</p></div></section>'+
'<div class="school-connect-security"><span id="schoolConnectLock"></span><p><strong>حماية البيانات</strong><span>أثناء العمل دون اتصال يمكنك مراجعة البيانات المحمّلة في الجلسة الحالية. لا تُحفظ تعديلات أو ملفات محليًا تلقائيًا، ويستلزم الدخول مجددًا والمزامنة اتصالًا صالحًا.</span></p></div></div></section>';
document.body.append(overlay);
const back=overlay.querySelector('#schoolConnectBack');back.append(glyph('arrow'));
overlay.querySelector('.school-connect-head-glyph').append(glyph('cloud'));
overlay.querySelector('#schoolConnectSummaryIcon').append(glyph('refresh'));
overlay.querySelector('.school-connect-primary-icon').append(glyph('refresh'));
overlay.querySelector('#schoolConnectLock').append(glyph('lock'));
const feedback=overlay.querySelector('#schoolConnectFeedback');
const button=overlay.querySelector('#schoolConnectSync');
const licenseHost=overlay.querySelector('#schoolConnectLicenseHost');
if(source){source.classList.add('school-connect-license-original');licenseHost.replaceChildren(source)}
document.getElementById('storageNotice')?.remove();
const close=()=>{overlay.hidden=true;document.body.classList.remove('school-connect-open');openButton.focus({preventScroll:true})};
function open(){
 if(!hasSession())return;
 overlay.hidden=false;document.body.classList.add('school-connect-open');render();
 back.focus({preventScroll:true});
 // Refresh displayed status only; never send evidence/permissions in the background.
 if(!effectiveOffline())void probe();
}
function formatDate(d){return d?new Intl.DateTimeFormat('ar-SA',{hour:'2-digit',minute:'2-digit',day:'numeric',month:'short'}).format(d):'—'}
function render(){
 const signed=hasSession(),offline=effectiveOffline(),connected=!offline&&reachable,waiting=checking||manualSyncing;
 let caption='غير متصل',headline='وضع دون اتصال',description='يمكنك استعراض البيانات التي حمّلتها خلال هذه الجلسة. لن تُرسل أي تغييرات.';
 if(mode==='offline'){caption='دون اتصال';description='أوقفت الاتصال بالخادم لهذا الجهاز. التعديل والحفظ يتطلبان اختيار «تلقائي» أو «متصل» وتوفر الإنترنت.'}
 else if(!navigator.onLine){caption='لا يوجد إنترنت';description='لم يتم اكتشاف اتصال بالشبكة. تظهر البيانات المحمّلة فقط، دون إرسال أي تعديل.'}
 else if(!reachable){caption='بانتظار الاتصال';headline='الخدمة غير متاحة';description='يتوفر اتصال بالشبكة، لكن لم نتمكن من التحقق من خدمة المدرسة بعد.'}
 else{caption=mode==='auto'?'متصل تلقائيًا':'متصل';headline='البيانات متاحة عبر الإنترنت';description='يمكنك العمل وحفظ التعديلات عبر الخادم وفق صلاحيات حسابك.'}
 openButton.classList.toggle('school-connection-offline',offline||!reachable);
 openButton.classList.toggle('school-connection-loading',waiting);
 openButton.querySelector('.school-connection-pill-text').textContent=offline?'دون اتصال':reachable?'متصل':'التحقق';
 overlay.querySelector('#schoolConnectSignal').textContent=caption;
 overlay.querySelector('#schoolConnectSignal').dataset.status=(offline||!reachable)?'offline':'online';
 overlay.querySelector('#schoolConnectHeadline').textContent=headline;
 overlay.querySelector('#schoolConnectDescription').textContent=description;
 overlay.querySelector('#schoolConnectLast').textContent='آخر تحديث: '+formatDate(lastSuccess);
 for(const control of overlay.querySelectorAll('[data-mode]'))control.setAttribute('aria-pressed',String(control.dataset.mode===mode));
 button.disabled=!signed||offline||waiting;
 overlay.querySelector('#schoolConnectSyncText').textContent=waiting?'جارٍ التحديث…':'مزامنة الآن';
 overlay.querySelector('#schoolConnectQueue').textContent='لا توجد تعديلات محلية جاهزة للنشر';
 if(!signed)button.disabled=true;
}
async function probe(){
 if(checking||!navigator.onLine||mode==='offline'||!hasSession())return;
 checking=true;render();
 try{
  const result=await api.request('/health');
  reachable=!!result?.ok;lastCheck=new Date();
 }catch{reachable=false;lastCheck=new Date()}
 finally{checking=false;render()}
}
async function sync(){
 if(manualSyncing||!hasSession())return;
 if(effectiveOffline()){feedback.textContent='للتحديث اختر «تلقائي» أو «متصل» وتأكد من توفر الإنترنت.';return}
 manualSyncing=true;feedback.textContent='نتحقق من أحدث بيانات المدرسة…';render();
 try{
  if(typeof window.cloudReload!=='function')throw new Error('تعذر الوصول إلى تحديث بيانات المدرسة.');
  await window.cloudReload();
  reachable=true;lastSuccess=new Date();feedback.textContent='تم تحديث بيانات المدرسة من الخادم بنجاح. لا توجد تغييرات محلية للنشر.';
 }catch(error){reachable=false;feedback.textContent='تعذّر التحديث: '+(error?.message||'الرجاء إعادة المحاولة عند توفر الاتصال.')}
 finally{manualSyncing=false;render()}
}
for(const btn of overlay.querySelectorAll('[data-mode]'))btn.addEventListener('click',()=>{
 const next=btn.dataset.mode;if(!modes.includes(next))return;
 mode=next;try{localStorage.setItem(KEY,next)}catch{}
 feedback.textContent=next==='offline'?'تم تفعيل وضع القراءة دون اتصال. لن تُرسل تعديلات إلى الخادم.':'تم تغيير الوضع. يمكنك تحديث بيانات المدرسة عند توفر الاتصال.';
 reachable=navigator.onLine;render();if(!effectiveOffline())void probe();
});
openButton.addEventListener('click',open);back.addEventListener('click',close);
overlay.addEventListener('click',e=>{if(e.target===overlay)close()});
button.addEventListener('click',()=>void sync());
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&!overlay.hidden){e.preventDefault();close()}});
window.addEventListener('online',()=>{reachable=true;render();if(!effectiveOffline())void probe()});
window.addEventListener('offline',()=>{reachable=false;render()});
new MutationObserver(()=>{render();if(hasSession()&&!started){started=true;reachable=navigator.onLine;if(!effectiveOffline())void probe()}else if(!hasSession())started=false}).observe(login,{attributes:true,attributeFilter:['class']});
window.SchoolConnectivityUX={
 getMode:()=>mode,getOnlineStatus:()=>({mode,reachable,effectiveOffline:effectiveOffline(),hasSession:hasSession()}),
 open,close,refresh:render,request(path,options={}){
  const method=String(options.method||'GET').toUpperCase();
  if(path==='/logout'&&effectiveOffline()){api.clear();return Promise.resolve({});}
  if(!['GET','HEAD'].includes(method)&&effectiveOffline()){
   return Promise.reject(new Error('وضع دون اتصال: لم تُحفظ التعديلات. اختر وضع «متصل» أو «تلقائي» للمحاولة من جديد.'));
  }
  return api.request(path,options);
 }
};
render();
})();