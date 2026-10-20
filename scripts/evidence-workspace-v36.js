/* Evidence pages replace modal overlays on mobile and desktop. */
(() => {
'use strict';
function init(){
 const main=document.querySelector('main'),panel=document.getElementById('evidenceModal'),preview=document.getElementById('previewModal'),share=document.getElementById('evidenceShareModal');
 if(!main||!panel||!preview)return;
 const dashboard=[...main.children];let saved=[],active=false,busy=false,lastY=0;
 const host=document.createElement('section');host.id='evidenceWorkspace';host.className='hidden evidence-workspace';host.setAttribute('aria-label','شواهد البند');
 const nav=document.createElement('div');nav.className='evidence-workspace-nav';
 const back=document.createElement('button');back.type='button';back.className='evidence-back';back.textContent='← العودة إلى البنود';back.addEventListener('click',()=>window.closeModal());
 const title=document.createElement('span');title.className='evidence-page-label';title.textContent='الملفات والشواهد';
 nav.append(back,title);host.append(nav,panel);main.append(host);
 panel.className='hidden evidence-page-panel';
 panel.firstElementChild.className='evidence-page-card';
 const list=document.getElementById('modalEvidencesList');
 const region=list?.parentElement;
 preview.className='hidden evidence-page-preview';
 preview.firstElementChild.className='evidence-page-preview-card';
 const body=document.getElementById('previewModalBody');body.className='evidence-page-preview-body';
 region?.insertAdjacentElement('afterend',preview);
 if(share){share.className='hidden evidence-page-share';share.firstElementChild.className='evidence-page-share-card';region?.insertAdjacentElement('afterend',share);}
 const ext=document.getElementById('previewExternalBtn');if(ext)ext.target='_self';
 const oldOpen=window.openEvidenceModal;
 window.openEvidenceModal=function(id){
  if(busy)return;
  oldOpen(id);if(!state.activeItemId)return;
  lastY=window.scrollY;saved=dashboard.map(x=>[x,x.classList.contains('hidden')]);
  dashboard.forEach(x=>x.classList.add('hidden'));
  host.classList.remove('hidden');panel.classList.remove('hidden');active=true;
  document.getElementById('mobileBottomNav')?.classList.add('evidence-nav-hidden');
  window.scrollTo(0,0);
 };
 window.closeModal=function(){
  if(busy)return;
  window.closePreviewModal();
  if(typeof window.closeEvidenceShare==='function')window.closeEvidenceShare();
  panel.classList.add('hidden');host.classList.add('hidden');
  for(const [el,wasHidden] of saved){if(!wasHidden)el.classList.remove('hidden');}
  saved=[];state.activeItemId=null;active=false;resetEvidenceForm();
  document.getElementById('mobileBottomNav')?.classList.remove('evidence-nav-hidden');
  window.scrollTo(0,lastY);
 };
 function message(text,url,label){
  body.replaceChildren();
  const box=document.createElement('div');box.className='evidence-preview-message';
  const icon=document.createElement('i');icon.className='fa-solid fa-file-circle-check';
  const p=document.createElement('p');p.textContent=text;box.append(icon,p);
  if(url){const a=document.createElement('a');a.href=url;a.target='_self';a.rel='noopener noreferrer';a.className='evidence-preview-open';a.textContent=label||'فتح الملف';box.append(a);}
  body.append(box);
 }
 window.openPreviewModal=function(itemId,evId){
  const ev=(state.evidences[itemId]||[]).find(x=>x.id===evId);
  if(!ev||!active)return;
  document.getElementById('previewModalTitle').textContent=ev.title||'معاينة الشاهد';
  document.getElementById('previewModalSubtitle').textContent=ev.fileName||ev.url||'عرض محمي';
  ext?.classList.add('hidden');
  if(ev.fileData&&ev.mimeType?.startsWith('image/')){
   body.replaceChildren();const img=document.createElement('img');img.src=ev.fileData;img.alt=ev.title||'الشاهد';img.className='evidence-preview-image';body.append(img);
  }else if(ev.fileData){
   message(ev.mimeType==='application/pdf'?'هذا ملف PDF محفوظ في المنصة. لتجنب المعاينة السوداء على الآيفون، افتحه في عارض الجهاز مباشرة.':'الملف محفوظ في المنصة؛ يمكنك فتحه في عارض الجهاز.',ev.fileData,ev.mimeType==='application/pdf'?'عرض ملف PDF':'فتح المستند');
  }else if(ev.url&&typeof safeCloudUrl==='function'&&safeCloudUrl(ev.url)){
   message('هذا الشاهد يحتوي على رابط خارجي.',safeCloudUrl(ev.url),'فتح الرابط');
  }else message('لا يتوفر رابط عرض صالح لهذا الشاهد.');
  preview.classList.remove('hidden');preview.scrollIntoView({behavior:'smooth',block:'nearest'});
 };
 window.closePreviewModal=function(){preview.classList.add('hidden');body.replaceChildren();};
 const oldSave=window.saveEvidenceEntry;
 window.saveEvidenceEntry=async function(){
  if(!active||busy)return;
  busy=true;host.setAttribute('aria-busy','true');
  const type=document.querySelector('input[name="evidenceType"]:checked')?.value;
  const status=document.getElementById('uploadProgressStatus'),bar=document.getElementById('uploadProgressBar');
  if(type==='file'){
   document.getElementById('uploadProgressWrapper')?.classList.remove('hidden');
   if(status)status.textContent='جارٍ رفع الملف ومعالجته وحفظه سحابيًا...';
   const pct=document.getElementById('uploadProgressPercent');if(pct)pct.textContent='يرجى الانتظار';
   if(bar){bar.style.width='100%';bar.classList.add('evidence-busy-bar');}
  }
  try{await oldSave();}
  finally{busy=false;host.removeAttribute('aria-busy');bar?.classList.remove('evidence-busy-bar');}
 };
 document.addEventListener('keydown',e=>{if(active&&!busy&&e.key==='Escape'){if(!preview.classList.contains('hidden'))closePreviewModal();else closeModal();}});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
