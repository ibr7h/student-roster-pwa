/* Official behavior & attendance forms — development branch only.
   Reference: Ministry of Education, Rules of Behavior and Attendance,
   fifth edition 1447H / 2025. */
const OFFICIAL_FORM_FONT='"Sakkal Majalla","Traditional Arabic","Noto Naskh Arabic",Arial,Tahoma,sans-serif';
const OFFICIAL_A4_WIDTH=1240,OFFICIAL_A4_HEIGHT=1754,OFFICIAL_A4_SIDE=118;
function officialFitWidths(widths,W=OFFICIAL_A4_WIDTH,M=OFFICIAL_A4_SIDE){
  const total=widths.reduce((sum,v)=>sum+v,0)||1,available=W-2*M;let used=0;
  return widths.map((v,i)=>{const n=i===widths.length-1?available-used:Math.round(v/total*available);used+=n;return n})
}
let officialFormsStudentId='',officialFormsRecordId='';

async function officialEnsurePrintReady(){
  try{
    if(document.fonts?.ready)await document.fonts.ready;
    if(document.fonts?.load)await Promise.allSettled([
      document.fonts.load('24px "Sakkal Majalla"'),
      document.fonts.load('700 24px "Sakkal Majalla"')
    ])
  }catch{}
  const logo=document.querySelector('.app-brand-logo')||document.querySelector('img[src*="moe-logo"]');
  if(logo&&!logo.complete){
    await new Promise(resolve=>{
      const done=()=>resolve();
      logo.addEventListener('load',done,{once:true});
      logo.addEventListener('error',done,{once:true});
      setTimeout(resolve,1200)
    })
  }
  await officialPrimeSignatureImages();
}
function officialRefSize(cssPx){return Math.round(cssPx*1.42)}
function officialFont(ctx,size=24,weight='400'){
  ctx.font=`${weight} ${size}px ${OFFICIAL_FORM_FONT}`;
}
function officialText(ctx,text,x,y,size=24,weight='400',align='right',color='#000000'){
  ctx.save();ctx.direction='rtl';ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillStyle=color;officialFont(ctx,size,weight);ctx.fillText(String(text??''),x,y);ctx.restore()
}
function officialLine(ctx,x1,y1,x2,y2,width=1,color='#000000'){
  ctx.save();ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();ctx.restore()
}
function officialDottedLine(ctx,x1,y,x2,color='#444444'){
  ctx.save();ctx.fillStyle=color;
  const start=Math.min(x1,x2),end=Math.max(x1,x2),step=7,r=1.25;
  for(let x=start;x<=end;x+=step){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill()}
  ctx.restore()
}
function officialWrappedLines(ctx,text,maxWidth,size=21,weight='400',maxLines=4){
  const words=String(text||'').trim().split(/\s+/).filter(Boolean);if(!words.length)return [];
  ctx.save();officialFont(ctx,size,weight);const lines=[];let line='';
  for(const word of words){
    const test=line?line+' '+word:word;
    if(!line||ctx.measureText(test).width<=maxWidth)line=test;
    else{lines.push(line);line=word;if(lines.length>=maxLines-1)break}
  }
  if(line&&lines.length<maxLines)lines.push(line);ctx.restore();return lines
}
function officialWrappedText(ctx,text,x,y,maxWidth,{size=21,weight='400',lineHeight=30,maxLines=4,align='right',color='#000000'}={}){
  const lines=officialWrappedLines(ctx,text,maxWidth,size,weight,maxLines);
  lines.forEach((ln,i)=>officialText(ctx,ln,x,y+i*lineHeight,size,weight,align,color));
  return y+Math.max(1,lines.length)*lineHeight
}
function officialCell(ctx,x,y,w,h,text,{size=18,weight='400',align='center',fill='',maxLines=4}={}){
  const cellFill=fill||((weight==='700'||weight==='bold')?'#f8fafc':'#fff');
  ctx.save();ctx.fillStyle=cellFill;ctx.fillRect(x,y,w,h);ctx.strokeStyle='#000';ctx.lineWidth=1.2;ctx.strokeRect(x,y,w,h);ctx.restore();
  const lines=officialWrappedLines(ctx,text,w-12,size,weight,maxLines),lh=Math.min(size*1.35,h/Math.max(1,lines.length));
  const start=y+h/2-(Math.max(1,lines.length)-1)*lh/2;
  if(!lines.length)officialText(ctx,'',x+w/2,y+h/2,size,weight,align);
  else lines.forEach((ln,i)=>officialText(ctx,ln,align==='right'?x+w-7:align==='left'?x+7:x+w/2,start+i*lh,size,weight,align));
}
function officialIdentity(){
  const meta=state.appMeta||{},schedule=(typeof activeTeacherSchedule==='function'?activeTeacherSchedule():null)||(typeof currentTeacherSchedule==='function'?currentTeacherSchedule():null)||{};
  const audience=typeof schoolAudience==='function'?schoolAudience():{};
  const clean=v=>String(v??'').trim();
  return {
    school:clean(meta.school||schedule.school),
    region:clean(meta.region),
    year:clean(meta.year),
    semester:clean(schedule.semester||meta.semester),
    teacher:clean(meta.teacher||schedule.teacherName),
    principal:clean(meta.principal),
    schoolGender:meta.schoolGender==='girls'?'girls':'boys',
    audience
  }
}
function officialIdentitySummaryText(){
  const id=officialIdentity(),parts=[];
  if(id.school)parts.push('المدرسة: '+id.school);
  if(id.region)parts.push('المنطقة/المكتب: '+id.region);
  if(id.year)parts.push('العام: '+id.year);
  if(id.semester)parts.push(id.semester);
  if(id.teacher)parts.push((id.audience?.teacherName||'المعلم')+': '+id.teacher);
  if(id.principal)parts.push((id.audience?.principalName||'مدير المدرسة')+': '+id.principal);
  return parts.join(' · ')||'لم تُستكمل هوية المدرسة بعد — يمكن إدخالها من الإدارة ← هوية المدرسة والتقارير.'
}

function officialLogo(ctx,cx,y,w=150,h=90){
  const logo=document.querySelector('.app-brand-logo')||document.querySelector('img[src*="moe-logo"]');
  if(logo?.complete&&logo.naturalWidth){try{ctx.drawImage(logo,cx-w/2,y,w,h)}catch{}}
}
function officialHeader(ctx,title,{confidential='',titleY=250}={}){
  const W=OFFICIAL_A4_WIDTH,M=OFFICIAL_A4_SIDE,gov=officialIdentity(),center=W/2;
  officialText(ctx,'المملكة العربية السعودية',W-M,92,28,'700');
  officialText(ctx,'وزارة التعليـــــــــــــــــم',W-M,132,27,'400');
  officialLogo(ctx,center,48,190,112);
  officialText(ctx,'المنطقة/المحافظة: '+(gov.region||'........................'),M,96,25,'400','left');
  officialText(ctx,'المدرسة: '+(gov.school||'........................'),M,139,25,'400','left');
  if(confidential)officialText(ctx,confidential,center,titleY-62,30,'700','center','#222');
  officialText(ctx,title,center,titleY,40,'700','center');
}
function officialPortraitCanvas(title,opts={}){
  const canvas=document.createElement('canvas');canvas.width=OFFICIAL_A4_WIDTH;canvas.height=OFFICIAL_A4_HEIGHT;
  const ctx=canvas.getContext('2d',{alpha:false});ctx.fillStyle='#fff';ctx.fillRect(0,0,1240,1754);
  officialHeader(ctx,title,opts);return {canvas,ctx,W:OFFICIAL_A4_WIDTH,H:OFFICIAL_A4_HEIGHT,M:OFFICIAL_A4_SIDE}
}
function officialPage(canvas){
  const data=canvas.toDataURL('image/jpeg',0.97);
  return {bytes:base64Bytes(data.split(',')[1]),width:canvas.width,height:canvas.height}
}
function officialOpenPdf(pages,filename,title){
  openPdfForPrint(buildJpegPdf(pages,'portrait'),filename,title)
}
function officialStudent(id=officialFormsStudentId){
  const c=currentClass();return c?.students?.find(s=>s.id===id)||c?.students?.[0]||null
}
function officialRecord(id=officialFormsRecordId){
  const c=currentClass();return c?.behaviorRecords?.find(r=>r.id===id)||null
}
function officialRecordForStudent(){
  const c=currentClass(),st=officialStudent();if(!c||!st)return null;
  return officialRecord()||(c.behaviorRecords||[]).filter(r=>r.studentId===st.id).sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')))[0]||null
}
function officialStudentGradeLine(c){return [c?.grade,c?.name].filter(Boolean).join(' — ')||'—'}
function officialHijriPlaceholder(){return '      /      / 14هـ'}
function officialSignatureBlock(ctx,x,y,title,name=''){
  officialText(ctx,title,x,y,22,'400','center');
  officialText(ctx,'الاسم: '+(name||'........................................'),x,y+40,20,'400','center');
  officialText(ctx,'التوقيع: ........................................',x,y+80,20,'400','center');
  officialText(ctx,'التاريخ: .........................................',x,y+120,20,'400','center')
}
function officialPageNumber(ctx,n){officialText(ctx,String(n),OFFICIAL_A4_SIDE,OFFICIAL_A4_HEIGHT-48,18,'400','left','#94a3b8')}


const OFFICIAL_SIGNATURES_KEY='student-roster-official-signatures-v2';
let officialSignatureRole='',officialSignaturePad=null,officialSignaturePadCtx=null,officialSignatureDrawing=false,officialSignatureStrokes=[],officialSignatureStroke=null;
const officialSignatureImageCache=new Map();

function officialSignatureRoleLabel(role){
  return {student:'الطالب/الطالبة',guardian:'ولي الأمر',teacher:'المعلم/المعلمة',principal:'مدير/مديرة المدرسة',vice_principal:'وكيل/وكيلة شؤون الطلبة',specialist:'القائم بتعديل السلوك'}[role]||role
}
function officialSignatureStore(){
  try{return JSON.parse(localStorage.getItem(OFFICIAL_SIGNATURES_KEY)||'{}')||{}}catch{return {}}
}
function officialSignatureRoleKey(role){
  const c=currentClass(),st=officialStudent();
  if(role==='student'||role==='guardian')return [role,c?.id||'class',st?.id||'student'].join(':');
  return role
}
function officialGetSignature(role){
  const store=officialSignatureStore();return store[officialSignatureRoleKey(role)]||null
}
function officialSetSignature(role,value){
  const store=officialSignatureStore(),key=officialSignatureRoleKey(role);
  if(value)store[key]=value;else delete store[key];
  try{localStorage.setItem(OFFICIAL_SIGNATURES_KEY,JSON.stringify(store))}catch{}
  officialSignatureImageCache.clear();officialRefreshSignatureButtons()
}
function officialRefreshSignatureButtons(){
  document.querySelectorAll('#officialSignatureButtons [data-sign-role]').forEach(btn=>{
    const saved=!!officialGetSignature(btn.dataset.signRole)?.svg;btn.classList.toggle('saved',saved);
    const small=btn.querySelector('small');if(small)small.textContent=saved?'محفوظ — اضغط للتعديل':'غير محفوظ — اضغط للتوقيع'
  })
}
function officialSignaturePadPoint(e){
  const rect=officialSignaturePad.getBoundingClientRect();
  return {x:e.clientX-rect.left,y:e.clientY-rect.top,time:Date.now()}
}
function officialSignatureNormalizedStrokes(){
  const w=Math.max(1,officialSignaturePad?.width||1),h=Math.max(1,officialSignaturePad?.height||1);
  return officialSignatureStrokes.map(st=>({...st,points:(st.points||[]).map(p=>({x:p.x/w,y:p.y/h,time:p.time}))}))
}
function officialSignatureAbsoluteStrokes(saved){
  const w=Math.max(1,officialSignaturePad?.width||1),h=Math.max(1,officialSignaturePad?.height||1);
  return (saved?.strokes||[]).map(st=>({...st,points:(st.points||[]).map(p=>({x:p.x*w,y:p.y*h,time:p.time}))}))
}
function officialSignatureRedraw(){
  if(!officialSignaturePadCtx||!officialSignaturePad)return;
  const ctx=officialSignaturePadCtx;ctx.clearRect(0,0,officialSignaturePad.width,officialSignaturePad.height);
  officialSignatureStrokes.forEach(stroke=>{
    const pts=stroke.points||[];if(!pts.length)return;
    ctx.strokeStyle=stroke.color||'#0b3c8c';ctx.fillStyle=stroke.color||'#0b3c8c';ctx.lineCap='round';ctx.lineJoin='round';
    if(pts.length===1){ctx.beginPath();ctx.arc(pts[0].x,pts[0].y,(stroke.width||2.5)/2,0,Math.PI*2);ctx.fill();return}
    if(stroke.nib==='ballpoint'){
      ctx.lineWidth=stroke.width||2.5;ctx.beginPath();ctx.moveTo(pts[0].x,pts[0].y);
      for(let i=1;i<pts.length-1;i++){
        const xc=(pts[i].x+pts[i+1].x)/2,yc=(pts[i].y+pts[i+1].y)/2;
        ctx.quadraticCurveTo(pts[i].x,pts[i].y,xc,yc)
      }
      ctx.lineTo(pts[pts.length-1].x,pts[pts.length-1].y);ctx.stroke()
    }else if(stroke.nib==='calligraphy'){
      const angle=Math.PI/4,w=(stroke.width||2.5)*1.8,dx=Math.cos(angle)*(w/2),dy=Math.sin(angle)*(w/2);
      for(let i=0;i<pts.length-1;i++){
        const p1=pts[i],p2=pts[i+1];ctx.beginPath();ctx.moveTo(p1.x-dx,p1.y-dy);ctx.lineTo(p1.x+dx,p1.y+dy);ctx.lineTo(p2.x+dx,p2.y+dy);ctx.lineTo(p2.x-dx,p2.y-dy);ctx.closePath();ctx.fill()
      }
    }else if(stroke.nib==='fountain'){
      for(let i=0;i<pts.length-1;i++){
        const p1=pts[i],p2=pts[i+1],dist=Math.hypot(p2.x-p1.x,p2.y-p1.y),time=Math.max(1,(p2.time||0)-(p1.time||0)),speed=dist/time;
        ctx.lineWidth=Math.max(1.2,(stroke.width||2.5)*(1.3-Math.min(speed,1.5)*0.4));
        ctx.beginPath();ctx.moveTo(p1.x,p1.y);ctx.lineTo(p2.x,p2.y);ctx.stroke()
      }
    }
  })
}
function officialGenerateSignatureSvg(strokes,canvasWidth,canvasHeight){
  if(!strokes?.length)return null;
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  strokes.forEach(s=>(s.points||[]).forEach(p=>{minX=Math.min(minX,p.x);minY=Math.min(minY,p.y);maxX=Math.max(maxX,p.x);maxY=Math.max(maxY,p.y)}));
  if(!Number.isFinite(minX))return null;
  const pad=8;minX=Math.max(0,minX-pad);minY=Math.max(0,minY-pad);maxX=Math.min(canvasWidth,maxX+pad);maxY=Math.min(canvasHeight,maxY+pad);
  const width=Math.max(20,maxX-minX),height=Math.max(20,maxY-minY);let pathsSvg='';
  strokes.forEach(st=>{
    const pts=st.points||[];if(pts.length<2)return;
    if(st.nib==='ballpoint'||st.nib==='fountain'){
      let d='M '+(pts[0].x-minX).toFixed(1)+' '+(pts[0].y-minY).toFixed(1)+' ';
      for(let i=1;i<pts.length-1;i++){
        const xc=((pts[i].x+pts[i+1].x)/2-minX).toFixed(1),yc=((pts[i].y+pts[i+1].y)/2-minY).toFixed(1);
        const px=(pts[i].x-minX).toFixed(1),py=(pts[i].y-minY).toFixed(1);d+='Q '+px+' '+py+', '+xc+' '+yc+' '
      }
      pathsSvg+='<path d="'+d+'" fill="none" stroke="'+(st.color||'#0b3c8c')+'" stroke-width="'+(st.width||2.5)+'" stroke-linecap="round" stroke-linejoin="round"/>'
    }else if(st.nib==='calligraphy'){
      const angle=Math.PI/4,w=(st.width||2.5)*1.8,dx=Math.cos(angle)*(w/2),dy=Math.sin(angle)*(w/2);let polyD='';
      for(let i=0;i<pts.length-1;i++){
        const p1=pts[i],p2=pts[i+1];
        polyD+='M '+(p1.x-dx-minX).toFixed(1)+' '+(p1.y-dy-minY).toFixed(1)+' '+
               'L '+(p1.x+dx-minX).toFixed(1)+' '+(p1.y+dy-minY).toFixed(1)+' '+
               'L '+(p2.x+dx-minX).toFixed(1)+' '+(p2.y+dy-minY).toFixed(1)+' '+
               'L '+(p2.x-dx-minX).toFixed(1)+' '+(p2.y-dy-minY).toFixed(1)+' Z '
      }
      pathsSvg+='<path d="'+polyD+'" fill="'+(st.color||'#0b3c8c')+'"/>'
    }
  });
  return {svg:'<svg viewBox="0 0 '+width.toFixed(1)+' '+height.toFixed(1)+'" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">'+pathsSvg+'</svg>',width,height}
}
function officialSignatureImageKey(role,sig){return officialSignatureRoleKey(role)+'|'+(sig?.updatedAt||'')}
function officialSignatureDataUrl(svg){return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg)}
async function officialLoadSignatureImage(role){
  const sig=officialGetSignature(role);if(!sig?.svg)return null;
  const key=officialSignatureImageKey(role,sig);if(officialSignatureImageCache.has(key))return officialSignatureImageCache.get(key);
  const img=new Image(),promise=new Promise(resolve=>{img.onload=()=>resolve(img);img.onerror=()=>resolve(null);img.src=officialSignatureDataUrl(sig.svg)});
  officialSignatureImageCache.set(key,promise);return promise
}
async function officialPrepareSignatureImages(){
  await Promise.all(['student','guardian','teacher','principal','vice_principal','specialist'].map(role=>officialLoadSignatureImage(role)))
}
function officialDrawStoredSignature(ctx,role,cx,y,w=220,h=72){
  const sig=officialGetSignature(role);if(!sig?.svg)return false;
  const key=officialSignatureImageKey(role,sig),cached=officialSignatureImageCache.get(key);if(!cached)return false;
  const draw=img=>{
    if(!img)return false;
    const ratio=(sig.width&&sig.height)?sig.width/sig.height:((img.naturalWidth||2)/(img.naturalHeight||1));
    let dw=w,dh=dw/ratio;if(dh>h){dh=h;dw=dh*ratio}
    ctx.drawImage(img,cx-dw/2,y+(h-dh)/2,dw,dh);return true
  };
  if(typeof cached.then==='function'){return false}
  return draw(cached)
}
async function officialPrimeSignatureImages(){
  const roles=['student','guardian','teacher','principal','vice_principal','specialist'];
  for(const role of roles){
    const sig=officialGetSignature(role);if(!sig?.svg)continue;
    const key=officialSignatureImageKey(role,sig),current=officialSignatureImageCache.get(key);
    if(current&&typeof current.then!=='function')continue;
    const img=await officialLoadSignatureImage(role);if(img)officialSignatureImageCache.set(key,img)
  }
}
function officialSignatureResizePad(){
  if(!officialSignaturePad)return;const rect=officialSignaturePad.getBoundingClientRect();if(!rect.width)return;
  const saved=officialGetSignature(officialSignatureRole),normalized=officialSignatureStrokes.length?officialSignatureNormalizedStrokes():(saved?.strokes||[]);
  officialSignaturePad.width=Math.max(320,Math.round(rect.width));officialSignaturePad.height=200;
  officialSignatureStrokes=normalized.map(st=>({...st,points:(st.points||[]).map(p=>({x:p.x*officialSignaturePad.width,y:p.y*officialSignaturePad.height,time:p.time}))}));
  officialSignatureRedraw()
}
function officialOpenSignatureCapture(role){
  officialSignatureRole=role;const saved=officialGetSignature(role);
  const title=$('#officialSignatureTitle');if(title)title.textContent='توقيع '+officialSignatureRoleLabel(role);
  const dlg=$('#officialSignatureModal');if(!dlg)return;if(typeof dlg.showModal==='function')dlg.showModal();else dlg.setAttribute('open','');
  requestAnimationFrame(()=>{
    officialSignaturePad=$('#officialSignaturePad');officialSignatureResizePad();
    officialSignatureStrokes=officialSignatureAbsoluteStrokes(saved);officialSignatureRedraw()
  })
}
function officialSignatureClearPad(){officialSignatureStrokes=[];officialSignatureStroke=null;officialSignatureRedraw()}
function officialSaveSignature(){
  if(!officialSignaturePad||!officialSignatureStrokes.some(st=>(st.points||[]).length>1)){toast('ارسم التوقيع أولاً');return}
  const made=officialGenerateSignatureSvg(officialSignatureStrokes,officialSignaturePad.width,officialSignaturePad.height);if(!made){toast('تعذر حفظ التوقيع');return}
  officialSetSignature(officialSignatureRole,{svg:made.svg,width:made.width,height:made.height,strokes:officialSignatureNormalizedStrokes(),updatedAt:new Date().toISOString()});
  officialPrimeSignatureImages();
  const dlg=$('#officialSignatureModal');if(dlg?.open)dlg.close();toast('تم حفظ التوقيع بنفس أبعاده ونسبته')
}
function officialClearAllSignatures(){
  if(!confirm('سيتم مسح جميع التوقيعات الرسمية المحفوظة على هذا الجهاز. هل تريد المتابعة؟'))return;
  try{localStorage.removeItem(OFFICIAL_SIGNATURES_KEY)}catch{}officialSignatureImageCache.clear();officialRefreshSignatureButtons();toast('تم مسح التوقيعات المحفوظة')
}
function officialInitSignaturePad(){
  officialSignaturePad=$('#officialSignaturePad');if(!officialSignaturePad||officialSignaturePad.dataset.ready)return;
  officialSignaturePad.dataset.ready='1';officialSignaturePadCtx=officialSignaturePad.getContext('2d');
  officialSignaturePad.addEventListener('pointerdown',e=>{
    e.preventDefault();officialSignatureDrawing=true;officialSignaturePad.setPointerCapture?.(e.pointerId);
    const width=parseFloat($('#officialSignatureWidth')?.value||'2.5'),color=$('#officialSignatureColor')?.value||'#0b3c8c',nib=$('#officialSignatureNib')?.value||'ballpoint';
    officialSignatureStroke={points:[officialSignaturePadPoint(e)],color,width,nib};officialSignatureStrokes.push(officialSignatureStroke);
    const p=officialSignatureStroke.points[0];officialSignaturePadCtx.fillStyle=color;officialSignaturePadCtx.beginPath();officialSignaturePadCtx.arc(p.x,p.y,width/2,0,Math.PI*2);officialSignaturePadCtx.fill()
  });
  officialSignaturePad.addEventListener('pointermove',e=>{if(!officialSignatureDrawing||!officialSignatureStroke)return;e.preventDefault();officialSignatureStroke.points.push(officialSignaturePadPoint(e));officialSignatureRedraw()});
  const stop=()=>{officialSignatureDrawing=false;officialSignatureStroke=null};officialSignaturePad.addEventListener('pointerup',stop);officialSignaturePad.addEventListener('pointercancel',stop);
  $('#officialSignatureWidth')?.addEventListener('input',e=>{const v=$('#officialSignatureWidthValue');if(v)v.textContent=e.target.value});
  $('#clearOfficialSignaturePadBtn')?.addEventListener('click',officialSignatureClearPad);
  $('#saveOfficialSignatureBtn')?.addEventListener('click',officialSaveSignature);
  window.addEventListener('resize',()=>{if($('#officialSignatureModal')?.open)officialSignatureResizePad()})
}

function officialTeacherLogPages(recordId=''){
  const c=currentClass();if(!c)return [];
  const records=(c.behaviorRecords||[]).filter(r=>!recordId||r.id===recordId).sort((a,b)=>String(a.date||'').localeCompare(String(b.date||'')));
  if(!records.length)return [];
  const chunks=[];for(let i=0;i<records.length;i+=6)chunks.push(records.slice(i,i+6));
  return chunks.map((chunk,pageIndex)=>{
    const audience=schoolAudience();
    const {canvas,ctx,W,M}=officialPortraitCanvas(`نموذج رصد ${audience.teacher} لمشكلة سلوكية`,{titleY:300}),right=W-M;
    const body=officialRefSize(22),table=officialRefSize(17),sign=officialRefSize(20);
    officialText(ctx,'المادة:',right,400,body);officialDottedLine(ctx,M+15,400,right-90);officialText(ctx,c.subject||'',right-105,400,officialRefSize(19));
    officialText(ctx,'الصف:',right,458,body);officialDottedLine(ctx,M+15,458,right-75);officialText(ctx,officialStudentGradeLine(c),right-90,458,officialRefSize(19));
    const y0=540,headH=120,rowH=92,widths=officialFitWidths([40,120,185,90,150,140,145,115,111],W,M);
    const heads=['م',audience.studentName,'المشكلة السلوكية','درجة المشكلة','الإجراء المتخذ','مدى الاستجابة','عدد مرات تكرار المشكلة السلوكية','التاريخ','الحصة'];
    let x=W-M;heads.forEach((h,i)=>{x-=widths[i];officialCell(ctx,x,y0,widths[i],headH,h,{size:table,weight:'700',maxLines:4})});
    for(let ri=0;ri<6;ri++){
      const r=chunk[ri]||null,y=y0+headH+ri*rowH;let xx=W-M;
      const vals=r?[arabicNum(pageIndex*6+ri+1),behaviorStudentName(r.studentId,c),r.violationLabel||'',behaviorDegreeLabel(r.degree),r.actionTaken||'',r.response||'',arabicNum(behaviorRecordOccurrenceOrdinal(r,c)),r.date?formatDate(r.date):'',r.period?arabicNum(r.period):'']:['','','','','','','','',''];
      vals.forEach((v,i)=>{xx-=widths[i];officialCell(ctx,xx,y,widths[i],rowH,v,{size:i===2||i===4?officialRefSize(15):table,weight:'400',maxLines:5})})
    }
    officialText(ctx,audience.teacher,300,1420,officialRefSize(22),'700','center');
    officialText(ctx,'الاسم: '+(officialIdentity().teacher||'........................................'),300,1470,sign,'400','center');
    officialText(ctx,'التوقيع: ........................................',300,1520,sign,'400','center');
    officialDrawStoredSignature(ctx,'teacher',300,1490,230,62);
    officialText(ctx,'التاريخ: .........................................',300,1570,sign,'400','center');
    return officialPage(canvas)
  })
}
function printOfficialTeacherLog(recordId=''){
  const pages=officialTeacherLogPages(recordId);if(!pages.length){toast('لا توجد مخالفات لطباعة النموذج');return}
  officialOpenPdf(pages,'نموذج-رصد-المعلم.pdf',`نموذج رصد ${schoolAudience().teacher} لمشكلة سلوكية`)
}

function officialBehaviorUndertakingPage(){
  const c=currentClass(),st=officialStudent(),r=officialRecordForStudent();if(!c||!st||!r){toast('اختر طالبًا وسجلًا سلوكيًا');return null}
  const {canvas,ctx,W,M}=officialPortraitCanvas('تعهـــــد سلوكي',{titleY:340}),right=W-M;
  const body=officialRefSize(23),sign=officialRefSize(20);let y=560;
  officialText(ctx,'أنا الطالب/الطالبة',right,y,body);officialDottedLine(ctx,M+15,y,right-220);officialText(ctx,st.name,right-235,y,officialRefSize(20));y+=72;
  officialText(ctx,'بالصف:',right,y,body);officialDottedLine(ctx,M+15,y,right-90);officialText(ctx,officialStudentGradeLine(c),right-105,y,officialRefSize(20));y+=74;
  officialText(ctx,'أنني قمت في يوم',right,y,body);officialDottedLine(ctx,830,y,right-190);officialText(ctx,r.date?new Date(r.date+'T12:00:00').toLocaleDateString('ar-SA',{weekday:'long'}):'',right-205,y,officialRefSize(19));
  officialText(ctx,'الموافق',800,y,body);officialDottedLine(ctx,M+15,y,690);officialText(ctx,r.date?formatDate(r.date):'',675,y,officialRefSize(19));y+=74;
  officialText(ctx,'بمشكلة سلوكية من الدرجة',right,y,body);officialDottedLine(ctx,M+15,y,right-305);officialText(ctx,behaviorDegreeLabel(r.degree),right-320,y,officialRefSize(20));y+=72;
  officialText(ctx,'وهي',right,y,body);officialDottedLine(ctx,M+15,y,right-55);officialWrappedText(ctx,r.violationLabel||'',right-70,y,870,{size:officialRefSize(20),lineHeight:34,maxLines:2});y+=92;
  officialWrappedText(ctx,'وأتعهد بعدم تكرار أي مشكلة سلوكية مستقبلاً وعلى ذلك جرى التوقيع.',right,y,W-2*M,{size:body,lineHeight:42,maxLines:2});
  const sy=1280;
  [['الطالب/الطالبة',st.name,900,'student'],['ولي الأمر','',620,'guardian'],['مدير/مديرة المدرسة',officialIdentity().principal,320,'principal']].forEach(([title,name,x,role])=>{
    officialText(ctx,title,x,sy,officialRefSize(23),'700','center');
    officialText(ctx,'الاسم: '+(name||'................................'),x,sy+58,sign,'400','center');
    officialText(ctx,'التوقيع: ................................',x,sy+110,sign,'400','center');
    officialDrawStoredSignature(ctx,role,x,sy+78,210,62);
    officialText(ctx,'التاريخ: ................................',x,sy+162,sign,'400','center');
  });
  return officialPage(canvas)
}
function officialParentNoticePage(){
  const c=currentClass(),st=officialStudent(),r=officialRecordForStudent();if(!c||!st||!r){toast('اختر طالبًا وسجلًا سلوكيًا');return null}
  const {canvas,ctx,W,M}=officialPortraitCanvas('إشعار ولي أمر الطالب/الطالبة بمشكلة سلوكية',{confidential:'سري',titleY:325}),right=W-M;
  let y=495;
  const body=officialRefSize(22),small=officialRefSize(20);
  officialText(ctx,'المكرم ولي أمر الطالب/الطالبة',right,y,body);officialDottedLine(ctx,M+25,y,right-390);officialText(ctx,st.name,right-405,y,small);y+=66;
  officialText(ctx,'بالصف:',right,y,body);officialDottedLine(ctx,M+25,y,right-105);officialText(ctx,officialStudentGradeLine(c),right-120,y,small);y+=78;
  officialText(ctx,'السلام عليكم ورحمة الله وبركاته',W/2,y,body,'400','center');y+=78;
  officialText(ctx,'نشعركم بأن الطالب/الطالبة قام/قامت بمشكلة سلوكية من الدرجة',right,y,body);
  officialDottedLine(ctx,M+25,y,right-690);officialText(ctx,behaviorDegreeLabel(r.degree),right-705,y,small);y+=66;
  officialText(ctx,'وهي',right,y,body);officialDottedLine(ctx,M+25,y,right-60);officialWrappedText(ctx,r.violationLabel||'',right-75,y,850,{size:small,lineHeight:36,maxLines:2});y+=92;
  officialText(ctx,'وقد قُررت الإجراءات التالية حياله/حيالها وفق ما ورد في قواعد السلوك والمواظبة:',right,y,body);y+=62;
  const vals=[r.actionTaken||'',r.response||'',''];
  vals.forEach((v,i)=>{officialText(ctx,arabicNum(i+1)+'.',right,y,body);officialDottedLine(ctx,M+25,y,right-42);if(v)officialWrappedText(ctx,v,right-58,y,880,{size:small,lineHeight:34,maxLines:2});y+=66});
  officialWrappedText(ctx,'لذا يرجى منكم المتابعة والتعاون مع المدرسة بما يسهم في انضباط سلوك ابنكم/ابنتكم.',right,y+20,W-2*M,{size:body,lineHeight:38,maxLines:2});
  officialText(ctx,'الختم',890,1360,body,'400','center');
  officialText(ctx,'مدير/مديرة المدرسة',315,1335,body,'700','center');
  officialText(ctx,'الاسم: '+(officialIdentity().principal||'........................................'),315,1390,small,'400','center');
  officialText(ctx,'التوقيع: ........................................',315,1445,small,'400','center');
  officialDrawStoredSignature(ctx,'principal',315,1415,220,62);
  return officialPage(canvas)
}
function officialParentInvitationPage(){
  const c=currentClass(),st=officialStudent();if(!c||!st){toast('اختر طالبًا');return null}
  const r=officialRecordForStudent(),{canvas,ctx,W,M}=officialPortraitCanvas('خطاب دعوة ولي الأمر',{titleY:315}),right=W-M;
  const body=officialRefSize(22),small=officialRefSize(20);let y=480;
  officialText(ctx,'المكرم ولي أمر الطالب/الطالبة',right,y,body);officialDottedLine(ctx,M+15,y,right-350);officialText(ctx,st.name,right-365,y,small);y+=62;
  officialText(ctx,'بالصف:',right,y,body);officialDottedLine(ctx,M+15,y,right-90);officialText(ctx,officialStudentGradeLine(c),right-105,y,small);y+=75;
  officialText(ctx,'السلام عليكم ورحمة الله وبركاته',W/2,y,body,'400','center');y+=72;
  officialText(ctx,'نأمل منكم الحضور إلى المدرسة في يوم',right,y,body);officialDottedLine(ctx,760,y,right-360);
  officialText(ctx,'الموافق',730,y,body);officialDottedLine(ctx,M+15,y,620);officialText(ctx,officialHijriPlaceholder(),605,y,small);y+=66;
  officialText(ctx,'لمقابلة مدير /مديرة المدرسة، وذلك بهدف',right,y,body);officialDottedLine(ctx,M+15,y,right-430);
  if(r)officialWrappedText(ctx,r.violationLabel||'',right-445,y,720,{size:small,lineHeight:34,maxLines:2});y+=90;
  officialText(ctx,'شاكرين لكم تعاونكم معنا لتحقيق مصلحة الطالب.',W/2,y,body,'400','center');
  officialText(ctx,'الختم',890,1030,body,'400','center');
  officialText(ctx,'مدير/مديرة المدرسة',315,990,officialRefSize(22),'700','center');
  officialText(ctx,'الاسم: '+(officialIdentity().principal||'................................'),315,1045,small,'400','center');
  officialText(ctx,'التوقيع: ................................',315,1095,small,'400','center');
  officialDrawStoredSignature(ctx,'principal',315,1065,220,62);
  officialText(ctx,'التاريخ: ................................',315,1145,small,'400','center');
  officialLine(ctx,M,1220,W-M,1220,1,'#cbd5e1');
  officialText(ctx,'رد ولي الأمر:',right,1270,officialRefSize(22),'700');y=1330;
  officialText(ctx,'□ أقر بالعلم، وسأحضر في الموعد المحدد.',right,y,officialRefSize(21));y+=62;
  officialText(ctx,'□ أقر بالعلم، وأرغب بتغيير الموعد (خلال نفس الأسبوع)، وذلك في يوم ........................ الموافق '+officialHijriPlaceholder(),right,y,officialRefSize(20));y+=92;
  officialText(ctx,'الاسم: ........................................',400,1490,small,'400','center');
  officialText(ctx,'التوقيع: .....................................',400,1540,small,'400','center');
  officialDrawStoredSignature(ctx,'guardian',400,1510,220,62);
  officialText(ctx,'التاريخ: ......................................',400,1590,small,'400','center');
  officialPageNumber(ctx,68);
  return officialPage(canvas)
}
function officialAbsenceCounts(st){
  const values=Object.values(st?.attendance||{});
  return {excused:values.filter(v=>v==='absent_excused').length,unexcused:values.filter(v=>v==='absent').length}
}
function officialAbsenceProceduresPage(kind='excused'){
  const c=currentClass(),st=officialStudent();if(!c||!st){toast('اختر طالبًا');return null}
  const isExcused=kind==='excused',title=isExcused?'نموذج إجراءات الغياب بعذر':'نموذج إجراءات الغياب بدون عذر';
  const {canvas,ctx,W,M}=officialPortraitCanvas(title,{titleY:315}),right=W-M;
  const body=officialRefSize(22),table=officialRefSize(isExcused?20:19),sign=officialRefSize(20);
  officialText(ctx,'اسم الطالب/ الطالبة:',right,470,body);officialDottedLine(ctx,M+15,470,right-245);officialText(ctx,st.name,right-260,470,officialRefSize(19));
  officialText(ctx,'المرحلة:',right,535,body);officialDottedLine(ctx,760,535,right-105);officialText(ctx,c.grade||'',right-120,535,officialRefSize(19));
  officialText(ctx,'الصف:',730,535,body);officialDottedLine(ctx,M+15,535,650);officialText(ctx,c.name||'',635,535,officialRefSize(19));
  const y0=625,headH=100,rowH=isExcused?145:118;
  const headers=isExcused?['عدد أيام الغياب','الإجراء المتخذ','تاريخ الإجراء','توقيع الطالب','توقيع ولي الأمر']:['عدد أيام الغياب','الإجراء المتخذ','تاريخ الإجراء','توقيع الطالب','توقيع ولي الأمر','عدد درجات المواظبة المحسومة'];
  const widths=officialFitWidths(isExcused?[125,470,165,165,171]:[120,390,145,140,140,161],W,M);
  let x=W-M;headers.forEach((h,i)=>{x-=widths[i];officialCell(ctx,x,y0,widths[i],headH,h,{size:table,weight:'700',maxLines:4})});
  const thresholds=isExcused?['٣ أيام','٥ أيام','١٠ أيام']:['٣ أيام','٣ أيام\nمتصلة','٥ أيام','١٠ أيام'];
  thresholds.forEach((lab,ri)=>{let xx=W-M,y=y0+headH+ri*rowH;headers.forEach((_,i)=>{xx-=widths[i];officialCell(ctx,xx,y,widths[i],rowH,i===0?lab:'',{size:i===0?officialRefSize(20):table,weight:i===0?'700':'400',maxLines:3})})});
  officialText(ctx,'مدير/مديرة المدرسة',315,1430,officialRefSize(22),'700','center');
  officialText(ctx,'الاسم: '+(officialIdentity().principal||'................................'),315,1485,sign,'400','center');
  officialText(ctx,'التوقيع: ................................',315,1535,sign,'400','center');
  officialDrawStoredSignature(ctx,'principal',315,1505,220,62);
  officialText(ctx,'التاريخ: ................................',315,1585,sign,'400','center');
  return officialPage(canvas)
}
function officialAttendanceCommitmentPage(){
  const c=currentClass(),st=officialStudent();if(!c||!st){toast('اختر طالبًا');return null}
  const count=officialAbsenceCounts(st).unexcused,dates=Object.entries(st.attendance||{}).filter(([,v])=>v==='absent').map(([d])=>formatDate(d));
  const {canvas,ctx,W,M}=officialPortraitCanvas('تعهـــــد الالتزام بالحضور',{titleY:350}),right=W-M;
  const body=officialRefSize(23),sign=officialRefSize(20);let y=575;
  officialText(ctx,'أنا الطالب/الطالبة:',right,y,body);officialDottedLine(ctx,M+15,y,right-230);officialText(ctx,st.name,right-245,y,officialRefSize(20));y+=72;
  officialText(ctx,'بالصف:',right,y,body);officialDottedLine(ctx,M+15,y,right-90);officialText(ctx,officialStudentGradeLine(c),right-105,y,officialRefSize(20));y+=76;
  officialText(ctx,'أنني تغيبت عن الحضور للمدرسة بدون عذر لمدة',right,y,body);officialDottedLine(ctx,640,y,right-480);officialText(ctx,arabicNum(count),right-495,y,officialRefSize(20));
  officialText(ctx,'أيام، بتاريخ',610,y,body);officialDottedLine(ctx,M+15,y,480);if(dates.length)officialWrappedText(ctx,dates.join('، '),465,y,320,{size:officialRefSize(18),lineHeight:30,maxLines:2,align:'right'});y+=88;
  officialWrappedText(ctx,'وأتعهد بالالتزام بالخطة التربوية والعلاجية المقدمة لتحسين الحضور، وعلى ذلك جرى التوقيع.',right,y,W-2*M,{size:body,lineHeight:42,maxLines:2});
  const sy=1280;
  [['الطالب/الطالبة',st.name,900,'student'],['ولي الأمر','',620,'guardian'],['مدير/مديرة المدرسة',officialIdentity().principal,320,'principal']].forEach(([title,name,x,role])=>{
    officialText(ctx,title,x,sy,officialRefSize(23),'700','center');
    officialText(ctx,'الاسم: '+(name||'................................'),x,sy+58,sign,'400','center');
    officialText(ctx,'التوقيع: ................................',x,sy+110,sign,'400','center');
    officialDrawStoredSignature(ctx,role,x,sy+78,210,62);
    officialText(ctx,'التاريخ: ................................',x,sy+162,sign,'400','center');
  });
  return officialPage(canvas)
}
function officialHighRiskPage(){
  const c=currentClass(),st=officialStudent(),r=officialRecordForStudent();if(!c||!st){toast('اختر طالبًا');return null}
  const {canvas,ctx,W,M}=officialPortraitCanvas('نموذج إبلاغ عن حالة عالية الخطورة',{confidential:'(سري للغاية)',titleY:320}),right=W-M;
  const body=officialRefSize(22),small=officialRefSize(20),sign=officialRefSize(20);let y=470;
  officialText(ctx,'اسم الطالب / الطالبة:',right,y,body);officialDottedLine(ctx,M+15,y,right-245);officialText(ctx,st.name,right-260,y,small);y+=58;
  officialText(ctx,'الصف الدراسي:',right,y,body);officialDottedLine(ctx,M+15,y,right-160);officialText(ctx,officialStudentGradeLine(c),right-175,y,small);y+=62;
  officialText(ctx,'وصف الحالة:',right,y,body);y+=38;officialDottedLine(ctx,M+15,y,right);if(r)officialWrappedText(ctx,(r.violationLabel||'')+(r.notes?' — '+r.notes:''),right-8,y,900,{size:small,lineHeight:32,maxLines:2});y+=52;officialDottedLine(ctx,M+15,y,right);y+=58;
  officialText(ctx,'اسم راصد الحالة:',right,y,body);officialDottedLine(ctx,M+15,y,right-185);officialText(ctx,officialIdentity().teacher,right-200,y,small);y+=58;
  officialText(ctx,'تاريخ الرصد:',right,y,body);officialDottedLine(ctx,770,y,right-145);if(r?.date)officialText(ctx,formatDate(r.date),right-160,y,small);
  officialText(ctx,'وقت الرصد:',740,y,body);officialDottedLine(ctx,M+15,y,625);y+=65;
  officialText(ctx,'الإجراءات المتخذة مع الحالة :',right,y,body,'700');y+=46;
  ['تبليغ إدارة التعليم.','تبليغ الجهات الأمنية.','تبليغ الحماية من العنف الأسري وحماية الطفل.','تبليغ وزارة الصحة.','التواصل مع الأسرة لإخطارها بوضع الحالة.','عقد اجتماع طارئ للجنة التوجيه الطلابي لدراسة الحالة ووضع خطة لمعالجتها بالتكامل مع الجهات ذات العلاقة.','رفع بلاغ عن الحالة في الأنظمة التقنية الخاصة بالبلاغات.'].forEach(t=>{officialText(ctx,'□ '+t,right-10,y,officialRefSize(20));y+=48});
  officialText(ctx,'مدير/مديرة المدرسة',315,1430,officialRefSize(22),'700','center');
  officialText(ctx,'الاسم: '+(officialIdentity().principal||'................................'),315,1485,sign,'400','center');
  officialText(ctx,'التوقيع: ................................',315,1535,sign,'400','center');
  officialDrawStoredSignature(ctx,'principal',315,1505,220,62);
  officialText(ctx,'التاريخ: ................................',315,1585,sign,'400','center');
  return officialPage(canvas)
}
function officialIncidentReportPage(){
  const c=currentClass(),st=officialStudent(),r=officialRecordForStudent();if(!c||!st){toast('اختر طالبًا');return null}
  const {canvas,ctx,W,M}=officialPortraitCanvas('محضر ضبط واقعة',{confidential:'سري',titleY:300}),right=W-M;
  const body=officialRefSize(21),small=officialRefSize(18);let y=445;
  officialText(ctx,'اسم الطالب/ الطالبة:',right,y,body);officialDottedLine(ctx,M+15,y,right-250);officialText(ctx,st.name,right-265,y,small);y+=58;
  officialText(ctx,'المرحلة:',right,y,body);officialDottedLine(ctx,760,y,right-105);officialText(ctx,c.grade||'',right-120,y,small);
  officialText(ctx,'الصف:',730,y,body);officialDottedLine(ctx,M+15,y,650);officialText(ctx,c.name||'',635,y,small);y+=58;
  officialText(ctx,'المشكلة السلوكية:',right,y,body);officialDottedLine(ctx,610,y,right-190);if(r?.violationLabel)officialWrappedText(ctx,r.violationLabel,right-205,y,480,{size:small,lineHeight:32,maxLines:2});
  officialText(ctx,'درجتها:',580,y,body);officialDottedLine(ctx,M+15,y,490);if(r)officialText(ctx,behaviorDegreeLabel(r.degree),475,y,small);y+=65;
  officialText(ctx,'نوع المشاهدة المضبوطة :',right,y,body);y+=48;
  officialText(ctx,'□ صور      □ مقاطع فيديو      □ محادثات      □ أخرى: ................................................',right-10,y,small);y+=55;
  officialText(ctx,'مكان ضبط الواقعة :',right,y,body);officialDottedLine(ctx,M+15,y,right-190);y+=58;
  officialText(ctx,'شهود الواقعة :',right,y,body);y+=40;
  const y0=y,headH=58,rowH=50,widths=officialFitWidths([48,340,210,275,185],W,M),heads=['م','الاسم','الوظيفة','العمل المسند إليه','التوقيع'];
  let x=W-M;heads.forEach((h,i)=>{x-=widths[i];officialCell(ctx,x,y0,widths[i],headH,h,{size:small,weight:'700',maxLines:2})});
  for(let ri=0;ri<7;ri++){let xx=W-M,yy=y0+headH+ri*rowH;[arabicNum(ri+1),'','','',''].forEach((v,i)=>{xx-=widths[i];officialCell(ctx,xx,yy,widths[i],rowH,v,{size:small})})}
  officialText(ctx,'الطالب/الطالبة',915,1380,body,'700','center');
  officialText(ctx,'الاسم: '+(st.name||'................................'),915,1430,small,'400','center');
  officialText(ctx,'التوقيع: ................................',915,1480,small,'400','center');
  officialDrawStoredSignature(ctx,'student',915,1450,210,62);
  officialText(ctx,'التاريخ: ................................',915,1530,small,'400','center');
  officialText(ctx,'ولي الأمر',620,1380,body,'700','center');
  officialText(ctx,'الاسم: ................................',620,1430,small,'400','center');
  officialText(ctx,'التوقيع: ................................',620,1480,small,'400','center');
  officialDrawStoredSignature(ctx,'guardian',620,1450,210,62);
  officialText(ctx,'التاريخ: ................................',620,1530,small,'400','center');
  officialText(ctx,'مدير/مديرة المدرسة',320,1380,body,'700','center');
  officialText(ctx,'الاسم: '+(officialIdentity().principal||'................................'),320,1430,small,'400','center');
  officialText(ctx,'التوقيع: ................................',320,1480,small,'400','center');
  officialDrawStoredSignature(ctx,'principal',320,1450,210,62);
  officialText(ctx,'التاريخ: ................................',320,1530,small,'400','center');
  return officialPage(canvas)
}
function officialPositiveCompensationPage(){
  const c=currentClass(),st=officialStudent();if(!c||!st){toast('اختر طالبًا');return null}
  const records=(c.behaviorRecords||[]).filter(r=>r.studentId===st.id).sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))).slice(0,3);
  const {canvas,ctx,W,M}=officialPortraitCanvas('نموذج فرص تعويض درجات السلوك الإيجابي',{titleY:315}),right=W-M;
  const body=officialRefSize(22),table=officialRefSize(19),sign=officialRefSize(20);
  officialText(ctx,'اسم الطالب/ الطالبة:',right,450,body);officialDottedLine(ctx,M+15,450,right-245);officialText(ctx,st.name,right-260,450,officialRefSize(19));
  officialText(ctx,'المرحلة:',right,510,body);officialDottedLine(ctx,760,510,right-105);officialText(ctx,c.grade||'',right-120,510,officialRefSize(19));
  officialText(ctx,'الصف:',730,510,body);officialDottedLine(ctx,M+15,510,650);officialText(ctx,c.name||'',635,510,officialRefSize(19));
  const y0=585,headH=95,rowH=185,widths=officialFitWidths([180,150,145,350,135,136],W,M),heads=['المشكلة السلوكية','نوعها ودرجتها','درجات السلوك المحسومة','فرص التعويض','الدرجات المكتسبة','توقيع الطالب'];
  let x=W-M;heads.forEach((h,i)=>{x-=widths[i];officialCell(ctx,x,y0,widths[i],headH,h,{size:table,weight:'700',maxLines:4})});
  for(let ri=0;ri<3;ri++){
    const r=records[ri]||null,vals=r?[r.violationLabel||'',behaviorDegreeLabel(r.degree),arabicNum(r.deduction||0),'','','']:['','','','','',''];let xx=W-M,yy=y0+headH+ri*rowH;
    vals.forEach((v,i)=>{xx-=widths[i];officialCell(ctx,xx,yy,widths[i],rowH,v,{size:i===0?officialRefSize(17):table,maxLines:5})})
  }
  officialText(ctx,'مدير/مديرة المدرسة',315,1430,officialRefSize(22),'700','center');
  officialText(ctx,'الاسم: '+(officialIdentity().principal||'................................'),315,1485,sign,'400','center');
  officialText(ctx,'التوقيع: ................................',315,1535,sign,'400','center');
  officialDrawStoredSignature(ctx,'principal',315,1505,220,62);
  officialText(ctx,'التاريخ: ................................',315,1585,sign,'400','center');
  return officialPage(canvas)
}
function officialBehaviorProblemPage(){
  const c=currentClass(),st=officialStudent();if(!c||!st){toast('اختر طالبًا');return null}
  const records=(c.behaviorRecords||[]).filter(r=>r.studentId===st.id).sort((a,b)=>String(a.date||'').localeCompare(String(b.date||''))).slice(-4);
  const {canvas,ctx,W,M}=officialPortraitCanvas('نموذج رصد مشكلة سلوكية',{titleY:315}),right=W-M;
  const body=officialRefSize(22),table=officialRefSize(18),sign=officialRefSize(20);
  officialText(ctx,'اسم الطالب / الطالبة:',right,445,body);officialDottedLine(ctx,M+15,445,right-255);officialText(ctx,st.name,right-270,445,officialRefSize(19));
  officialText(ctx,'الصف :',right,505,body);officialDottedLine(ctx,760,505,right-85);officialText(ctx,c.grade||'',right-100,505,officialRefSize(19));
  officialText(ctx,'الفصل:',730,505,body);officialDottedLine(ctx,M+15,505,650);officialText(ctx,c.name||'',635,505,officialRefSize(19));
  const y0=585,headH=100,rowH=150,widths=officialFitWidths([155,125,110,125,260,120,100,101],W,M),heads=['المشكلة السلوكية','نوعها ودرجتها','تاريخها','درجات السلوك المحسومة','الإجراءات المتخذة','تاريخ الإجراء','توقيع الطالب','توقيع ولي الأمر'];
  let x=W-M;heads.forEach((h,i)=>{x-=widths[i];officialCell(ctx,x,y0,widths[i],headH,h,{size:table,weight:'700',maxLines:4})});
  for(let ri=0;ri<4;ri++){
    const r=records[ri]||null,vals=r?[r.violationLabel||'',behaviorDegreeLabel(r.degree),r.date?formatDate(r.date):'',arabicNum(r.deduction||0),r.actionTaken||'',r.updatedAt?formatDate(String(r.updatedAt).slice(0,10)):(r.date?formatDate(r.date):''),'','']:['','','','','','','',''];let xx=W-M,yy=y0+headH+ri*rowH;
    vals.forEach((v,i)=>{xx-=widths[i];officialCell(ctx,xx,yy,widths[i],rowH,v,{size:i===0||i===4?officialRefSize(16):table,maxLines:5})})
  }
  officialText(ctx,'مدير/مديرة المدرسة',315,1430,officialRefSize(22),'700','center');
  officialText(ctx,'الاسم: '+(officialIdentity().principal||'................................'),315,1485,sign,'400','center');
  officialText(ctx,'التوقيع: ................................',315,1535,sign,'400','center');
  officialDrawStoredSignature(ctx,'principal',315,1505,220,62);
  officialText(ctx,'التاريخ: ................................',315,1585,sign,'400','center');
  return officialPage(canvas)
}
function officialDistinguishedBehaviorPage(){
  const c=currentClass(),st=officialStudent();if(!c||!st){toast('اختر طالبًا');return null}
  const {canvas,ctx,W,M}=officialPortraitCanvas('نموذج رصد درجات السلوك المتميز',{titleY:310}),right=W-M;
  const body=officialRefSize(22),table=officialRefSize(18),sign=officialRefSize(20);
  officialText(ctx,'اسم الطالب/ الطالبة',right,440,body);officialDottedLine(ctx,M+15,440,right-225);officialText(ctx,st.name,right-240,440,officialRefSize(19));
  officialText(ctx,'المرحلة:',right,500,body);officialDottedLine(ctx,760,500,right-105);officialText(ctx,c.grade||'',right-120,500,officialRefSize(19));
  officialText(ctx,'الصف:',730,500,body);officialDottedLine(ctx,M+15,500,650);officialText(ctx,c.name||'',635,500,officialRefSize(19));
  const y0=575,headH=100,rowH=88,widths=officialFitWidths([170,150,115,270,120,145,126],W,M),heads=['موضوع ممارسة السلوك المتميز','نوع ممارسة السلوك المتميز','تاريخ التنفيذ','شواهد السلوك المتميز','الدرجة المكتسبة','اسم راصد السلوك','توقيع راصد السلوك'];
  let x=W-M;heads.forEach((h,i)=>{x-=widths[i];officialCell(ctx,x,y0,widths[i],headH,h,{size:table,weight:'700',maxLines:4})});
  for(let ri=0;ri<7;ri++){let xx=W-M,yy=y0+headH+ri*rowH;heads.forEach((_,i)=>{xx-=widths[i];officialCell(ctx,xx,yy,widths[i],rowH,'',{size:table})})}
  officialText(ctx,'مدير/مديرة المدرسة',315,1410,officialRefSize(22),'700','center');
  officialText(ctx,'الاسم: '+(officialIdentity().principal||'................................'),315,1460,sign,'400','center');
  officialText(ctx,'التوقيع: ................................',315,1510,sign,'400','center');
  officialDrawStoredSignature(ctx,'principal',315,1480,220,62);
  officialText(ctx,'التاريخ: ................................',315,1560,sign,'400','center');
  officialPageNumber(ctx,59);
  return officialPage(canvas)
}
function officialReferralPage(){
  const c=currentClass(),st=officialStudent(),r=officialRecordForStudent();if(!c||!st||!r){toast('اختر طالبًا وسجلًا سلوكيًا');return null}
  const {canvas,ctx,W,M}=officialPortraitCanvas('إحـالـة طـالـب/ـة',{confidential:'سري',titleY:335}),right=W-M;
  const body=officialRefSize(22),small=officialRefSize(20);let y=530;
  officialText(ctx,'المكرم الموجه الطلابي / الموجهة الطلابية',right,y,body);y+=72;
  officialText(ctx,'السلام عليكم ورحمة الله وبركاته',W/2,y,body,'400','center');y+=82;
  officialText(ctx,'نحيل إليكم الطالب/الطالبة',right,y,body);officialDottedLine(ctx,M+20,y,right-300);officialText(ctx,st.name,right-315,y,small);y+=72;
  officialText(ctx,'بالصف',right,y,body);officialDottedLine(ctx,820,y,right-75);officialText(ctx,officialStudentGradeLine(c),right-90,y,small);
  officialText(ctx,'ذي المشكلة السلوكية من الدرجة',790,y,body);officialDottedLine(ctx,510,y,430);officialText(ctx,behaviorDegreeLabel(r.degree),415,y,small);y+=72;
  officialText(ctx,'وهي',right,y,body);officialDottedLine(ctx,M+20,y,right-55);officialWrappedText(ctx,r.violationLabel||'',right-70,y,900,{size:small,lineHeight:34,maxLines:2});y+=66;
  officialDottedLine(ctx,M+20,y,right);y+=80;
  officialWrappedText(ctx,'يرجى منكم متابعة الطالب/الطالبة ودراسة حالته/حالتها، ووضع الحلول التربوية والعلاجية المناسبة.',right,y,W-2*M,{size:body,lineHeight:40,maxLines:2});
  officialText(ctx,'الختم',880,1325,body,'400','center');
  officialText(ctx,'وكيل/وكيلة شؤون الطلبة',320,1295,body,'700','center');
  officialText(ctx,'الاسم: ........................................',320,1355,small,'400','center');
  officialText(ctx,'التوقيع: .....................................',320,1410,small,'400','center');
  officialDrawStoredSignature(ctx,'vice_principal',320,1380,220,62);
  officialText(ctx,'التاريخ: ......................................',320,1465,small,'400','center');
  return officialPage(canvas)
}
function officialBehaviorPlanPages(){
  const c=currentClass(),st=officialStudent(),r=officialRecordForStudent();if(!c||!st){toast('اختر طالبًا');return []}
  const pages=[];
  {
    const {canvas,ctx,W,M}=officialPortraitCanvas('نموذج خطة تعديل السلوك',{titleY:285}),right=W-M;
    const body=officialRefSize(20),head=officialRefSize(21),table=officialRefSize(17);let y=380;
    officialText(ctx,'أولاً: البيانات الأولية:',right,y,head,'700');y+=48;
    officialText(ctx,'اسم الطالب:',right,y,body);officialDottedLine(ctx,850,y,right-130);officialText(ctx,st.name,right-145,y,officialRefSize(18));
    officialText(ctx,'الصف:',820,y,body);officialDottedLine(ctx,650,y,760);officialText(ctx,c.grade||'',745,y,officialRefSize(18));
    officialText(ctx,'الفصل:',620,y,body);officialDottedLine(ctx,M+15,y,535);officialText(ctx,c.name||'',520,y,officialRefSize(18));y+=52;
    officialText(ctx,'تاريخ الميلاد:',right,y,body);officialDottedLine(ctx,815,y,right-145);
    officialText(ctx,'العمر الزمني:',780,y,body);officialDottedLine(ctx,M+15,y,640);y+=52;
    officialText(ctx,'تاريخ البداية:',right,y,body);officialDottedLine(ctx,815,y,right-145);
    officialText(ctx,'تاريخ النهاية::',780,y,body);officialDottedLine(ctx,M+15,y,620);y+=58;
    officialText(ctx,'ثانياً: تحديد المشكلة السلوكية:',right,y,head,'700');y+=44;
    officialText(ctx,'المشكلة السلوكية:',right,y,body);officialDottedLine(ctx,550,y,right-190);if(r)officialWrappedText(ctx,r.violationLabel||'',right-205,y,470,{size:officialRefSize(18),lineHeight:30,maxLines:2});
    officialText(ctx,'درجتها:',520,y,body);officialDottedLine(ctx,M+15,y,430);if(r)officialText(ctx,behaviorDegreeLabel(r.degree),415,y,officialRefSize(18));y+=56;
    officialText(ctx,'وصف المشكلة السلوكية',right,y,body);y+=34;officialDottedLine(ctx,M+15,y,right);if(r?.notes)officialWrappedText(ctx,r.notes,right-8,y,900,{size:officialRefSize(18),lineHeight:30,maxLines:2});y+=55;
    officialText(ctx,'المظاهر السلوكية التي تبدو عند الطالب',right,y,body);y+=34;officialDottedLine(ctx,M+15,y,right);y+=60;
    officialText(ctx,'ثالث: قياس شدة أوتكرار السلوك:',right,y,head,'700');y+=38;
    const y0=y,headH=54,rowH=56,widths=officialFitWidths([100,135,150,85,85,85,85,85,120],W,M),heads=['اليوم','التاريخ','فترة الملاحظة','1','2','3','4','5','المجموع'];
    let x=W-M;heads.forEach((h,i)=>{x-=widths[i];officialCell(ctx,x,y0,widths[i],headH,h,{size:table,weight:'700',maxLines:2})});
    let xx=W-M;const vals=[r?.date?new Date(r.date+'T12:00:00').toLocaleDateString('ar-SA',{weekday:'long'}):'',r?.date?formatDate(r.date):'',r?.period?'الحصة '+arabicNum(r.period):'',r?'✓':'','','','','',r?arabicNum(behaviorRecordOccurrenceOrdinal(r,c)):''];
    vals.forEach((v,i)=>{xx-=widths[i];officialCell(ctx,xx,y0+headH,widths[i],rowH,v,{size:table})});y=y0+headH+rowH+46;
    officialText(ctx,'رابعاً: تحديد المشكلة السلوكية:',right,y,head,'700');y+=40;
    const qs=['1. المثيرات القبلية للسلوك: اذكر الأسباب التي تسبب السلوك غير المرغوب فيه من خلال ملاحظتك للسلوك ؟','2. المثيرات البعدية: ماذا يحدث بعد السلوك غير المرغوب فيه؟','3. ما الذي يحققه الطالب/ الطالبة من خلال السلوك غير المرغوب فيه؟','4. الإجراءات السابقة التي تم استخدامها للحد من السلوك من قبل المعلم/ المعلمة ؟'];
    qs.forEach(q=>{officialWrappedText(ctx,q,right,y,W-2*M,{size:officialRefSize(18),lineHeight:30,maxLines:2});y+=58});
    pages.push(officialPage(canvas))
  }
  {
    const canvas=document.createElement('canvas');canvas.width=OFFICIAL_A4_WIDTH;canvas.height=OFFICIAL_A4_HEIGHT;
    const ctx=canvas.getContext('2d',{alpha:false});ctx.fillStyle='#fff';ctx.fillRect(0,0,OFFICIAL_A4_WIDTH,OFFICIAL_A4_HEIGHT);
    const W=OFFICIAL_A4_WIDTH,M=OFFICIAL_A4_SIDE,right=W-M,body=officialRefSize(20),head=officialRefSize(21),table=officialRefSize(17);
    // Page 61 reference uses its special logo-only header.
    officialLogo(ctx,W-M-75,45,165,98);
    let y=220;officialText(ctx,'خامساً: تصميم خطة تعديل السلوك',right,y,head,'700');y+=56;
    officialText(ctx,'تعريف السلوك المرغوب في إكسابه للطالب/ الطالبة إجرائياً.',right,y,body);y+=36;officialDottedLine(ctx,M+15,y,right);y+=62;
    officialText(ctx,'الإجراءات المستخدمة للحد من السلوك غير المرغوب فيه وتساعد على تحقيق السلوك المرغوب :',right,y,body);y+=48;
    const procedures=[r?.actionTaken||'','','','','',''];
    procedures.forEach((v,i)=>{officialText(ctx,'الإجراء '+['الأول','الثاني','الثالث','الرابع','الخامس','السادس'][i]+':',right,y,body);officialDottedLine(ctx,M+15,y,right-145);if(v)officialWrappedText(ctx,v,right-160,y,820,{size:officialRefSize(18),lineHeight:30,maxLines:2});y+=57});
    officialText(ctx,'متابعة السلوك:',right,y+4,head,'700');y+=50;
    const y0=y,headH=54,rowH=56,widths=officialFitWidths([100,135,150,85,85,85,85,85,120],W,M),heads=['اليوم','التاريخ','فترة الملاحظة','1','2','3','4','5','المجموع'];
    let x=W-M;heads.forEach((h,i)=>{x-=widths[i];officialCell(ctx,x,y0,widths[i],headH,h,{size:table,weight:'700',maxLines:2})});
    let xx=W-M;heads.forEach((_,i)=>{xx-=widths[i];officialCell(ctx,xx,y0+headH,widths[i],rowH,'',{size:table})});y=y0+headH+rowH+55;
    officialText(ctx,'سادساً: تقييم فاعلية الخطة أو البرنامج:',right,y,head,'700');y+=48;
    ['رأي وكيل/وكيلة المدرسة:','رأي معلم/معلمة الفصل:','رأي ولي الأمر:'].forEach(q=>{officialText(ctx,q,right,y,body);officialDottedLine(ctx,M+15,y,right-285);y+=52});
    officialText(ctx,'القائم بتعديل السلوك (معلم/معلمة - موجه طلابي/موجهة طلابية)',355,1380,body,'400','center');
    officialText(ctx,'الاسم: ................................................',355,1435,officialRefSize(18),'400','center');
    officialText(ctx,'التوقيع: .............................................',355,1485,officialRefSize(18),'400','center');
    officialDrawStoredSignature(ctx,'specialist',355,1455,240,62);
    officialText(ctx,'التاريخ: ..............................................',355,1535,officialRefSize(18),'400','center');
    pages.push(officialPage(canvas))
  }
  return pages
}
function renderOfficialFormsSelectors(){
  const c=currentClass(),student=$('#officialFormsStudent'),record=$('#officialFormsRecord');if(!c||!student||!record)return;
  const prev=officialFormsStudentId||student.value||c.students?.[0]?.id||'';
  student.innerHTML=(c.students||[]).map(st=>`<option value="${escapeHtml(st.id)}">${escapeHtml(st.name)}</option>`).join('');
  officialFormsStudentId=(c.students||[]).some(st=>st.id===prev)?prev:(c.students?.[0]?.id||'');student.value=officialFormsStudentId;officialRefreshSignatureButtons();
  const recs=(c.behaviorRecords||[]).filter(r=>r.studentId===officialFormsStudentId).sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
  record.innerHTML='<option value="">آخر سجل للطالب</option>'+recs.map(r=>`<option value="${escapeHtml(r.id)}">${escapeHtml(r.date||'')} — ${escapeHtml(r.violationLabel||'مخالفة')}</option>`).join('');
  if(recs.some(r=>r.id===officialFormsRecordId))record.value=officialFormsRecordId;else{officialFormsRecordId='';record.value=''}
  const stats=$('#officialFormsStudentStats'),st=officialStudent();if(stats&&st){const n=officialAbsenceCounts(st);stats.textContent=`غياب بعذر: ${arabicNum(n.excused)} · بدون عذر: ${arabicNum(n.unexcused)} · مخالفات: ${arabicNum(recs.length)}`}
  const identitySummary=$('#officialFormsIdentitySummary');if(identitySummary)identitySummary.textContent=officialIdentitySummaryText();
}
function openOfficialFormsCenter({studentId='',recordId=''}={}){
  officialFormsStudentId=studentId||officialFormsStudentId||currentClass()?.students?.[0]?.id||'';
  officialFormsRecordId=recordId||'';
  renderOfficialFormsSelectors();
  const dlg=$('#officialFormsModal');if(!dlg)return;
  if(typeof dlg.showModal==='function')dlg.showModal();else dlg.setAttribute('open','')
}
async function printOfficialForm(type){
  try{
    await officialEnsurePrintReady();
    let page=null,title='',filename='';
    if(type==='teacher-log'){printOfficialTeacherLog(officialFormsRecordId);return}
    if(type==='behavior-undertaking'){page=officialBehaviorUndertakingPage();title='تعهد سلوكي';filename='تعهد-سلوكي.pdf'}
    else if(type==='parent-notice'){page=officialParentNoticePage();title='إشعار ولي الأمر بمشكلة سلوكية';filename='إشعار-ولي-الأمر.pdf'}
    else if(type==='parent-invitation'){page=officialParentInvitationPage();title='خطاب دعوة ولي الأمر';filename='دعوة-ولي-الأمر.pdf'}
    else if(type==='high-risk'){page=officialHighRiskPage();title='إبلاغ عن حالة عالية الخطورة';filename='حالة-عالية-الخطورة.pdf'}
    else if(type==='absence-excused'){page=officialAbsenceProceduresPage('excused');title='إجراءات الغياب بعذر';filename='إجراءات-الغياب-بعذر.pdf'}
    else if(type==='absence-unexcused'){page=officialAbsenceProceduresPage('unexcused');title='إجراءات الغياب بدون عذر';filename='إجراءات-الغياب-بدون-عذر.pdf'}
    else if(type==='attendance-commitment'){page=officialAttendanceCommitmentPage();title='تعهد الالتزام بالحضور';filename='تعهد-الالتزام-بالحضور.pdf'}
    else if(type==='incident-report'){page=officialIncidentReportPage();title='محضر ضبط واقعة';filename='محضر-ضبط-واقعة.pdf'}
    else if(type==='positive-compensation'){page=officialPositiveCompensationPage();title='فرص تعويض درجات السلوك الإيجابي';filename='تعويض-درجات-السلوك-الإيجابي.pdf'}
    else if(type==='behavior-problem'){page=officialBehaviorProblemPage();title='نموذج رصد مشكلة سلوكية';filename='رصد-مشكلة-سلوكية.pdf'}
    else if(type==='distinguished-behavior'){page=officialDistinguishedBehaviorPage();title='رصد درجات السلوك المتميز';filename='رصد-السلوك-المتميز.pdf'}
    else if(type==='student-referral'){page=officialReferralPage();title='إحالة طالب/ـة';filename='إحالة-طالب.pdf'}
    else if(type==='behavior-plan'){const pages=officialBehaviorPlanPages();if(!pages.length)return;officialOpenPdf(pages,'خطة-تعديل-السلوك.pdf','خطة تعديل السلوك');return}
    else{toast('هذا النموذج غير متاح');return}
    if(page)officialOpenPdf([page],filename,title)
  }catch(err){console.error(err);toast('تعذر إنشاء النموذج الرسمي')}
}
function initOfficialForms(){
  $('#officialFormsBtn')?.addEventListener('click',()=>openOfficialFormsCenter());
  $('#attendanceOfficialFormsBtn')?.addEventListener('click',()=>openOfficialFormsCenter());
  $('#officialFormsStudent')?.addEventListener('change',e=>{officialFormsStudentId=e.target.value;officialFormsRecordId='';renderOfficialFormsSelectors();officialRefreshSignatureButtons()});
  $('#officialFormsRecord')?.addEventListener('change',e=>{officialFormsRecordId=e.target.value});
  $('#officialFormsGrid')?.addEventListener('click',async e=>{const b=e.target.closest('[data-official-form]');if(b)await printOfficialForm(b.dataset.officialForm)});
  $('#officialSignatureButtons')?.addEventListener('click',e=>{const b=e.target.closest('[data-sign-role]');if(b)officialOpenSignatureCapture(b.dataset.signRole)});
  $('#clearOfficialSignaturesBtn')?.addEventListener('click',officialClearAllSignatures);
  officialInitSignaturePad();officialRefreshSignatureButtons();
}
