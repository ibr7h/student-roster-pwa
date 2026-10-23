(()=>{'use strict';
const byId=id=>document.getElementById(id);
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n};
function create(){
 const dashboard=byId('dashboard'),notice=byId('status');
 if(!dashboard||!notice)return;
 // Live status can report a cold-start failure. Retry instead of trapping the owner.
 const retry=el('button','owner-drive-retry','إعادة الاتصال بالخادم');
 retry.type='button';
 retry.addEventListener('click',async()=>{
  if(retry.disabled)return;
  retry.disabled=true;
  let error;
  try{
   // Render may need to start an instance. Probe the exact project API and
   // preserve user-entered login credentials while connectivity is checked.
   for(let attempt=1;attempt<=3;attempt++){
    retry.textContent='جارٍ فحص الاتصال ('+attempt+'/3)';
    try{
     const response=await fetch(window.SCHOOL_API_ORIGIN+'/api/platform/status?ownerCheck='+Date.now(),{
      cache:'no-store',credentials:'omit',signal:AbortSignal.timeout(15000)
     });
     if(!response.ok)throw Error('HTTP '+response.status);
     error=null;break;
    }catch(e){error=e;if(attempt<3)await new Promise(resolve=>setTimeout(resolve,1200))}
   }
   if(error)throw error;
   if(typeof window.init!=='function')throw Error('لم يتم تحميل أدوات لوحة المالك.');
   notice.className='ok';notice.textContent='اتصال الخادم متاح. جارٍ تحديث لوحة المالك...';
   await window.init();
  }catch(e){
   notice.className='err';
   notice.textContent='لم ينجح الاتصال بخادم الشواهد. افتح المنصة في Safari وتحقق من الإنترنت، ثم أعد المحاولة. ('+(e?.name==='TimeoutError'?'انتهت مهلة الاتصال':'فشل الاتصال')+')';
  }finally{retry.disabled=false;retry.textContent='إعادة الاتصال بالخادم'}
 });
 notice.insertAdjacentElement('afterend',retry);
 const stamp=el('small','owner-drive-build','إصدار لوحة المالك: owner-r11');
 stamp.setAttribute('aria-label','إصدار لوحة مالك المنصة owner-r11');
 retry.insertAdjacentElement('afterend',stamp);

 const panel=el('section','owner-drive-panel');
 panel.id='ownerGoogleDriveSettings';
 const title=el('h2','','إعدادات Google Drive');
 const intro=el('p','','ارفع ملف OAuth JSON الأصلي من Google Cloud (Web application). سيُحفظ Client Secret مشفرًا في خادم المنصة، ولن يُعرض مجددًا.');
 const status=el('p','owner-drive-status','لم يُفحص إعداد Google Drive بعد.');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const form=el('form','owner-drive-form');
 const label=el('label','','ملف OAuth JSON');label.setAttribute('for','ownerGoogleJson');
 const input=el('input');input.id='ownerGoogleJson';input.name='googleJson';input.type='file';input.accept='.json,application/json';input.required=true;
 const summary=el('p','owner-drive-summary','لم يتم اختيار ملف.');
 const save=el('button','owner-drive-save','استيراد وحفظ إعدادات Google');save.type='submit';
 form.append(label,input,summary,save);
 const help=el('p','owner-drive-help','ملاحظة: حفظ إعدادات OAuth لا يفعّل ربط حسابات المدارس بعد. يلزم إكمال Redirect URI ومسار التفويض في الخادم.');
 panel.append(title,intro,status,form,help);
 dashboard.append(panel);
 let loaded=false;
 async function load(){
  if(dashboard.classList.contains('hidden'))return;
  try{
   const v=await window.SchoolBridge.request('/platform/google-drive');
   if(v.configured){
    status.textContent='تم حفظ إعدادات OAuth. معرّف العميل: '+v.clientId+'. ربط المدارس لم يُفعّل بعد؛ يحتاج OAuth callback واختبارات أمنية.';
   }else status.textContent='لم يتم إعداد Google Drive بعد. ارفع ملف OAuth Web JSON الخاص بمشروع الشواهد.';
  }catch(error){status.textContent='تعذر قراءة إعداد Google Drive: '+error.message}
 }
 const observer=new MutationObserver(()=>{if(!dashboard.classList.contains('hidden')&&!loaded){loaded=true;load()}else if(dashboard.classList.contains('hidden'))loaded=false});
 observer.observe(dashboard,{attributes:true,attributeFilter:['class']});
 if(!dashboard.classList.contains('hidden')){loaded=true;load()}
 input.addEventListener('change',async()=>{
  summary.textContent='لم يتم اختيار ملف.';
  if(!input.files?.length)return;
  const file=input.files[0];
  if(file.size>16384){summary.textContent='حجم الملف يتجاوز 16 كيلوبايت.';input.value='';return}
  try{
   const json=JSON.parse(await file.text()),web=json?.web;
   if(!web||typeof web!=='object'||Array.isArray(web)||Object.keys(json).length!==1||typeof web.client_secret!=='string'||!web.client_secret){
    throw Error('الملف ليس بيانات OAuth Web application صحيحة.');
   }
   if(web.project_id!=='shawahed-school')throw Error('الملف يعود إلى مشروع غير shawahed-school.');
   if(!/^[0-9]+-[a-z0-9]+\.apps\.googleusercontent\.com$/.test(web.client_id||''))throw Error('معرّف OAuth Client غير صحيح.');
   summary.textContent='المشروع: '+web.project_id+' — Client ID: …'+web.client_id.slice(-12)+' — الملف صالح مبدئيًا.';
  }catch(error){summary.textContent=error.message;input.value=''}
 });
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(!input.files?.length)return;
  const file=input.files[0];
  if(file.size>16384){status.textContent='الملف كبير جدًا.';return}
  save.disabled=true;status.textContent='جارٍ تشفير إعدادات OAuth وحفظها...';
  let payload;
  try{
   payload=JSON.parse(await file.text());
   const reply=await window.SchoolBridge.request('/platform/google-drive',{method:'POST',body:JSON.stringify({googleClient:payload})});
   status.textContent='تم حفظ بيانات OAuth وتشفير السر على الخادم. معرّف العميل: '+reply.clientId+'. ربط المدارس لم يُفعّل بعد.';
   input.value='';summary.textContent='تم استيراد الملف، ولن تظهر قيمه السرية هنا.';
  }catch(error){status.textContent='لم تُحفظ الإعدادات: '+error.message}
  finally{payload=undefined;save.disabled=false}
 });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',create,{once:true});else create();
})();