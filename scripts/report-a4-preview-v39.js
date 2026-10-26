/* A single A4 layout for screen-preview and PDF/print, with a readable phone mode.
   A4 is scaled visually rather than reflowed so exported pages match their preview. */
(()=>{'use strict';
const modal=document.getElementById('officialReportModal');
const doc=document.getElementById('formalPrintableDocument');
const toggle=document.getElementById('schoolReportToggleView');
if(!modal||!doc||!toggle)return;
let view='a4',pending=false;
const baseA4Width=210*96/25.4;
function draw(){
 pending=false;
 const pages=[...doc.querySelectorAll('.a4-page')];
 if(!pages.length)return;
 for(const page of pages){
  if(page.parentElement?.classList.contains('school-a4-sheet'))continue;
  const shell=document.createElement('div');
  shell.className='school-a4-sheet';
  page.replaceWith(shell);shell.appendChild(page);
 }
 const a4=view==='a4';
 modal.classList.toggle('school-report-a4-preview',a4);
 toggle.textContent=a4?'عرض مناسب للجوال':'معاينة A4 المطابقة للحفظ';
 toggle.setAttribute('aria-pressed',String(a4));
 const width=Math.max(1,doc.clientWidth-2);
 const scale=Math.min(1,width/baseA4Width);
 for(const page of pages){
  const shell=page.parentElement;
  if(!a4){
   page.style.removeProperty('transform');
   shell.style.removeProperty('height');
   shell.style.removeProperty('width');
   shell.style.removeProperty('--school-a4-scale');
   continue;
  }
  // Natural physical A4 dimensions remain unchanged in layout. Only the preview is scaled.
  shell.style.setProperty('--school-a4-scale',String(scale));
  shell.style.width=(baseA4Width*scale)+'px';
  shell.style.height=Math.ceil(page.scrollHeight*scale)+'px';
  page.style.transform='scale('+scale+')';
 }
}
function schedule(){
 if(pending)return;pending=true;
 requestAnimationFrame(()=>requestAnimationFrame(draw));
}
toggle.addEventListener('click',()=>{
 view=view==='a4'?'mobile':'a4';
 schedule();
});
new MutationObserver(records=>{
 if(records.some(r=>r.addedNodes.length||r.removedNodes.length))schedule();
}).observe(doc,{childList:true,subtree:true});
window.addEventListener('resize',schedule,{passive:true});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule()});
window.SchoolReportView={
 getMode:()=>view,
 showA4:()=>{view='a4';schedule()},
 refresh:schedule
};
schedule();
})();