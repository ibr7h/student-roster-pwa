/* Official behavior & attendance forms — development branch only.
   Reference: Ministry of Education, Rules of Behavior and Attendance,
   fifth edition 1447H / 2025. */
const OFFICIAL_FORM_FONT='"Sakkal Majalla","Traditional Arabic","Noto Naskh Arabic",Arial,Tahoma,sans-serif';
let officialFormsStudentId='',officialFormsRecordId='';

function officialFont(ctx,size=24,weight='400'){
  ctx.font=`${weight} ${size}px ${OFFICIAL_FORM_FONT}`;
}
function officialText(ctx,text,x,y,size=24,weight='400',align='right',color='#194f5b'){
  ctx.save();ctx.direction='rtl';ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillStyle=color;officialFont(ctx,size,weight);ctx.fillText(String(text??''),x,y);ctx.restore()
}
function officialLine(ctx,x1,y1,x2,y2,width=1,color='#aeb5b7'){
  ctx.save();ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();ctx.restore()
}
function officialDottedLine(ctx,x1,y,x2,color='#2b4854'){
  ctx.save();ctx.strokeStyle=color;ctx.lineWidth=1.3;ctx.setLineDash([2.5,3.5]);ctx.beginPath();ctx.moveTo(x1,y);ctx.lineTo(x2,y);ctx.stroke();ctx.restore()
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
function officialWrappedText(ctx,text,x,y,maxWidth,{size=21,weight='400',lineHeight=30,maxLines=4,align='right',color='#174b51'}={}){
  const lines=officialWrappedLines(ctx,text,maxWidth,size,weight,maxLines);
  lines.forEach((ln,i)=>officialText(ctx,ln,x,y+i*lineHeight,size,weight,align,color));
  return y+Math.max(1,lines.length)*lineHeight
}
function officialCell(ctx,x,y,w,h,text,{size=18,weight='400',align='center',fill='#fff',maxLines=4}={}){
  ctx.save();ctx.fillStyle=fill;ctx.fillRect(x,y,w,h);ctx.strokeStyle='#657b89';ctx.lineWidth=1.4;ctx.strokeRect(x,y,w,h);ctx.restore();
  const lines=officialWrappedLines(ctx,text,w-12,size,weight,maxLines),lh=Math.min(size*1.35,h/Math.max(1,lines.length));
  const start=y+h/2-(Math.max(1,lines.length)-1)*lh/2;
  if(!lines.length)officialText(ctx,'',x+w/2,y+h/2,size,weight,align);
  else lines.forEach((ln,i)=>officialText(ctx,ln,align==='right'?x+w-7:align==='left'?x+7:x+w/2,start+i*lh,size,weight,align));
}
function officialLogo(ctx,cx,y,w=150,h=90){
  const logo=document.querySelector('.app-brand-logo')||document.querySelector('img[src*="moe-logo"]');
  if(logo?.complete&&logo.naturalWidth){try{ctx.drawImage(logo,cx-w/2,y,w,h)}catch{}}
}
function officialHeader(ctx,title,{confidential='',titleY=250}={}){
  const W=1240,M=72,gov=state.appMeta||{},center=W/2;
  officialText(ctx,'المملكة العربية السعودية',W-M,86,23,'400');
  officialText(ctx,'وزارة التعليم',W-M,123,23,'400');
  officialLogo(ctx,center,55,170,100);
  officialText(ctx,'المنطقة/المحافظة: '+(gov.region||'........................'),M,90,20,'400','left');
  officialText(ctx,'المدرسة: '+(gov.school||'........................'),M,128,20,'400','left');
  if(confidential)officialText(ctx,confidential,center,titleY-58,26,'700','center','#222');
  officialText(ctx,title,center,titleY,32,'700','center');
}
function officialPortraitCanvas(title,opts={}){
  const canvas=document.createElement('canvas');canvas.width=1240;canvas.height=1754;
  const ctx=canvas.getContext('2d',{alpha:false});ctx.fillStyle='#fff';ctx.fillRect(0,0,1240,1754);
  officialHeader(ctx,title,opts);return {canvas,ctx,W:1240,H:1754,M:72}
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

function officialTeacherLogPages(recordId=''){
  const c=currentClass();if(!c)return [];
  const g=behaviorAudience(),records=(c.behaviorRecords||[]).filter(r=>!recordId||r.id===recordId).sort((a,b)=>String(a.date||'').localeCompare(String(b.date||'')));
  if(!records.length)return [];
  const chunks=[];for(let i=0;i<records.length;i+=6)chunks.push(records.slice(i,i+6));
  return chunks.map((chunk,pageIndex)=>{
    const {canvas,ctx,W,M}=officialPortraitCanvas(`نموذج رصد ${g.teacher} لمشكلة سلوكية`,{titleY:255});
    const right=W-M;
    officialText(ctx,'المادة:',right,350,22,'400');officialDottedLine(ctx,150,350,right-90);officialText(ctx,c.subject||'',right-100,350,22,'400');
    officialText(ctx,'الصف:',right,405,22,'400');officialDottedLine(ctx,150,405,right-75);officialText(ctx,officialStudentGradeLine(c),right-90,405,22,'400');
    const y0=485,headH=125,rowH=105;
    const widths=[45,125,205,100,160,155,155,120,95];
    const heads=['م',g.studentName||'اسم الطالب','المشكلة السلوكية','درجة المشكلة','الإجراء المتخذ','مدى الاستجابة','عدد مرات تكرار المشكلة السلوكية','التاريخ','الحصة'];
    let x=W-M;
    heads.forEach((h,i)=>{x-=widths[i];officialCell(ctx,x,y0,widths[i],headH,h,{size:17,weight:'700',maxLines:4})});
    for(let ri=0;ri<6;ri++){
      const r=chunk[ri]||null,y=y0+headH+ri*rowH;let xx=W-M;
      const vals=r?[arabicNum(pageIndex*6+ri+1),behaviorStudentName(r.studentId,c),r.violationLabel||'',behaviorDegreeLabel(r.degree),r.actionTaken||'',r.response||'',arabicNum(behaviorRecordOccurrenceOrdinal(r,c)),r.date?formatDate(r.date):'',r.period?arabicNum(r.period):'']:['','','','','','','','',''];
      vals.forEach((v,i)=>{xx-=widths[i];officialCell(ctx,xx,y,widths[i],rowH,v,{size:i===2||i===4?16:17,weight:'400',maxLines:5})})
    }
    officialSignatureBlock(ctx,270,1450,g.teacher,state.appMeta?.teacher||'');
    return officialPage(canvas)
  })
}
function printOfficialTeacherLog(recordId=''){
  const pages=officialTeacherLogPages(recordId);if(!pages.length){toast('لا توجد مخالفات لطباعة النموذج');return}
  officialOpenPdf(pages,'نموذج-رصد-المعلم.pdf','نموذج رصد المعلم لمشكلة سلوكية')
}

function officialBehaviorUndertakingPage(){
  const c=currentClass(),st=officialStudent(),r=officialRecordForStudent();if(!c||!st||!r){toast('اختر طالبًا وسجلًا سلوكيًا');return null}
  const g=behaviorAudience(),{canvas,ctx,W,M}=officialPortraitCanvas('تعهــــد سلوكي',{titleY:305}),right=W-M;
  let y=500;
  const line=(label,value='')=>{officialText(ctx,label,right,y,24,'400');officialDottedLine(ctx,M+35,y,right-210);if(value)officialText(ctx,value,right-220,y,22,'400');y+=72};
  line(`أنا ${g.student}/${g.studentBare==='طالب'?'الطالبة':'الطالب'}`,st.name);
  line('بالصف',officialStudentGradeLine(c));
  line('أنني قمت في يوم',r.date?formatDate(r.date):'');
  line('بمشكلة سلوكية من الدرجة',behaviorDegreeLabel(r.degree));
  line('وهي',r.violationLabel||'');
  officialText(ctx,'وأتعهد بعدم تكرار أي مشكلة سلوكية مستقبلاً، وعلى ذلك جرى التوقيع.',right,885,24,'400');
  officialSignatureBlock(ctx,930,1240,g.student,st.name);
  officialSignatureBlock(ctx,620,1240,'ولي الأمر','');
  officialSignatureBlock(ctx,300,1240,g.principal,state.appMeta?.principal||'');
  return officialPage(canvas)
}
function officialParentNoticePage(){
  const c=currentClass(),st=officialStudent(),r=officialRecordForStudent();if(!c||!st||!r){toast('اختر طالبًا وسجلًا سلوكيًا');return null}
  const g=behaviorAudience(),{canvas,ctx,W,M}=officialPortraitCanvas(`إشعار ولي أمر ${g.student}/الطالبة بمشكلة سلوكية`,{confidential:'سري',titleY:330}),right=W-M;
  let y=500;
  officialText(ctx,`المكرم ولي أمر ${g.student}/الطالبة`,right,y,24,'400');officialDottedLine(ctx,M+50,y,right-315);officialText(ctx,st.name,right-325,y,22);y+=65;
  officialText(ctx,'بالصف:',right,y,24);officialDottedLine(ctx,M+50,y,right-90);officialText(ctx,officialStudentGradeLine(c),right-100,y,22);y+=85;
  officialText(ctx,'السلام عليكم ورحمة الله وبركاته',W/2,y,24,'400','center');y+=75;
  officialWrappedText(ctx,`نشعركم بأن ${g.student}/الطالبة قام/قامت بمشكلة سلوكية من الدرجة ${behaviorDegreeLabel(r.degree)}.`,right,y,W-2*M,{size:24,lineHeight:38,maxLines:2});y+=85;
  officialText(ctx,'وهي:',right,y,24);officialDottedLine(ctx,M+60,y,right-75);officialWrappedText(ctx,r.violationLabel||'',right-85,y,760,{size:22,maxLines:2});y+=100;
  officialText(ctx,'وقد قُررت الإجراءات التالية حياله/حيالها وفق ما ورد في قواعد السلوك والمواظبة:',right,y,23);y+=60;
  [r.actionTaken||'',r.response?('مدى الاستجابة: '+r.response):'',''].forEach((v,i)=>{officialText(ctx,arabicNum(i+1)+'.',right,y,22);officialDottedLine(ctx,M+40,y,right-45);if(v)officialWrappedText(ctx,v,right-60,y,850,{size:21,maxLines:2});y+=62});
  officialText(ctx,'لذا يرجى منكم المتابعة والتعاون مع المدرسة بما يسهم في انضباط سلوك ابنكم/ابنتكم.',right,y+30,22);
  officialSignatureBlock(ctx,300,1370,g.principal,state.appMeta?.principal||'');
  officialText(ctx,'الختم',900,1480,22,'700','center');
  return officialPage(canvas)
}
function officialParentInvitationPage(){
  const c=currentClass(),st=officialStudent();if(!c||!st){toast('اختر طالبًا');return null}
  const g=behaviorAudience(),r=officialRecordForStudent(),{canvas,ctx,W,M}=officialPortraitCanvas('خطاب دعوة ولي الأمر',{titleY:315}),right=W-M;
  let y=500;
  officialText(ctx,`المكرم ولي أمر ${g.student}/الطالبة`,right,y,24);officialDottedLine(ctx,M+40,y,right-315);officialText(ctx,st.name,right-325,y,22);y+=70;
  officialText(ctx,'بالصف',right,y,24);officialDottedLine(ctx,M+40,y,right-80);officialText(ctx,officialStudentGradeLine(c),right-90,y,22);y+=90;
  officialText(ctx,'السلام عليكم ورحمة الله وبركاته',W/2,y,25,'400','center');y+=85;
  officialText(ctx,'نأمل منكم الحضور إلى المدرسة في يوم ........................ الموافق '+officialHijriPlaceholder(),right,y,23);y+=65;
  officialText(ctx,'لمقابلة مدير/مديرة المدرسة، وذلك بهدف:',right,y,23);officialDottedLine(ctx,M+40,y,right-390);if(r)officialWrappedText(ctx,'مناقشة المشكلة السلوكية: '+(r.violationLabel||''),right-405,y,700,{size:21,maxLines:2});y+=105;
  officialText(ctx,'شاكرين لكم تعاونكم معنا لتحقيق مصلحة الطالب.',W/2,y,24,'400','center');
  officialSignatureBlock(ctx,295,1090,g.principal,state.appMeta?.principal||'');officialText(ctx,'الختم',910,1190,22,'700','center');
  officialText(ctx,'رد ولي الأمر:',right,1370,23,'700');officialText(ctx,'□ أقر بالعلم، وسأحضر في الموعد المحدد.',right,1425,21);
  officialText(ctx,'□ أقر بالعلم، وأرغب بتغيير الموعد (خلال نفس الأسبوع).',right,1480,21);
  officialText(ctx,'الاسم: .......................................   التوقيع: .......................................   التاريخ: ........................',right,1585,20);
  return officialPage(canvas)
}
function officialAbsenceCounts(st){
  const values=Object.values(st?.attendance||{});
  return {excused:values.filter(v=>v==='absent_excused').length,unexcused:values.filter(v=>v==='absent').length}
}
function officialAbsenceProceduresPage(kind='excused'){
  const c=currentClass(),st=officialStudent();if(!c||!st){toast('اختر طالبًا');return null}
  const g=behaviorAudience(),isExcused=kind==='excused',title=isExcused?'نموذج إجراءات الغياب بعذر':'نموذج إجراءات الغياب بدون عذر';
  const {canvas,ctx,W,M}=officialPortraitCanvas(title,{titleY:315}),right=W-M;
  officialText(ctx,`اسم ${g.student}/الطالبة:`,right,470,23);officialDottedLine(ctx,M+50,470,right-220);officialText(ctx,st.name,right-235,470,22);
  officialText(ctx,'المرحلة:',right,535,23);officialDottedLine(ctx,680,535,right-110);officialText(ctx,c.grade||'',right-125,535,22);
  officialText(ctx,'الصف:',650,535,23);officialDottedLine(ctx,M+50,535,590);officialText(ctx,c.name||'',575,535,22);
  const y0=625,headH=110,rowH=isExcused?165:135;
  const headers=isExcused?['عدد أيام الغياب','الإجراء المتخذ','تاريخ الإجراء',`توقيع ${g.student}`,'توقيع ولي الأمر']:['عدد أيام الغياب','الإجراء المتخذ','تاريخ الإجراء',`توقيع ${g.student}`,'توقيع ولي الأمر','عدد درجات المواظبة المحسومة'];
  const widths=isExcused?[135,500,170,170,170]:[125,410,150,145,145,150];
  let x=W-M;headers.forEach((h,i)=>{x-=widths[i];officialCell(ctx,x,y0,widths[i],headH,h,{size:18,weight:'700',maxLines:4})});
  const thresholds=isExcused?['٣ أيام','٥ أيام','١٠ أيام']:['٣ أيام','٣ أيام متصلة','٥ أيام','١٠ أيام'];
  thresholds.forEach((lab,ri)=>{let xx=W-M,y=y0+headH+ri*rowH;headers.forEach((h,i)=>{xx-=widths[i];officialCell(ctx,xx,y,widths[i],rowH,i===0?lab:'',{size:19,weight:i===0?'700':'400'})})});
  const count=officialAbsenceCounts(st)[kind==='excused'?'excused':'unexcused'];
  officialText(ctx,`المسجل حاليًا في التطبيق: ${arabicNum(count)} ${count===1?'يوم':'أيام'}`,right,y0+headH+thresholds.length*rowH+55,20,'700');
  officialSignatureBlock(ctx,300,1450,g.principal,state.appMeta?.principal||'');
  return officialPage(canvas)
}
function officialAttendanceCommitmentPage(){
  const c=currentClass(),st=officialStudent();if(!c||!st){toast('اختر طالبًا');return null}
  const g=behaviorAudience(),count=officialAbsenceCounts(st).unexcused,dates=Object.entries(st.attendance||{}).filter(([,v])=>v==='absent').map(([d])=>formatDate(d));
  const {canvas,ctx,W,M}=officialPortraitCanvas('تعهــــد الالتزام بالحضور',{titleY:350}),right=W-M;
  let y=570;
  officialText(ctx,`أنا ${g.student}/الطالبة`,right,y,25);officialDottedLine(ctx,M+40,y,right-220);officialText(ctx,st.name,right-235,y,23);y+=75;
  officialText(ctx,'بالصف',right,y,25);officialDottedLine(ctx,M+40,y,right-80);officialText(ctx,officialStudentGradeLine(c),right-95,y,23);y+=90;
  officialText(ctx,`أنني تغيبت عن الحضور للمدرسة بدون عذر لمدة ${arabicNum(count)} أيام، بتاريخ:`,right,y,24);y+=55;
  officialDottedLine(ctx,M+60,y,right);if(dates.length)officialWrappedText(ctx,dates.join('، '),right-10,y,900,{size:20,maxLines:2});y+=100;
  officialText(ctx,'وأتعهد بالالتزام بالخطة التربوية والعلاجية المقدمة لتحسين الحضور، وعلى ذلك جرى التوقيع.',right,y,23);
  officialSignatureBlock(ctx,930,1210,g.student,st.name);officialSignatureBlock(ctx,620,1210,'ولي الأمر','');officialSignatureBlock(ctx,300,1210,g.principal,state.appMeta?.principal||'');
  return officialPage(canvas)
}
function officialHighRiskPage(){
  const c=currentClass(),st=officialStudent(),r=officialRecordForStudent();if(!c||!st){toast('اختر طالبًا');return null}
  const g=behaviorAudience(),{canvas,ctx,W,M}=officialPortraitCanvas('نموذج إبلاغ عن حالة عالية الخطورة',{confidential:'(سري للغاية)',titleY:330}),right=W-M;
  let y=500;
  const valueLine=(label,value='')=>{officialText(ctx,label,right,y,23);officialDottedLine(ctx,M+50,y,right-190);if(value)officialText(ctx,value,right-205,y,21);y+=70};
  valueLine(`اسم ${g.student}/الطالبة`,st.name);valueLine('الصف الدراسي',officialStudentGradeLine(c));
  officialText(ctx,'وصف الحالة:',right,y,23,'700');y+=48;officialDottedLine(ctx,M+50,y,right);if(r)officialWrappedText(ctx,(r.violationLabel||'')+(r.notes?' — '+r.notes:''),right-10,y,1000,{size:21,maxLines:3});y+=130;
  valueLine('اسم راصد الحالة',state.appMeta?.teacher||'');valueLine('تاريخ الرصد',r?.date?formatDate(r.date):'');valueLine('وقت الرصد','');
  officialText(ctx,'الإجراءات المتخذة مع الحالة:',right,y,23,'700');y+=52;
  ['تبليغ إدارة التعليم.','تبليغ الجهات الأمنية.','تبليغ الحماية من العنف الأسري وحماية الطفل.','تبليغ وزارة الصحة.','التواصل مع الأسرة لإخطارها بوضع الحالة.','عقد اجتماع طارئ للجنة التوجيه الطلابي لدراسة الحالة ووضع خطة لمعالجتها بالتكامل مع الجهات ذات العلاقة.','رفع بلاغ عن الحالة في الأنظمة التقنية الخاصة بالبلاغات.'].forEach(t=>{officialText(ctx,'□ '+t,right,y,20);y+=46});
  officialSignatureBlock(ctx,300,1450,g.principal,state.appMeta?.principal||'');
  return officialPage(canvas)
}


function officialIncidentReportPage(){
  const c=currentClass(),st=officialStudent(),r=officialRecordForStudent();if(!c||!st){toast('اختر طالبًا');return null}
  const g=behaviorAudience(),{canvas,ctx,W,M}=officialPortraitCanvas('محضر ضبط واقعة',{confidential:'سري',titleY:330}),right=W-M;
  let y=500;
  const line=(label,value='',end=right-190)=>{
    officialText(ctx,label,right,y,22);officialDottedLine(ctx,M+40,y,end);
    if(value)officialWrappedText(ctx,value,end-12,y,Math.max(220,end-M-60),{size:20,maxLines:2});y+=62
  };
  line('اسم الطالب/ الطالبة:',st.name,right-230);
  officialText(ctx,'المرحلة:',right,y,22);officialDottedLine(ctx,760,y,right-100);officialText(ctx,c.grade||'',right-115,y,20);
  officialText(ctx,'الصف:',730,y,22);officialDottedLine(ctx,M+40,y,650);officialText(ctx,c.name||'',635,y,20);y+=62;
  officialText(ctx,'المشكلة السلوكية:',right,y,22);officialDottedLine(ctx,615,y,right-185);
  if(r?.violationLabel)officialWrappedText(ctx,r.violationLabel,right-200,y,470,{size:19,maxLines:2});
  officialText(ctx,'درجتها:',590,y,22);officialDottedLine(ctx,M+40,y,500);if(r)officialText(ctx,behaviorDegreeLabel(r.degree),485,y,20);y+=72;
  officialText(ctx,'نوع المشاهدة المضبوطة:',right,y,22,'700');y+=50;
  officialText(ctx,'□ صور     □ مقاطع فيديو     □ محادثات     □ أخرى: ................................................',right-25,y,20);y+=62;
  line('مكان ضبط الواقعة:','',right-190);
  officialText(ctx,'شهود الواقعة:',right,y,22,'700');y+=42;
  const y0=y,headH=58,rowH=50,widths=[48,340,210,275,185],heads=['م','الاسم','الوظيفة','العمل المسند إليه','التوقيع'];
  let x=W-M;heads.forEach((h,i)=>{x-=widths[i];officialCell(ctx,x,y0,widths[i],headH,h,{size:18,weight:'700'})});
  for(let ri=0;ri<7;ri++){let xx=W-M,yy=y0+headH+ri*rowH;[''+(ri+1),'','','',''].forEach((v,i)=>{xx-=widths[i];officialCell(ctx,xx,yy,widths[i],rowH,v,{size:17})})}
  officialSignatureBlock(ctx,930,1450,'الطالب/الطالبة',st.name);
  officialSignatureBlock(ctx,620,1450,'ولي الأمر','');
  officialSignatureBlock(ctx,300,1450,g.principal,state.appMeta?.principal||'');
  return officialPage(canvas)
}
function officialPositiveCompensationPage(){
  const c=currentClass(),st=officialStudent();if(!c||!st){toast('اختر طالبًا');return null}
  const g=behaviorAudience(),records=(c.behaviorRecords||[]).filter(r=>r.studentId===st.id).sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))).slice(0,3);
  const {canvas,ctx,W,M}=officialPortraitCanvas('نموذج فرص تعويض درجات السلوك الإيجابي',{titleY:315}),right=W-M;
  officialText(ctx,'اسم الطالب/ الطالبة:',right,450,22);officialDottedLine(ctx,M+40,450,right-220);officialText(ctx,st.name,right-235,450,20);
  officialText(ctx,'المرحلة:',right,510,22);officialDottedLine(ctx,730,510,right-105);officialText(ctx,c.grade||'',right-120,510,20);
  officialText(ctx,'الصف:',700,510,22);officialDottedLine(ctx,M+40,510,620);officialText(ctx,c.name||'',605,510,20);
  const y0=585,headH=95,rowH=190,widths=[195,160,155,350,135,130],heads=['المشكلة السلوكية','نوعها ودرجتها','درجات السلوك المحسومة','فرص التعويض','الدرجات المكتسبة','توقيع الطالب'];
  let x=W-M;heads.forEach((h,i)=>{x-=widths[i];officialCell(ctx,x,y0,widths[i],headH,h,{size:17,weight:'700',maxLines:4})});
  for(let ri=0;ri<3;ri++){
    const r=records[ri]||null,vals=r?[r.violationLabel||'',behaviorDegreeLabel(r.degree),arabicNum(r.deduction||0),'','', '']:['','','','','',''];
    let xx=W-M,yy=y0+headH+ri*rowH;
    vals.forEach((v,i)=>{xx-=widths[i];officialCell(ctx,xx,yy,widths[i],rowH,v,{size:i===0?16:17,maxLines:5})})
  }
  officialSignatureBlock(ctx,300,1450,g.principal,state.appMeta?.principal||'');
  return officialPage(canvas)
}
function officialBehaviorProblemPage(){
  const c=currentClass(),st=officialStudent();if(!c||!st){toast('اختر طالبًا');return null}
  const g=behaviorAudience(),records=(c.behaviorRecords||[]).filter(r=>r.studentId===st.id).sort((a,b)=>String(a.date||'').localeCompare(String(b.date||''))).slice(-4);
  const {canvas,ctx,W,M}=officialPortraitCanvas('نموذج رصد مشكلة سلوكية',{titleY:315}),right=W-M;
  officialText(ctx,'اسم الطالب / الطالبة:',right,445,22);officialDottedLine(ctx,M+40,445,right-235);officialText(ctx,st.name,right-250,445,20);
  officialText(ctx,'الصف:',right,505,22);officialDottedLine(ctx,700,505,right-80);officialText(ctx,c.grade||'',right-95,505,20);
  officialText(ctx,'الفصل:',670,505,22);officialDottedLine(ctx,M+40,505,580);officialText(ctx,c.name||'',565,505,20);
  const y0=585,headH=100,rowH=150,widths=[175,140,125,145,285,135,105,105],heads=['المشكلة السلوكية','نوعها ودرجتها','تاريخها','درجات السلوك المحسومة','الإجراءات المتخذة','تاريخ الإجراء','توقيع الطالب','توقيع ولي الأمر'];
  let x=W-M;heads.forEach((h,i)=>{x-=widths[i];officialCell(ctx,x,y0,widths[i],headH,h,{size:16.5,weight:'700',maxLines:4})});
  for(let ri=0;ri<4;ri++){
    const r=records[ri]||null,vals=r?[r.violationLabel||'',behaviorDegreeLabel(r.degree),r.date?formatDate(r.date):'',arabicNum(r.deduction||0),r.actionTaken||'',r.updatedAt?formatDate(String(r.updatedAt).slice(0,10)):(r.date?formatDate(r.date):''),'','']:['','','','','','','',''];
    let xx=W-M,yy=y0+headH+ri*rowH;
    vals.forEach((v,i)=>{xx-=widths[i];officialCell(ctx,xx,yy,widths[i],rowH,v,{size:i===0||i===4?15.5:16.5,maxLines:5})})
  }
  officialSignatureBlock(ctx,300,1455,g.principal,state.appMeta?.principal||'');
  return officialPage(canvas)
}
function officialDistinguishedBehaviorPage(){
  const c=currentClass(),st=officialStudent();if(!c||!st){toast('اختر طالبًا');return null}
  const g=behaviorAudience(),{canvas,ctx,W,M}=officialPortraitCanvas('نموذج رصد درجات السلوك المتميز',{titleY:310}),right=W-M;
  officialText(ctx,'اسم الطالب/ الطالبة:',right,440,22);officialDottedLine(ctx,M+40,440,right-220);officialText(ctx,st.name,right-235,440,20);
  officialText(ctx,'المرحلة:',right,500,22);officialDottedLine(ctx,730,500,right-105);officialText(ctx,c.grade||'',right-120,500,20);
  officialText(ctx,'الصف:',700,500,22);officialDottedLine(ctx,M+40,500,620);officialText(ctx,c.name||'',605,500,20);
  const y0=575,headH=100,rowH=92,widths=[190,170,125,285,125,155,125],heads=['موضوع ممارسة السلوك المتميز','نوع ممارسة السلوك المتميز','تاريخ التنفيذ','شواهد السلوك المتميز','الدرجة المكتسبة','اسم راصد السلوك','توقيع راصد السلوك'];
  let x=W-M;heads.forEach((h,i)=>{x-=widths[i];officialCell(ctx,x,y0,widths[i],headH,h,{size:16.5,weight:'700',maxLines:4})});
  for(let ri=0;ri<7;ri++){let xx=W-M,yy=y0+headH+ri*rowH;heads.forEach((_,i)=>{xx-=widths[i];officialCell(ctx,xx,yy,widths[i],rowH,'',{size:16})})}
  officialSignatureBlock(ctx,300,1445,g.principal,state.appMeta?.principal||'');
  return officialPage(canvas)
}
function officialReferralPage(){
  const c=currentClass(),st=officialStudent(),r=officialRecordForStudent();if(!c||!st||!r){toast('اختر طالبًا وسجلًا سلوكيًا');return null}
  const g=behaviorAudience(),{canvas,ctx,W,M}=officialPortraitCanvas('إحـالـة طـالـب/ـة',{confidential:'سري',titleY:330}),right=W-M;
  let y=525;
  officialText(ctx,'المكرم الموجه الطلابي / الموجهة الطلابية',right,y,24);y+=72;
  officialText(ctx,'السلام عليكم ورحمة الله وبركاته',W/2,y,24,'400','center');y+=86;
  officialText(ctx,'نحيل إليكم الطالب/الطالبة',right,y,23);officialDottedLine(ctx,M+40,y,right-260);officialText(ctx,st.name,right-275,y,21);y+=70;
  officialText(ctx,'بالصف',right,y,23);officialDottedLine(ctx,760,y,right-80);officialText(ctx,officialStudentGradeLine(c),right-95,y,21);
  officialText(ctx,'ذي المشكلة السلوكية من الدرجة',730,y,22);officialDottedLine(ctx,500,y,420);officialText(ctx,behaviorDegreeLabel(r.degree),405,y,20);y+=75;
  officialText(ctx,'وهي',right,y,23);officialDottedLine(ctx,M+40,y,right-60);officialWrappedText(ctx,r.violationLabel||'',right-75,y,900,{size:21,maxLines:2});y+=105;
  officialText(ctx,'يرجى منكم متابعة الطالب/الطالبة ودراسة حالته/حالتها، ووضع الحلول التربوية والعلاجية المناسبة.',right,y,23);y+=90;
  officialSignatureBlock(ctx,320,1260,'وكيل/وكيلة شؤون الطلبة','');
  officialText(ctx,'الختم',900,1370,22,'700','center');
  return officialPage(canvas)
}
function officialBehaviorPlanPages(){
  const c=currentClass(),st=officialStudent(),r=officialRecordForStudent();if(!c||!st){toast('اختر طالبًا');return []}
  const pages=[];
  {
    const {canvas,ctx,W,M}=officialPortraitCanvas('نموذج خطة تعديل السلوك',{titleY:285}),right=W-M;
    let y=385;
    officialText(ctx,'أولاً: البيانات الأولية:',right,y,22,'700');y+=50;
    officialText(ctx,'اسم الطالب:',right,y,20);officialDottedLine(ctx,820,y,right-115);officialText(ctx,st.name,right-130,y,19);
    officialText(ctx,'الصف:',790,y,20);officialDottedLine(ctx,610,y,730);officialText(ctx,c.grade||'',715,y,19);
    officialText(ctx,'الفصل:',580,y,20);officialDottedLine(ctx,M+30,y,505);officialText(ctx,c.name||'',490,y,19);y+=55;
    officialText(ctx,'تاريخ الميلاد:',right,y,20);officialDottedLine(ctx,780,y,right-135);
    officialText(ctx,'العمر الزمني:',745,y,20);officialDottedLine(ctx,M+30,y,610);y+=55;
    officialText(ctx,'تاريخ البداية:',right,y,20);officialDottedLine(ctx,780,y,right-135);officialText(ctx,'تاريخ النهاية:',745,y,20);officialDottedLine(ctx,M+30,y,605);y+=62;
    officialText(ctx,'ثانياً: تحديد المشكلة السلوكية:',right,y,22,'700');y+=48;
    officialText(ctx,'المشكلة السلوكية:',right,y,20);officialDottedLine(ctx,520,y,right-170);if(r)officialWrappedText(ctx,r.violationLabel||'',right-185,y,480,{size:18,maxLines:2});
    officialText(ctx,'درجتها:',490,y,20);officialDottedLine(ctx,M+30,y,400);if(r)officialText(ctx,behaviorDegreeLabel(r.degree),385,y,18);y+=60;
    officialText(ctx,'وصف المشكلة السلوكية',right,y,20);y+=38;officialDottedLine(ctx,M+30,y,right);if(r?.notes)officialWrappedText(ctx,r.notes,right-8,y,1000,{size:18,maxLines:2});y+=62;
    officialText(ctx,'المظاهر السلوكية التي تبدو عند الطالب',right,y,20);y+=38;officialDottedLine(ctx,M+30,y,right);y+=68;
    officialText(ctx,'ثالثاً: قياس شدة أو تكرار السلوك:',right,y,22,'700');y+=42;
    const y0=y,headH=56,rowH=62,widths=[100,135,150,85,85,85,85,85,120],heads=['اليوم','التاريخ','فترة الملاحظة','1','2','3','4','5','المجموع'];
    let x=W-M;heads.forEach((h,i)=>{x-=widths[i];officialCell(ctx,x,y0,widths[i],headH,h,{size:16.5,weight:'700',maxLines:2})});
    let xx=W-M;const vals=[r?.date?new Date(r.date+'T12:00:00').toLocaleDateString('ar-SA',{weekday:'long'}):'',r?.date?formatDate(r.date):'',r?.period?'الحصة '+arabicNum(r.period):'',r?'✓':'','','','','',r?arabicNum(behaviorRecordOccurrenceOrdinal(r,c)):''];
    vals.forEach((v,i)=>{xx-=widths[i];officialCell(ctx,xx,y0+headH,widths[i],rowH,v,{size:16})});y=y0+headH+rowH+55;
    officialText(ctx,'رابعاً: تحديد المشكلة السلوكية:',right,y,22,'700');y+=45;
    const qs=['1. المثيرات القبلية للسلوك: اذكر الأسباب التي تسبب السلوك غير المرغوب فيه من خلال ملاحظتك للسلوك؟','2. المثيرات البعدية: ماذا يحدث بعد السلوك غير المرغوب فيه؟','3. ما الذي يحققه الطالب/الطالبة من خلال السلوك غير المرغوب فيه؟','4. الإجراءات السابقة التي تم استخدامها للحد من السلوك من قبل المعلم/المعلمة؟'];
    qs.forEach(q=>{officialWrappedText(ctx,q,right,y,W-2*M,{size:18,lineHeight:28,maxLines:2});y+=62});
    pages.push(officialPage(canvas))
  }
  {
    const canvas=document.createElement('canvas');canvas.width=1240;canvas.height=1754;const ctx=canvas.getContext('2d',{alpha:false});ctx.fillStyle='#fff';ctx.fillRect(0,0,1240,1754);
    const W=1240,M=72,right=W-M;officialLogo(ctx,180,45,165,98);
    let y=245;officialText(ctx,'خامساً: تصميم خطة تعديل السلوك',right,y,24,'700');y+=58;
    officialText(ctx,'تعريف السلوك المرغوب في إكسابه للطالب/الطالبة إجرائياً.',right,y,21);y+=40;officialDottedLine(ctx,M+30,y,right);y+=70;
    officialText(ctx,'الإجراءات المستخدمة للحد من السلوك غير المرغوب فيه وتساعد على تحقيق السلوك المرغوب:',right,y,21,'700');y+=52;
    const procedures=[r?.actionTaken||'','','','','',''];procedures.forEach((v,i)=>{officialText(ctx,'الإجراء '+['الأول','الثاني','الثالث','الرابع','الخامس','السادس'][i]+':',right,y,20);officialDottedLine(ctx,M+30,y,right-125);if(v)officialWrappedText(ctx,v,right-140,y,850,{size:18,maxLines:2});y+=62});
    officialText(ctx,'متابعة السلوك:',right,y+10,22,'700');y+=58;
    const y0=y,headH=56,rowH=62,widths=[100,135,150,85,85,85,85,85,120],heads=['اليوم','التاريخ','فترة الملاحظة','1','2','3','4','5','المجموع'];
    let x=W-M;heads.forEach((h,i)=>{x-=widths[i];officialCell(ctx,x,y0,widths[i],headH,h,{size:16.5,weight:'700',maxLines:2})});
    let xx=W-M;heads.forEach((_,i)=>{xx-=widths[i];officialCell(ctx,xx,y0+headH,widths[i],rowH,'',{size:16})});y=y0+headH+rowH+65;
    officialText(ctx,'سادساً: تقييم فاعلية الخطة أو البرنامج:',right,y,22,'700');y+=52;
    ['رأي وكيل/وكيلة المدرسة:','رأي معلم/معلمة الفصل:','رأي ولي الأمر:'].forEach(q=>{officialText(ctx,q,right,y,20);officialDottedLine(ctx,M+30,y,right-215);y+=58});
    officialText(ctx,'القائم بتعديل السلوك (معلم/معلمة – موجه طلابي/موجهة طلابية)',360,1430,20,'400','center');
    officialText(ctx,'الاسم: ................................................',360,1480,19,'400','center');
    officialText(ctx,'التوقيع: .............................................',360,1525,19,'400','center');
    officialText(ctx,'التاريخ: ..............................................',360,1570,19,'400','center');
    pages.push(officialPage(canvas))
  }
  return pages
}

function renderOfficialFormsSelectors(){
  const c=currentClass(),student=$('#officialFormsStudent'),record=$('#officialFormsRecord');if(!c||!student||!record)return;
  const prev=officialFormsStudentId||student.value||c.students?.[0]?.id||'';
  student.innerHTML=(c.students||[]).map(st=>`<option value="${escapeHtml(st.id)}">${escapeHtml(st.name)}</option>`).join('');
  officialFormsStudentId=(c.students||[]).some(st=>st.id===prev)?prev:(c.students?.[0]?.id||'');student.value=officialFormsStudentId;
  const recs=(c.behaviorRecords||[]).filter(r=>r.studentId===officialFormsStudentId).sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
  record.innerHTML='<option value="">آخر سجل للطالب</option>'+recs.map(r=>`<option value="${escapeHtml(r.id)}">${escapeHtml(r.date||'')} — ${escapeHtml(r.violationLabel||'مخالفة')}</option>`).join('');
  if(recs.some(r=>r.id===officialFormsRecordId))record.value=officialFormsRecordId;else{officialFormsRecordId='';record.value=''}
  const stats=$('#officialFormsStudentStats'),st=officialStudent();if(stats&&st){const n=officialAbsenceCounts(st);stats.textContent=`غياب بعذر: ${arabicNum(n.excused)} · بدون عذر: ${arabicNum(n.unexcused)} · مخالفات: ${arabicNum(recs.length)}`}
}
function openOfficialFormsCenter({studentId='',recordId=''}={}){
  officialFormsStudentId=studentId||officialFormsStudentId||currentClass()?.students?.[0]?.id||'';
  officialFormsRecordId=recordId||'';
  renderOfficialFormsSelectors();
  const dlg=$('#officialFormsModal');if(!dlg)return;
  if(typeof dlg.showModal==='function')dlg.showModal();else dlg.setAttribute('open','')
}
function printOfficialForm(type){
  try{
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
  $('#officialFormsStudent')?.addEventListener('change',e=>{officialFormsStudentId=e.target.value;officialFormsRecordId='';renderOfficialFormsSelectors()});
  $('#officialFormsRecord')?.addEventListener('change',e=>{officialFormsRecordId=e.target.value});
  $('#officialFormsGrid')?.addEventListener('click',e=>{const b=e.target.closest('[data-official-form]');if(b)printOfficialForm(b.dataset.officialForm)});
}
