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
  retry.disabled=true;retry.textContent='جارٍ إعادة الاتصال...';
  try{
   const controller=new AbortController();
   const response=await fetch(window.SCHOOL_API_ORIGIN+'/api/health',{cache:'no-store',credentials:'omit',signal:controller.signal});
   if(!response.ok)throw Error('HTTP '+response.status);
   await window.init();
  }catch(error){notice.className='err';notice.textContent='تعذر الوصول إلى API. تحقق من الإنترنت ثم أعد المحاولة. '+String(error?.message||'').slice(0,90)}
  finally{retry.disabled=false;retry.textContent='إعادة الاتصال بالخادم'}
 });
 notice.insertAdjacentElement('afterend',retry);

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
   const v=await window.SchoolBridge.request('/platform/google-drive/config');
   if(v.configured){
    status.textContent='تم حفظ إعدادات مشروع '+v.projectId+'. معرّف العميل ينتهي بـ '+v.clientIdSuffix+'. '+(v.redirectConfigured?'مسار Redirect مسجل في JSON.':'يجب إضافة عنوان Redirect في Google Cloud.') ;
   }else status.textContent=v.serverVaultReady?'لم يتم إعداد Google Drive.':'لم يتم إعداد Google Drive. مفتاح تشفير الإعدادات غير مهيأ على خادم المعاينة.';
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
   const reply=await window.SchoolBridge.request('/platform/google-drive/config',{method:'POST',body:JSON.stringify(payload)});
   status.textContent='تم حفظ إعداد Google Drive بأمان: '+reply.projectId+'. '+(reply.redirectConfigured?'':'ما زال عنوان Redirect بحاجة إلى ضبط.');
   input.value='';summary.textContent='تم استيراد الملف، ولن تظهر قيمه السرية هنا.';
  }catch(error){status.textContent='لم تُحفظ الإعدادات: '+error.message}
  finally{payload=undefined;save.disabled=false}
 });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',create,{once:true});else create();
})();