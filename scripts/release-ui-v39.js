/* School Evidence v3.9 preview release identity. Public UI only; no credentials. */
(()=>{'use strict';
const CURRENT='v3.9.0-r9';
const badgeText='الإصدار '+CURRENT;
let latest=CURRENT;
let checking=false,updating=false;
const statusNodes=[];
const buttons=[];
function node(tag,className,text){
 const element=document.createElement(tag);if(className)element.className=className;
 if(text)element.textContent=text;return element;
}
function status(text){
 for(const element of statusNodes)element.textContent=text;
}
function badge(parent){
 const b=node('span','school-release-badge',badgeText);b.setAttribute('data-school-release',CURRENT);
 b.setAttribute('aria-label','رقم إصدار منصة الشواهد '+CURRENT);parent.appendChild(b);return b;
}
function button(parent){
 const b=node('button','school-release-check','التحقق من التحديث');
 b.type='button';b.setAttribute('aria-label','التحقق من تحديث منصة الشواهد');
 b.addEventListener('click',()=>{
  if(latest!==CURRENT)installUpdate();else checkUpdate(true);
 });
 parent.appendChild(b);buttons.push(b);return b;
}
function controls(parent){
 const wrap=node('div','school-release-controls');
 badge(wrap);button(wrap);
 const caption=node('span','school-release-status','');caption.setAttribute('role','status');
 caption.setAttribute('aria-live','polite');wrap.appendChild(caption);statusNodes.push(caption);
 parent.appendChild(wrap);
}
const loginHead=document.querySelector('#authV39Shell .auth39-head');
if(loginHead)controls(loginHead);
const heading=document.querySelector('#appHeader h1');
if(heading){
 const version=node('span','school-release-header',badgeText);
 version.setAttribute('data-school-release',CURRENT);version.setAttribute('aria-label',badgeText);
 heading.insertAdjacentElement('afterend',version);
}
const toolbar=document.getElementById('headerTools');
if(toolbar){
 const tools=node('div','school-release-tools');
 button(tools);
 const message=node('span','school-release-tools-status','');
 message.setAttribute('role','status');message.setAttribute('aria-live','polite');
 tools.appendChild(message);statusNodes.push(message);
 toolbar.appendChild(tools);
}
function setAvailable(available){
 for(const b of buttons)b.textContent=available?'تثبيت التحديث '+latest:'التحقق من التحديث';
}
async function checkUpdate(manual=false){
 if(checking||updating)return;
 checking=true;
 if(manual)status('جارٍ التحقق من الإصدار...');
 try{
  // A unique URL avoids the old cache-first worker serving a stale release file.
  const url=new URL('./release.json',document.baseURI);
  url.searchParams.set('check',String(Date.now()));
  const response=await fetch(url.href,{cache:'no-store',credentials:'omit'});
  if(!response.ok)throw new Error('تعذّر جلب رقم الإصدار');
  const data=await response.json();
  if(!data||typeof data.version!=='string'||!/^v3\.9\.0-r\d{1,3}$/.test(data.version))throw new Error('بيانات الإصدار غير صالحة');
  latest=data.version;
  setAvailable(latest!==CURRENT);
  if(latest!==CURRENT)status('تحديث متاح: '+latest);
  else if(manual)status('أنت تستخدم أحدث إصدار: '+CURRENT);
  else status('');
 }catch(error){
  if(manual)status('تعذّر التحقق من التحديث. حاول مرة أخرى عند توفر الإنترنت.');
 }finally{checking=false}
}
async function installUpdate(){
 if(updating)return;
 updating=true;
 for(const b of buttons)b.disabled=true;
 status('جارٍ تثبيت '+latest+'...');
 try{
  if(!('serviceWorker' in navigator))throw new Error('تعذّر تحديث التطبيق في المتصفح');
  const registration=await navigator.serviceWorker.getRegistration();
  if(!registration)throw new Error('ثبّت التطبيق أو أعد فتحه في Safari');
  let changed=false;
  const onChange=()=>{
   if(changed)return;
   changed=true;
   window.location.reload();
  };
  navigator.serviceWorker.addEventListener('controllerchange',onChange,{once:true});
  const activate=()=>{
   if(registration.waiting){registration.waiting.postMessage({type:'SKIP_WAITING'});return true}
   return false;
  };
  await registration.update();
  if(!activate()){
   if(registration.installing){
    const pending=registration.installing;
    pending.addEventListener('statechange',()=>{if(pending.state==='installed')activate()});
    status('تم العثور على تحديث. سيُفتح الإصدار الجديد بعد تثبيته.');
   }else{
    status('طلبنا التحديث. أغلق التطبيق وافتحه من أيقونته إذا لم يتغير رقم الإصدار.');
   }
  }
 }catch(error){status('تعذّر تثبيت التحديث. افتح المنصة في Safari وأعد المحاولة.')}
 finally{updating=false;for(const b of buttons)b.disabled=false}
}
// A background availability check changes labels only; it never reloads without a tap.
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>checkUpdate(false),{once:true});
else checkUpdate(false);
window.SchoolReleasePreview={version:CURRENT,check:()=>checkUpdate(true)};
})();