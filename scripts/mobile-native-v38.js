/* School Evidence mobile navigation v3.8 — presentation only; permissions stay on API. */
(()=>{'use strict';
const pages=[
 ['schoolProfileModal','بيانات المدرسة','closeSchoolProfileModal'],
 ['cropperModal','تعديل شعار المدرسة','closeCropperModal'],
 ['teamModal','اللجان والفرق','closeTeamModal'],
 ['qrModal','رمز QR','closeQrModal'],
 ['bulkQrModal','ملصقات QR','closeBulkQrModal'],
 ['officialReportModal','التقرير الرسمي','closeOfficialReportModal'],
 ['previewModal','معاينة الشاهد','closePreviewModal'],
 ['sectionMembersModal','صلاحيات القسم','closeSectionMembersModal'],
 ['evidenceShareModal','مشاركة الشاهد','closeEvidenceShare'],
 ['evidenceModal','شواهد البند','closeModal']
];
const mobile=()=>matchMedia('(max-width:767px)').matches;
const registered=new Map();const visible=new Set();let onPop=false;
function closePage(id){
 const item=registered.get(id);if(!item)return;
 const fn=window[item.fn];
 // Some legacy close handlers are scoped or only update application state.
 // Never leave a full-screen dialog trapping the user after a back/cancel tap.
 if(typeof fn==='function'){
  try{fn()}catch(error){console.error('School screen close failed',error)}
 }
 if(!item.el.classList.contains('hidden')&&getComputedStyle(item.el).display!=='none'){
  item.el.classList.add('hidden');
 }
 refresh();
}
function refresh(){
 const active=[];
 for(const [id,item] of registered){
  const e=item.el, isVisible=!e.classList.contains('hidden')&&getComputedStyle(e).display!=='none'&&e.getClientRects().length>0;
  if(isVisible){
   active.push(id);
   if(!visible.has(id)){
    visible.add(id);
    if(mobile()&&!onPop){history.pushState({...history.state,schoolMobilePage:id},'');}
    if(mobile())requestAnimationFrame(()=>item.back.focus({preventScroll:true}));
   }
  }else if(visible.delete(id)&&mobile()&&!onPop&&history.state?.schoolMobilePage===id){
   history.back();
  }
 }
 document.body.classList.toggle('school-screen-open',mobile()&&active.length>0);
 // The report remains part of the application, not a screen that hides all app navigation.
 const reportOpen=mobile()&&active.includes('officialReportModal');
 document.body.classList.toggle('school-report-open',reportOpen);
 if(reportOpen){
  const topRect=document.getElementById('appHeader')?.getBoundingClientRect();
  const bottomRect=document.querySelector('.mobile-bottom-nav')?.getBoundingClientRect();
  // Bound the available chrome dimensions: legacy header wrappers can span the page.
  const top=topRect?.height>0?Math.min(96,Math.max(0,Math.ceil(topRect.bottom))):66;
  const bottom=bottomRect?.height>0?Math.min(90,Math.max(0,Math.ceil(window.innerHeight-bottomRect.top))):68;
  document.body.style.setProperty('--school-report-top',top+'px');
  document.body.style.setProperty('--school-report-bottom',bottom+'px');
 }else{
  document.body.style.removeProperty('--school-report-top');
  document.body.style.removeProperty('--school-report-bottom');
 }
 active.forEach((id,i)=>{const e=registered.get(id).el,next=String(105+i);if(e.style.getPropertyValue('--school-screen-layer')!==next)e.style.setProperty('--school-screen-layer',next)});
}
function setup(){
 for(const [id,title,fn] of pages){
  const el=document.getElementById(id);
  // An inline evidence workspace must stay inline, not be transformed into a screen.
  if(!el||!el.classList.contains('fixed')||registered.has(id))continue;
  el.classList.add('school-native-screen');
  el.removeAttribute('aria-modal');
  el.setAttribute('role','region');
  el.setAttribute('aria-label',title);
  const header=document.createElement('div');header.className='school-native-bar';
  const back=document.createElement('button');back.type='button';back.className='school-native-back';
  back.setAttribute('aria-label','الرجوع من '+title);
  back.textContent='‹ رجوع';back.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();closePage(id)});
  const label=document.createElement('span');label.className='school-native-title';label.textContent=title;
  header.append(back,label);el.insertBefore(header,el.firstChild);
  // Make the legacy X/close affordance use the same reliable navigation path.
  el.addEventListener('click',event=>{
   const control=event.target.closest?.('button,[role="button"]');
   if(!control||control===back)return;
   const handler=control.getAttribute('onclick')||'';
   if(!handler.includes(fn+'('))return;
   event.preventDefault();event.stopImmediatePropagation();closePage(id);
  },true);
  registered.set(id,{el,fn,back});
  new MutationObserver(refresh).observe(el,{attributes:true,attributeFilter:['class','style']});
 }
 refresh();
}
window.addEventListener('popstate',event=>{
 const top=[...registered].filter(([,v])=>visible.has(v.el.id)).at(-1);
 if(!top||!mobile())return;
 if(event.state?.schoolMobilePage===top[0])return;
 onPop=true;closePage(top[0]);queueMicrotask(()=>{onPop=false;refresh()});
});
window.addEventListener('resize',refresh,{passive:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();

let current=null;
function finish(answer){
 if(!current)return;
 const {shell,resolve,prior}=current;current=null;shell.remove();document.body.classList.remove('school-sheet-open');
 if(prior?.focus)prior.focus({preventScroll:true});
 resolve(answer);
}
function sheet(message,{input=false,placeholder=''}={}){
 if(current)finish(null);
 return new Promise(resolve=>{
  const shell=document.createElement('div');shell.className='school-native-sheet-backdrop';shell.dir='rtl';
  const panel=document.createElement('section');panel.className='school-native-sheet';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label',input?'إدخال البيانات':'تأكيد العملية');
  const handle=document.createElement('div');handle.className='school-native-handle';panel.append(handle);
  const title=document.createElement('h2');title.textContent=input?'إدخال البيانات':'تأكيد العملية';panel.append(title);
  const p=document.createElement('p');p.textContent=message;panel.append(p);
  let field;
  if(input){field=document.createElement('input');field.type='text';field.autocomplete='off';field.placeholder=placeholder;field.value=placeholder;field.className='school-native-field';field.addEventListener('keydown',e=>{if(e.key==='Enter')finish(field.value.trim())});panel.append(field)}
  const actions=document.createElement('div');actions.className='school-native-actions';
  const cancel=document.createElement('button');cancel.type='button';cancel.className='school-native-cancel';cancel.textContent='إلغاء';cancel.addEventListener('click',()=>finish(input?null:false));
  const yes=document.createElement('button');yes.type='button';yes.className='school-native-accept';yes.textContent=input?'متابعة':'تأكيد';yes.addEventListener('click',()=>finish(input?field.value.trim():true));
  actions.append(cancel,yes);panel.append(actions);shell.append(panel);shell.addEventListener('click',e=>{if(e.target===shell)finish(input?null:false)});
  document.body.append(shell);document.body.classList.add('school-sheet-open');
  current={shell,resolve,prior:document.activeElement};
  requestAnimationFrame(()=>(field||cancel).focus({preventScroll:true}));
 });
}
window.schoolMobileConfirm=message=>sheet(message);
window.schoolMobilePrompt=(message,placeholder='')=>sheet(message,{input:true,placeholder});
window.schoolMobileCopyFallback=async value=>{
 try{if(navigator.clipboard){await navigator.clipboard.writeText(value);return}}catch{}
 await sheet('حدد الرابط وانسخه يدويًا من الحقل التالي.',{input:true,placeholder:value});
};
window.addEventListener('keydown',e=>{
 if(e.key==='Escape'&&current){e.preventDefault();finish(false);return}
 if(e.key==='Escape'&&mobile()){
  const top=[...registered].filter(([id])=>visible.has(id)).at(-1);if(top)closePage(top[0]);
 }
});
})();