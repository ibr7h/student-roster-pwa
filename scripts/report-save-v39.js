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
// Fidelity: capture the same page DOM and computed mobile styles the user is viewing.
// The old export cloned the page outside the report modal and imposed 210mm on it,
// silently dropping responsive rules, changing table wraps, header sizes and RTL.
const pageMetrics=[];
function captureSettings(page){
 const rect=page.getBoundingClientRect();
 const width=Math.ceil(page.scrollWidth||rect.width),height=Math.ceil(page.scrollHeight||rect.height);
 if(width<200||height<100)throw Error('أبعاد صفحة التقرير غير صالحة، افتح المعاينة من جديد.');
 // Limit per-page memory on iOS but keep Arabic type sharp when zoomed in PDFs.
 const pixels=6_000_000;
 const scale=Math.min(3.25,Math.max(1.5,1420/width),Math.sqrt(pixels/(width*height)));
 return {width,height,scale};
}

async function exportPdf(){
 if(saving)return;
 saving=true;save.disabled=true;reset();
 pageMetrics.length=0;
 try{
  if(typeof window.html2canvas!=='function'||!window.PDFLib?.PDFDocument)throw Error('أدوات PDF غير متوفرة. حدّث التطبيق ثم حاول مرة أخرى.');
  let pages=[...doc.querySelectorAll('.a4-page')];
  if(!pages.length)throw Error('التقرير لم يكتمل. افتح التقرير مجددًا ثم حاول الحفظ.');
  if(pages.length>250)throw Error('عدد الصفحات كبير جدًا للحفظ من الهاتف.');
  inform('جارٍ إنشاء PDF...');await awaitQrs();
  pages=[...doc.querySelectorAll('.a4-page')];
  const pdf=await window.PDFLib.PDFDocument.create();
  pdf.setTitle('تقرير شواهد التقويم والاعتماد المدرسي');
  pdf.setProducer('منصة شواهد - تصدير محلي');
  // Capture the visible (responsive) report, not an unrelated reconstructed A4.
  // Each original screen page is proportionately fitted to a real A4 PDF page.
  const pw=595.28,ph=841.89;
  for(let i=0;i<pages.length;i++){
   inform('جارٍ تجهيز الصفحة '+(i+1)+' من '+pages.length+'...');
   const page=pages[i],metrics=captureSettings(page);
   await pause();
   const canvas=await window.html2canvas(page,{
    backgroundColor:'#ffffff',scale:metrics.scale,useCORS:true,logging:false,
    width:metrics.width,height:metrics.height,scrollX:0,scrollY:0,
    windowWidth:Math.max(window.innerWidth,metrics.width)
   });
   if(!canvas.width||!canvas.height)throw Error('تعذر تحويل الصفحة '+(i+1)+' إلى PDF.');
   const jpeg=canvas.toDataURL('image/jpeg',0.94);
   const image=await pdf.embedJpg(jpeg),sheet=pdf.addPage([pw,ph]);
   const factor=Math.min(pw/image.width,ph/image.height);
   const w=image.width*factor,h=image.height*factor;
   // Align top at each sheet, preserving reading order and all page content.
   sheet.drawImage(image,{x:(pw-w)/2,y:ph-h,width:w,height:h});
   pageMetrics.push({screenWidth:metrics.width,screenHeight:metrics.height,
    bitmapWidth:canvas.width,bitmapHeight:canvas.height,
    pdfWidth:Number(w.toFixed(2)),pdfHeight:Number(h.toFixed(2))});
   canvas.width=1;canvas.height=1;
   if(i%2===0)await pause();
  }
  inform('جارٍ إنشاء الملف...');const bytes=await pdf.save();
  if(bytes.length<100||bytes[0]!==37||bytes[1]!==80||bytes[2]!==68||bytes[3]!==70)throw Error('فشل التحقق من ملف PDF.');
  const name='تقرير_شواهد_'+filename(document.getElementById('loginSchoolNameTitle')?.textContent)+'.pdf';
  currentFile=new File([bytes],name,{type:'application/pdf'});
  objectUrl=URL.createObjectURL(currentFile);sourceKey=key();
  download.href=objectUrl;download.download=currentFile.name;actions.hidden=false;
  share.hidden=!(typeof navigator.share==='function'&&(!navigator.canShare||navigator.canShare({files:[currentFile]})));
  inform('تم تجهيز PDF مطابق للمعاينة ('+pages.length+' صفحة). اضغط «تنزيل PDF» أو «حفظ في الملفات».');
 }catch(error){console.error('PDF export failed',error);inform(error?.message||'تعذر إنشاء PDF. جرّب الطباعة من Safari.',true)}
 finally{saving=false;save.disabled=false}
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