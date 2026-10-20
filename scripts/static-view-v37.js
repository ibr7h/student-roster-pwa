(async()=>{
 const box=document.getElementById('viewer');
 const id=new URLSearchParams(location.search).get('id');
 if(!/^[0-9a-f-]{36}$/i.test(id||'')){box.textContent='رابط الشاهد غير صالح.';return}
 const auth=window.SchoolBridge;
 let objectUrl='';
 window.addEventListener('pagehide',()=>{if(objectUrl)URL.revokeObjectURL(objectUrl)});
 try{
  const data=await auth.request('/evidences/'+id+'/view');
  const e=data.evidence;
  const h=document.createElement('h1');h.textContent=e.title;box.replaceChildren(h);
  if(e.kind==='link'){
   const a=document.createElement('a');a.href=e.url;a.target='_blank';a.rel='noopener noreferrer';a.textContent='فتح رابط الشاهد الخارجي';box.append(a);return;
  }
  const blob=await auth.file('/files/'+id);
  objectUrl=URL.createObjectURL(blob);
  const open=document.createElement('a');open.href=objectUrl;open.target='_blank';open.rel='noopener noreferrer';open.textContent='فتح الملف من عارض الجهاز';open.style.display='block';open.style.margin='15px 0';box.append(open);
  if(/^image\/(jpeg|png|webp)$/.test(e.mime_type||'')){
   const img=document.createElement('img');img.src=objectUrl;img.alt=e.title;box.append(img);
  }else if(e.mime_type==='application/pdf'){
   const p=document.createElement('p');p.textContent='ملف PDF محمي. استخدم الرابط لفتحه في عارض الجهاز.';box.append(p);
  }
 }catch(error){
  box.textContent=error.message||'تعذر الاتصال بالخدمة السحابية.';
  const a=document.createElement('a');a.href='/index.html';a.textContent='العودة لتسجيل الدخول';a.style.display='block';box.append(a);
 }
})();