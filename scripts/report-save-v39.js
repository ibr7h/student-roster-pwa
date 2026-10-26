/* Local PDF export of Arabic A4 pages. No school content is sent to a server. */
(()=>{'use strict';
const modal=document.getElementById('officialReportModal');
const doc=document.getElementById('formalPrintableDocument');
const save=document.getElementById('schoolReportSavePdf');
const print=document.getElementById('schoolReportPrint');
const actions=document.getElementById('schoolReportFileActions');
const message=document.getElementById('schoolReportPdfStatus');
const share=document.getElementById('schoolReportSharePdf');
const download=document.getElementById('schoolReportDownloadPdf');
if(!modal||!doc||!save||!actions||!message||!share||!download)return;
let saving=false,objectUrl=null,currentFile=null,sourceKey='';
const pageMetrics=[];
function inform(value,error=false){message.textContent=value;message.classList.toggle('school-report-error',error)}
function key(){return [doc.querySelectorAll('.a4-page').length,doc.textContent.length,document.getElementById('repOptIncludeCovers')?.checked,document.getElementById('repOptIncludeQrs')?.checked].join(':')}
function reset(){if(objectUrl)URL.revokeObjectURL(objectUrl);objectUrl=null;currentFile=null;sourceKey='';actions.hidden=true;download.removeAttribute('href')}
new MutationObserver(()=>{if(!saving&&currentFile&&key()!==sourceKey){reset();inform('تغيّر التقرير؛ أنشئ ملف PDF جديدًا.')}}).observe(doc,{childList:true});
for(const id of ['repOptIncludeCovers','repOptIncludeQrs'])document.getElementById(id)?.addEventListener('change',()=>{if(!saving){reset();inform('تغيّرت الخيارات؛ أنشئ ملف PDF مجددًا.')}});
const pause=()=>new Promise(resolve=>requestAnimationFrame(()=>setTimeout(resolve,0)));
async function awaitQrs(){
 for(let i=0;i<30;i++){
  const pending=[...doc.querySelectorAll('[data-report-qr]')].filter(el=>!el.querySelector('canvas,img')&&!el.textContent.trim());
  if(!pending.length)return;
  await new Promise(resolve=>setTimeout(resolve,150));
 }
}
function filename(v){return String(v||'المدرسة').normalize('NFC').replace(/[\/\\:*?"<>|\u0000-\u001f]/g,'-').replace(/\s+/g,' ').trim().slice(0,65)||'المدرسة'}
function clonePage(page){
 const clone=page.cloneNode(true);
 clone.setAttribute('dir','rtl');
 clone.style.cssText='width:210mm!important;min-width:210mm!important;max-width:210mm!important;min-height:297mm!important;height:auto!important;margin:0!important;padding:14mm 12mm!important;box-sizing:border-box!important;background:#fff!important;direction:rtl!important;text-align:right!important;box-shadow:none!important;border:0!important;border-radius:0!important;';
 const canvases=page.querySelectorAll('canvas');
 const copies=clone.querySelectorAll('canvas');
 canvases.forEach((canvas,i)=>{
  const target=copies[i];if(!target)return;
  try{
   const image=document.createElement('img');image.src=canvas.toDataURL('image/png');
   image.width=canvas.width;image.height=canvas.height;
   image.style.cssText='width:'+(canvas.clientWidth||60)+'px;height:'+(canvas.clientHeight||60)+'px;object-fit:contain';
   target.replaceWith(image);
  }catch(e){console.warn('QR capture issue',e);target.replaceWith(document.createTextNode('QR'))}
 });
 return clone;
}
async function exportPdf(){
 if(saving)return;
 saving=true;save.disabled=true;reset();
 let offscreen=null;
 try{
  if(typeof window.html2canvas!=='function'||!window.PDFLib?.PDFDocument)throw Error('أدوات PDF غير متوفرة. حدّث التطبيق ثم حاول مرة أخرى.');
  let pages=[...doc.querySelectorAll('.a4-page')];
  if(!pages.length)throw Error('التقرير لم يكتمل. افتح التقرير مجددًا ثم حاول الحفظ.');
  window.SchoolReportView?.showA4();
  await pause();await pause();
  pageMetrics.length=0;
  if(pages.length>250)throw Error('عدد الصفحات كبير جدًا للحفظ من الهاتف.');
  inform('جارٍ إنشاء PDF...');await awaitQrs();
  pages=[...doc.querySelectorAll('.a4-page')];
  const pdf=await window.PDFLib.PDFDocument.create();
  pdf.setTitle('تقرير شواهد التقويم والاعتماد المدرسي');
  pdf.setProducer('منصة شواهد - تصدير محلي');
  offscreen=document.createElement('div');
  offscreen.className='school-report-pdf-capture';offscreen.setAttribute('dir','rtl');
  offscreen.style.cssText='position:absolute;left:-15000px;top:0;z-index:-1;pointer-events:none;width:210mm;direction:rtl;background:#fff;';
  document.body.appendChild(offscreen);
  const pw=595.28,ph=841.89;
  for(let i=0;i<pages.length;i++){
   inform('جارٍ تجهيز الصفحة '+(i+1)+' من '+pages.length+'...');
   const clone=clonePage(pages[i]);offscreen.replaceChildren(clone);
   await pause();
   const previewPage=pages[i];
   const captureWidth=clone.scrollWidth,captureHeight=clone.scrollHeight;
   const previewWidth=previewPage.scrollWidth,previewHeight=previewPage.scrollHeight;
   console.log('A4_CAPTURE_LAYOUT',JSON.stringify({page:i+1,previewWidth,previewHeight,captureWidth,captureHeight}));
   const canvas=await window.html2canvas(clone,{backgroundColor:'#ffffff',scale:2.1,useCORS:true,logging:false,scrollX:0,scrollY:0,windowWidth:1024});
   if(!canvas.width||!canvas.height)throw Error('تعذر تحويل الصفحة '+(i+1)+' إلى PDF.');
   const jpeg=canvas.toDataURL('image/jpeg',0.94);
   const image=await pdf.embedJpg(jpeg);const sheet=pdf.addPage([pw,ph]);
   const factor=Math.min(pw/image.width,ph/image.height),w=image.width*factor,h=image.height*factor;
   sheet.drawImage(image,{x:(pw-w)/2,y:ph-h,width:w,height:h});
   pageMetrics.push({previewWidth,previewHeight,captureWidth,captureHeight,pdfWidth:Number(w.toFixed(2)),pdfHeight:Number(h.toFixed(2))});
   clone.remove();offscreen.replaceChildren();canvas.width=1;canvas.height=1;
   if(i%2===0)await pause();
  }
  inform('جارٍ إنشاء الملف...');const bytes=await pdf.save();
  if(bytes.length<100||bytes[0]!==37||bytes[1]!==80||bytes[2]!==68||bytes[3]!==70)throw Error('فشل التحقق من ملف PDF.');
  const name='تقرير_شواهد_'+filename(document.getElementById('loginSchoolNameTitle')?.textContent)+'.pdf';
  currentFile=new File([bytes],name,{type:'application/pdf'});
  objectUrl=URL.createObjectURL(currentFile);sourceKey=key();
  download.href=objectUrl;download.download=currentFile.name;actions.hidden=false;
  share.hidden=!(typeof navigator.share==='function'&&(!navigator.canShare||navigator.canShare({files:[currentFile]})));
  inform('تم تجهيز PDF بنفس تخطيط معاينة A4 ('+pages.length+' صفحة). اضغط «تنزيل PDF» أو «حفظ في الملفات».');
 }catch(error){console.error('PDF export failed',error);inform(error?.message||'تعذر إنشاء PDF. جرّب الطباعة من Safari.',true)}
 finally{offscreen?.remove();saving=false;save.disabled=false}
}
function sharePdf(){
 if(!currentFile)return;
 if(typeof navigator.share!=='function'){inform('المشاركة غير متاحة؛ استخدم «تنزيل PDF».',true);return}
 // Direct click ensures iOS transient user activation is preserved.
 navigator.share({files:[currentFile],title:'تقرير شواهد'}).catch(error=>{
  if(error?.name!=='AbortError'){console.warn('PDF share unavailable',error);inform('تعذّرت المشاركة. استخدم «تنزيل PDF» أو افتح Safari.',true)}
 });
}
save.addEventListener('click',exportPdf);
share.addEventListener('click',sharePdf);
print?.addEventListener('click',()=>inform('استخدم خيارات الطباعة للحفظ إذا كانت مدعومة في جهازك.'));
window.SchoolReportPDF={export:exportPdf,getFile:()=>currentFile,getPageMetrics:()=>pageMetrics.slice()};
})();