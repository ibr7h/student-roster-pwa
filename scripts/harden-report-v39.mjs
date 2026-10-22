// Hardens the original A4 report without changing its layout or print template.
import fs from 'node:fs';
const path='public/index.html';
let html=fs.readFileSync(path,'utf8');
const original=/function\s+openOfficialReportModal\s*\(\s*\)\s*\{\s*renderFormalReportPreview\s*\(\s*\)\s*;\s*document\.getElementById\(\s*['"]officialReportModal['"]\s*\)\.classList\.remove\(\s*['"]hidden['"]\s*\)\s*;\s*\}/;
if(!original.test(html))throw Error('Expected original report launcher not found; abort build rather than silently shipping stale code');
const updated=`function openOfficialReportModal() {
  const modal=document.getElementById('officialReportModal');
  if(!modal){console.error('A4 report element missing');return;}
  // Show a report screen on this tap even if generating data or QR codes fails.
  if(modal.parentElement!==document.body)document.body.appendChild(modal);
  const menuToggle=document.getElementById('mobileMenuToggle');
  if(document.body.classList.contains('mobile-menu-open')){
    if(menuToggle)menuToggle.click();
    document.body.classList.remove('mobile-menu-open');
    menuToggle?.setAttribute('aria-expanded','false');
  }
  modal.classList.remove('hidden');
  const target=document.getElementById('formalPrintableDocument');
  if(target){
    target.replaceChildren();
    const loading=document.createElement('p');
    loading.className='p-6 text-center text-slate-600 font-bold';
    loading.setAttribute('role','status');
    loading.textContent='جارٍ إعداد التقرير المدرسي...';
    target.appendChild(loading);
  }
  // Two frames allow Safari to paint the opened screen before expensive report work.
  requestAnimationFrame(()=>requestAnimationFrame(()=>setTimeout(()=>{
    if(modal.classList.contains('hidden'))return;
    try{renderFormalReportPreview();}
    catch(error){
      console.error('Report preparation failed',error);
      if(target){
        target.replaceChildren();
        const errorBox=document.createElement('section');
        errorBox.className='p-6 text-center text-red-700';
        const summary=document.createElement('p');
        summary.textContent='تعذر إعداد التقرير. تحقّق من بيانات المدرسة والشواهد ثم أعد المحاولة.';
        const retry=document.createElement('button');
        retry.type='button';retry.className='px-4 py-3 mt-4 bg-slate-800 text-white rounded-xl';
        retry.textContent='إعادة محاولة التقرير';retry.addEventListener('click',openOfficialReportModal);
        errorBox.append(summary,retry);target.appendChild(errorBox);
      }
    }
  },0)));
}`;
html=html.replace(original,updated);
const renderStart=html.indexOf('function renderFormalReportPreview() {');
if(renderStart<0)throw Error('Report renderer missing');
const lastQR=html.indexOf("docContainer.querySelectorAll('[data-report-qr]').forEach(el => {",renderStart);
if(lastQR<0)throw Error('Report final QR block not found');
const endQR=html.indexOf('\n      });',lastQR);
const renderEnd=html.indexOf('\n    }',endQR);
if(renderEnd<0||renderEnd-lastQR>500)throw Error('Unable to safely delimit report renderer');
const prefix=html.slice(0,renderStart),suffix=html.slice(renderEnd+6);
let render=html.slice(renderStart,renderEnd+6);
const heading="const includeCovers = document.getElementById('repOptIncludeCovers')?.checked ?? true;";
if(!render.includes(heading))throw Error('Report settings marker missing');
render=render.replace(heading,"const safeSchool=state.school||{};\n      const safeTeam=Array.isArray(state.team)?state.team:[];\n      "+heading);
render=render.replaceAll('state.school.', 'safeSchool.');
render=render.replaceAll('state.team.filter(', 'safeTeam.filter(');
render=render.replaceAll('state.team.map(', 'safeTeam.map(');
const dataLine='const evs = state.evidences[item.id] || [];';
if(!render.includes(dataLine))throw Error('Report evidence array marker missing');
render=render.replace(dataLine,'const evs = Array.isArray(state.evidences?.[item.id]) ? state.evidences[item.id] : [];');
const qrStart=render.indexOf("docContainer.querySelectorAll('[data-report-qr]').forEach(el => {");
if(qrStart<0)throw Error('Report QR rendering marker missing');
const qrEnd=render.indexOf('\n      });',qrStart);
if(qrEnd<0)throw Error('Report QR rendering end marker missing');
const qrPatch=`const qrNodes=[...docContainer.querySelectorAll('[data-report-qr]')];
      let qrIndex=0;
      const work=()=>{
        if(docContainer.querySelector('[data-report-qr]')!==qrNodes[0])return;
        const until=Math.min(qrIndex+8,qrNodes.length);
        for(;qrIndex<until;qrIndex++){
          const el=qrNodes[qrIndex];
          try{if(typeof QRCode!=='function')throw Error('QR library unavailable');new QRCode(el,{text:el.dataset.reportQr,width:60,height:60,correctLevel:QRCode.CorrectLevel.M});}
          catch(error){el.textContent='QR غير متاح';console.warn('Report QR issue',error)}
        }
        if(qrIndex<qrNodes.length)setTimeout(work,0);
      };
      if(qrNodes.length)setTimeout(work,0);`;
render=render.slice(0,qrStart)+qrPatch+render.slice(qrEnd+'\n      });'.length);
html=prefix+render+suffix;
fs.writeFileSync(path,html);
if(!html.includes('جارٍ إعداد التقرير المدرسي')||!html.includes('QR غير متاح')||!html.includes('safeTeam.filter('))throw Error('Report hardening verification failed');
console.log('Hardened A4 opening, safe data arrays, progressive QR and recoverable error screen');
