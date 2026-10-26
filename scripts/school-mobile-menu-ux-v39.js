/* School Evidence: responsive, Arabic-first tools menu.
 * Reparents the six ORIGINAL action controls rather than cloning them, so their
 * click handlers, permission visibility, file picker and dynamic labels survive.
 * Desktop order and markup are restored on breakpoint exit. */
(()=>{'use strict';
const menu=document.getElementById('headerTools');
const toggle=document.getElementById('mobileMenuToggle');
const header=document.getElementById('appHeader');
if(!menu||!toggle||!header)return;
const query=window.matchMedia('(max-width:767px)');
const originals=Array.from(menu.children);
const actions={
 school:originals.find(x=>x.getAttribute('onclick')?.includes('openSchoolProfileModal()')),
 members:originals.find(x=>x.getAttribute('onclick')?.includes('openTeamModal()')),
 report:originals.find(x=>x.getAttribute('onclick')?.includes('openOfficialReportModal()')),
 qr:originals.find(x=>x.getAttribute('onclick')?.includes('openBulkQrModal()')),
 export:originals.find(x=>x.getAttribute('onclick')?.includes('exportJSONBackup()')),
 import:originals.find(x=>x.matches('label')&&x.querySelector('#importJsonInput')),
 account:originals.find(x=>x.querySelector('#currentUserHeaderName,#currentUserHeaderRole')),
 email:originals.find(x=>x.id==='auth39-link-email-action'),
 password:originals.find(x=>x.id==='auth39-change-password-action'),
 updates:originals.find(x=>x.classList.contains('school-release-tools'))
};
const required=['school','members','report','qr','export','import','account'];
if(originals.length<7||required.some(k=>!actions[k])||new Set(required.map(k=>actions[k])).size!==7){
 console.warn('Menu structure differs from expected; keep original toolbar instead of damaging navigation');
 return;
}
const toTag=(name,className,text)=>{
 const e=document.createElement(name);e.className=className;if(text)e.textContent=text;return e;
};
let built=false,menuHead,menuClose,scroll,accountSection,importLabelText;
function createGroup(title,subtitle,items){
 const section=toTag('section','school-menu-group');
 section.setAttribute('aria-label',title);
 section.append(toTag('h3','school-menu-group-title',title));
 if(subtitle)section.append(toTag('p','school-menu-group-subtitle',subtitle));
 for(const action of items){
  if(!action.querySelector('i')&&action.matches('button')){
   const icon=toTag('i','fa-solid '+(action.id==='auth39-change-password-action'?'fa-lock':'fa-envelope'));
   icon.setAttribute('aria-hidden','true');action.prepend(icon);
  }
  action.classList.add('school-menu-action');
  action.setAttribute('dir','rtl');
  section.append(action);
 }
 return section;
}
function build(){
 if(built)return;
 built=true;
 menu.classList.add('school-tools-upgraded');
 // Explicit mobile-only flex axis prevents legacy .app-toolbar !important layout rules
 // from placing grouped sections side-by-side outside the viewport.
 // Display is controlled by mobile-menu-open CSS; do not keep the closed panel over dialogs.
 menu.style.setProperty('flex-direction','column','important');
 // Tailwind flex-wrap from the original header was wrapping tall menu sections into invisible RTL columns.
 menu.style.setProperty('flex-wrap','nowrap','important');
 menu.style.setProperty('align-items','stretch','important');
 menu.style.setProperty('justify-content','flex-start','important');
 menu.setAttribute('dir','rtl');menu.setAttribute('role','region');
 menu.setAttribute('aria-label','قائمة أدوات المدرسة');
 menu.setAttribute('tabindex','-1');
 menuHead=toTag('div','school-menu-heading');
 const titleBox=toTag('div','school-menu-heading-copy');
 titleBox.append(toTag('h2','school-menu-title','القائمة'));
 titleBox.append(toTag('p','school-menu-caption','إدارة المدرسة والأدوات'));
 menuClose=toTag('button','school-menu-close','×');
 menuClose.type='button';menuClose.setAttribute('aria-label','إغلاق القائمة');
 menuClose.addEventListener('click',event=>{
  event.preventDefault();event.stopPropagation();
  window.closeMobileTools?.();
  toggle.focus({preventScroll:true});
 });
 menuHead.append(titleBox,menuClose);
 scroll=toTag('nav','school-menu-scroll');
 scroll.setAttribute('aria-label','الأقسام والأدوات');
 scroll.append(
  createGroup('الإدارة المدرسية','إعدادات المدرسة والأعضاء',[actions.school,actions.members]),
  createGroup('التقارير والأدوات','التقارير وملصقات الشواهد',[actions.report,actions.qr]),
  createGroup('البيانات والنسخ','تصدير البيانات واستيرادها',[actions.export,actions.import])
 );
 // Keep all dynamically injected login/security/update controls: never drop features.
 const optional=[actions.email,actions.password,actions.updates].filter(Boolean);
 const mapped=new Set(Object.values(actions).filter(Boolean));
 const other=originals.filter(x=>!mapped.has(x));
 if(optional.length)scroll.append(createGroup('الحساب والأمان','التحقق والأمان والتحديثات',optional));
 if(other.length)scroll.append(createGroup('خيارات أخرى','أدوات إضافية متاحة لحسابك',other));
 actions.import.setAttribute('tabindex','0');
 actions.import.setAttribute('role','button');
 actions.import.setAttribute('aria-label','استيراد بيانات من ملف JSON');
 actions.import.addEventListener('keydown',event=>{
  if(event.key==='Enter'||event.key===' '){
   event.preventDefault();actions.import.querySelector('#importJsonInput')?.click();
  }
 });
 accountSection=toTag('section','school-menu-account');
 accountSection.setAttribute('aria-label','الحساب الحالي');
 accountSection.append(toTag('h3','school-menu-group-title','الحساب'));
 const user=actions.account;
 user.classList.add('school-menu-current-user');
 const logout=user.querySelector('button[onclick*="logoutSession"]');
 if(logout){
  logout.classList.add('school-menu-logout');
  logout.setAttribute('aria-label','تسجيل الخروج');
  logout.setAttribute('title','تسجيل الخروج');
  logout.append(toTag('span','school-menu-logout-text','خروج'));
 }
 accountSection.append(user);
 menu.replaceChildren(menuHead,scroll,accountSection);
}
function restore(){
 if(!built)return;
 menu.replaceChildren(...originals);
 menu.removeAttribute('dir');menu.removeAttribute('role');
 menu.removeAttribute('aria-label');menu.removeAttribute('tabindex');
 menu.classList.remove('school-tools-upgraded');
 for(const k of ['display','flex-direction','flex-wrap','align-items','justify-content'])menu.style.removeProperty(k);
 for(const e of originals){e.classList.remove('school-menu-action','school-menu-current-user');e.removeAttribute('dir')}
 built=false;
}
function position(){
 if(!query.matches||!built)return;
 const r=header.getBoundingClientRect();
 // Header can grow with school names: never overlap active controls.
 const top=Math.max(0,Math.min(window.innerHeight-160,Math.round(r.bottom)));
 document.documentElement.style.setProperty('--school-tools-top',top+'px');
}
let wasOpen=false;
function stateChanged(){
 if(!query.matches){wasOpen=false;document.documentElement.style.removeProperty('--school-tools-top');return}
 const open=document.body.classList.contains('mobile-menu-open');
 if(open){
  position();if(!wasOpen){scroll.scrollTop=0;requestAnimationFrame(()=>menuClose.focus({preventScroll:true}))}
 }
 wasOpen=open;
}
function sync(){
 if(query.matches)build();
 else {
  if(document.body.classList.contains('mobile-menu-open'))window.closeMobileTools?.();
  restore();document.documentElement.style.removeProperty('--school-tools-top');
 }
 stateChanged();
}
query.addEventListener?.('change',sync);
window.addEventListener('resize',()=>{sync();position()},{passive:true});
window.addEventListener('orientationchange',()=>requestAnimationFrame(position),{passive:true});
new MutationObserver(stateChanged).observe(document.body,{attributes:true,attributeFilter:['class']});
window.addEventListener('keydown',event=>{
 if(!query.matches||!document.body.classList.contains('mobile-menu-open'))return;
 if(event.key==='Escape'){
  event.preventDefault();window.closeMobileTools?.();toggle.focus({preventScroll:true});return;
 }
 if(event.key!=='Tab')return;
 const focusables=[...menu.querySelectorAll('button:not([disabled]),label[tabindex="0"]')]
  .filter(e=>getComputedStyle(e).display!=='none'&&getComputedStyle(e).visibility!=='hidden'&&e.getClientRects().length);
 if(!focusables.length)return;
 const first=focusables[0],last=focusables[focusables.length-1];
 if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}
 else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
});
sync();
window.SchoolToolsMenuUX={getItems:()=>Object.fromEntries(Object.entries(actions).map(([k,v])=>[k,v.textContent.trim()])),restore,refresh:sync};
})();