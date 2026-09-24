const SCHEMA_VERSION=4;
const APP_VERSION=globalThis.APP_VERSION||document.querySelector('#versionBadge')?.textContent?.replace(/^v/,'')||'4.15.0';
let swRegistration=null,updateReloading=false,updateBannerTimer=null,updateSplashActive=false,updateTargetVersion='',updateProgressEligible=false;
let printSessionActive=false,printSessionClass='',printSessionStartedAt=0,printSessionSawHidden=false,printMediaEntered=false;
let attendanceReferenceCsv=null,attendanceDiagnosticLastScan=null,attendanceDiagnosticDbState=null;
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const uid=()=>crypto.randomUUID?.() || ('id-'+Date.now()+'-'+Math.random().toString(16).slice(2));
const clone=x=>typeof structuredClone==='function'?structuredClone(x):JSON.parse(JSON.stringify(x));
const seedStudents=['أحمد محمد علي','خالد حسن إبراهيم','سلمان عبدالله يحيى','زيد هادي أحمد'];
const TYPE_LABELS={homework:'واجب',participation:'مشاركة',quiz:'اختبار قصير',project:'مشروع',practical:'تطبيق عملي',exam:'اختبار',other:'أخرى',legacy:'مرحّل'};
const makeStudent=name=>({id:uid(),name,grades:{},attendance:{},notes:''});
const makeClass=(name='١ / أ',grade='الأول المتوسط',subject='المهارات الرقمية',students=[])=>({id:uid(),name,grade,subject,students,assessmentEvents:[],selectedAssessmentId:null});
const SCHEDULE_DAYS=['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس'];
const PERIOD_TIMES={1:['07:00','07:45'],2:['07:45','08:30'],3:['08:45','09:30'],4:['09:45','10:30'],5:['10:30','11:15'],6:['11:15','12:00'],7:['12:00','12:30']};
const ROSTER_ACADEMIC_TERMS={
  '1':{label:'الفصل الدراسي الأول',start:'2026-08-23',end:'2027-01-07',plannedWeeks:19},
  '2':{label:'الفصل الدراسي الثاني',start:'2027-01-17',end:'2027-06-17',plannedWeeks:18}
};
const ROSTER_HOLIDAYS=[
  ['2026-09-23','2026-09-26'],['2026-10-25','2026-10-25'],['2026-11-20','2026-11-28'],['2026-11-29','2026-11-29'],['2027-01-07','2027-01-07'],
  ['2027-02-19','2027-02-22'],['2027-02-26','2027-03-13'],['2027-04-11','2027-04-11'],['2027-05-07','2027-05-22']
];
const AR_DAY_BY_JS=['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];

const makeTeacherSchedule=()=>({
  id:uid(),teacherName:'ابراهيم بن حمود بن علي النعمي',school:'مدرسة ابو السلع الابتدائية والمتوسطة',title:'الجدول الأساسي 1',
  semester:'الفصل الدراسي الأول',startDate:'2026-08-23',endDate:'2027-01-07',archived:false,
  slots:{
    'الأحد-4':{kind:'class',className:'2م د',subject:'الرقمية'},'الأحد-5':{kind:'standby',note:'منتظر 3'},'الأحد-6':{kind:'class',className:'3م ب',subject:'الرقمية'},'الأحد-7':{kind:'class',className:'2م ب',subject:'الرقمية'},
    'الاثنين-3':{kind:'standby',note:'منتظر 4'},'الاثنين-4':{kind:'class',className:'2م أ',subject:'الرقمية'},'الاثنين-5':{kind:'class',className:'2م ج',subject:'الرقمية'},'الاثنين-6':{kind:'class',className:'3م أ',subject:'الرقمية'},'الاثنين-7':{kind:'class',className:'3م ج',subject:'الرقمية'},
    'الثلاثاء-5':{kind:'class',className:'3م ب',subject:'الرقمية'},'الثلاثاء-6':{kind:'class',className:'2م د',subject:'الرقمية'},'الثلاثاء-7':{kind:'class',className:'2م أ',subject:'الرقمية'},
    'الأربعاء-1':{kind:'class',className:'2م ب',subject:'الرقمية'},'الأربعاء-2':{kind:'class',className:'3م أ',subject:'الرقمية'},'الأربعاء-3':{kind:'standby',note:'منتظر 2'},
    'الخميس-1':{kind:'class',className:'3م ج',subject:'الرقمية'},'الخميس-2':{kind:'class',className:'2م ج',subject:'الرقمية'},'الخميس-3':{kind:'standby',note:'منتظر 1'}
  },
  supervision:[{id:uid(),day:'الثلاثاء',date:'10/10',start:'09:30',end:'09:55',title:'إشراف جديد',type:'إشراف',location:'البوابة الرئيسية، المقصف'}]
});
const initialTeacherSchedule=makeTeacherSchedule();
let state={
  schemaVersion:SCHEMA_VERSION,
  appMeta:{school:'',region:'',year:'١٤٤٨ هـ',semester:'الفصل الدراسي الأول',teacher:'',principal:''},
  settings:{gradeAlertThreshold:60,absenceAlertThreshold:3,excludeExamWeek:true,schoolPeriodAlerts:false},
  classes:[makeClass('١ / أ','الأول المتوسط','المهارات الرقمية',seedStudents.map(makeStudent)),makeClass('١ / ب','الأول المتوسط','المهارات الرقمية',[])],
  activeClassId:null,
  activeScheduleId:initialTeacherSchedule.id,
  teacherSchedules:[initialTeacherSchedule],
  ui:{activeView:'dashboard',dismissedInstall:false,assessmentMonth:'all',reportPeriod:'all',scheduleId:initialTeacherSchedule.id}
};
state.activeClassId=state.classes[0].id;
let saveTimer=null,openStudentId=null,editingAssessmentId=null,searchTerm='',reportStudentSearchTerm='',assessmentArchiveSearchTerm='';
let schoolDayTimer=null;
const SCHOOL_ALERT_STORAGE='student-roster-period-alerts';

function localDateISO(d=new Date()){const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');return `${y}-${m}-${day}`}
function monthKey(date){return /^\d{4}-\d{2}/.test(date||'')?String(date).slice(0,7):''}
function currentClass(){return state.classes.find(c=>c.id===state.activeClassId)||state.classes[0]}
function findClass(id){return state.classes.find(c=>c.id===id)}
function findStudent(id){for(const c of state.classes){const s=c.students.find(x=>x.id===id);if(s)return s}}
function findStudentClass(id){return state.classes.find(c=>c.students.some(s=>s.id===id))}
function findAssessment(id,c=currentClass()){return c?.assessmentEvents?.find(a=>a.id===id)}
function ensureStudent(s){s.grades ||= {};s.attendance ||= {};s.notes ||= '';return s}
function ensureAssessment(a){a.id ||= uid();a.title ||= 'تقييم';a.type ||= 'other';a.date ||= '';a.maxScore=Math.max(.5,Number(a.maxScore||a.max||10));a.note ||= '';return a}
function ensureClass(c){c.grade ||= 'الأول المتوسط';c.subject ||= 'المهارات الرقمية';c.weeklySessions=Number(c.weeklySessions||(/الرقمية|الحاسب/i.test(c.subject)?2:1));c.students ||= [];c.students.forEach(ensureStudent);c.assessmentEvents ||= [];c.assessmentEvents.forEach(ensureAssessment);if(!c.selectedAssessmentId||!c.assessmentEvents.some(a=>a.id===c.selectedAssessmentId))c.selectedAssessmentId=c.assessmentEvents[0]?.id||null;return c}

function scheduleTermConfig(semester=''){
  const key=/الثاني/.test(String(semester))?'2':'1';
  return ROSTER_ACADEMIC_TERMS[key]||ROSTER_ACADEMIC_TERMS['1']
}
function ensureTeacherSchedule(t,appMeta=null){
  t ||= {};
  const semester=t.semester||appMeta?.semester||'الفصل الدراسي الأول',cfg=scheduleTermConfig(semester);
  t.id ||= uid();t.title ||= 'جدول المعلم';t.teacherName ||= appMeta?.teacher||'ابراهيم بن حمود بن علي النعمي';t.school ||= appMeta?.school||'مدرسة ابو السلع الابتدائية والمتوسطة';
  t.semester=semester;t.startDate ||= cfg?.start||'';t.endDate ||= cfg?.end||'';t.archived=!!t.archived;t.slots ||= {};t.supervision ||= [];
  return t
}
function currentTeacherSchedule(){
  const list=state.teacherSchedules||[];
  const selected=list.find(x=>x.id===state.ui?.scheduleId),active=list.find(x=>x.id===state.activeScheduleId);
  return selected||active||list[0]||null
}
function activeTeacherSchedule(){return (state.teacherSchedules||[]).find(x=>x.id===state.activeScheduleId)||currentTeacherSchedule()}
function scheduleForDate(date=''){
  const list=(state.teacherSchedules||[]).filter(Boolean);
  if(!date)return activeTeacherSchedule();
  const matches=list.filter(t=>(!t.startDate||date>=t.startDate)&&(!t.endDate||date<=t.endDate));
  if(matches.length){
    return matches.sort((a,b)=>String(b.startDate||'').localeCompare(String(a.startDate||''))||(b.id===state.activeScheduleId?1:0)-(a.id===state.activeScheduleId?1:0))[0]
  }
  return activeTeacherSchedule()||list[0]||null
}
function schedulesOverlappingRange(start,end){
  return (state.teacherSchedules||[]).filter(t=>{
    const a=t.startDate||'0000-01-01',b=t.endDate||'9999-12-31';
    return (!end||a<=end)&&(!start||b>=start)
  })
}

function legacyType(field){const n=(field.name||'').toLowerCase();if(/واجب/.test(n))return'homework';if(/مشارك/.test(n))return'participation';if(/اختبار/.test(n))return'quiz';if(/مشروع|بحث/.test(n))return'project';if(/عملي|تطبيق/.test(n))return'practical';return'legacy'}
function migrate(input){
  if(!input||!Array.isArray(input.classes))return null;
  const x=clone(input);
  x.appMeta ||= {school:'',region:'',year:x.meta?.year||'١٤٤٨ هـ',semester:x.meta?.semester||'الفصل الدراسي الأول',teacher:x.meta?.teacher||'',principal:x.meta?.principal||''};
  x.appMeta.school ||= '';x.appMeta.region ||= '';
  x.settings ||= {gradeAlertThreshold:60,absenceAlertThreshold:3};
  x.settings.gradeAlertThreshold=Number(x.settings.gradeAlertThreshold??60);x.settings.absenceAlertThreshold=Number(x.settings.absenceAlertThreshold??3);x.settings.excludeExamWeek=x.settings.excludeExamWeek!==false;x.settings.schoolPeriodAlerts=x.settings.schoolPeriodAlerts===true;
  if(!Array.isArray(x.teacherSchedules)||!x.teacherSchedules.length){
    const legacy=x.teacherSchedule?clone(x.teacherSchedule):makeTeacherSchedule();
    x.teacherSchedules=[ensureTeacherSchedule(legacy,x.appMeta)]
  }else x.teacherSchedules=x.teacherSchedules.map(t=>ensureTeacherSchedule(t,x.appMeta));
  x.activeScheduleId=x.teacherSchedules.some(t=>t.id===x.activeScheduleId)?x.activeScheduleId:(x.teacherSchedules.find(t=>!t.archived)?.id||x.teacherSchedules[0]?.id);
  const profileSchedule=x.teacherSchedules.find(t=>t.id===x.ui?.scheduleId)||x.teacherSchedules.find(t=>t.id===x.activeScheduleId)||x.teacherSchedules[0];
  if(!String(x.appMeta.teacher||'').trim())x.appMeta.teacher=profileSchedule?.teacherName||'';
  if(!String(x.appMeta.school||'').trim())x.appMeta.school=profileSchedule?.school||'';
  if(profileSchedule){
    if(!String(profileSchedule.teacherName||'').trim()&&x.appMeta.teacher)profileSchedule.teacherName=x.appMeta.teacher;
    if(!String(profileSchedule.school||'').trim()&&x.appMeta.school)profileSchedule.school=x.appMeta.school;
  }
  const oldFields=Array.isArray(x.fields)?x.fields:[];
  x.classes.forEach(c=>{
    c.grade ||= x.meta?.grade||'الأول المتوسط';c.subject ||= x.meta?.subject||'المهارات الرقمية';c.students ||= [];
    c.students.forEach(s=>{s.attendance ||= {};s.notes ||= '';s.grades ||= {}});
    if(!Array.isArray(c.assessmentEvents))c.assessmentEvents=[];
    if(!c.assessmentEvents.length&&oldFields.length){
      for(const f of oldFields){
        for(let slot=0;slot<2;slot++){
          const aid=uid();
          c.assessmentEvents.push({id:aid,title:`${f.name||'تقييم'} ${slot+1}`,type:legacyType(f),date:'',maxScore:Number(f.max||1),note:'مرحّل من الإصدار السابق — التاريخ غير متوفر',legacy:true});
          c.students.forEach(s=>{const v=s.assessments?.[f.id]?.[slot];if(v!==null&&v!==undefined&&v!=='')s.grades[aid]=Number(v)});
        }
      }
    }
    c.assessmentEvents.forEach(ensureAssessment);c.students.forEach(ensureStudent);
    c.selectedAssessmentId=c.assessmentEvents.some(a=>a.id===c.selectedAssessmentId)?c.selectedAssessmentId:c.assessmentEvents[0]?.id||null;
  });
  x.activeClassId=x.classes.some(c=>c.id===x.activeClassId)?x.activeClassId:x.classes[0]?.id;
  x.ui ||= {};x.ui.activeView=x.ui.activeView==='followup'?'assessments':(x.ui.activeView||'dashboard');x.ui.dismissedInstall=!!x.ui.dismissedInstall;x.ui.assessmentMonth ||= 'all';x.ui.assessmentTypeFilter ||= 'all';x.ui.assessmentArchiveCollapsed ||= {};x.ui.reportPeriod ||= 'all';x.ui.reportTab ||= 'class';
  x.ui.scheduleId=x.teacherSchedules.some(t=>t.id===x.ui.scheduleId)?x.ui.scheduleId:x.activeScheduleId;
  x.schemaVersion=SCHEMA_VERSION;delete x.fields;delete x.meta;delete x.teacherSchedule;
  return x;
}

const db={
  memory:{},
  async open(){return new Promise((res,rej)=>{try{const r=indexedDB.open('studentRosterPWA',1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains('kv'))r.result.createObjectStore('kv')};r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)}catch(e){rej(e)}})},
  async getIndexed(k){const d=await this.open();return await new Promise((res,rej)=>{const t=d.transaction('kv','readonly').objectStore('kv').get(k);t.onsuccess=()=>res(t.result);t.onerror=()=>rej(t.error)})},
  async get(k){
    try{
      const indexed=await this.getIndexed(k);
      if(indexed!==undefined&&indexed!==null)return indexed;
    }catch{}
    try{const raw=localStorage.getItem(k);if(raw)return JSON.parse(raw)}catch{}
    return this.memory[k]??null
  },
  async set(k,v){try{const d=await this.open();await new Promise((res,rej)=>{const t=d.transaction('kv','readwrite').objectStore('kv').put(v,k);t.onsuccess=()=>res();t.onerror=()=>rej(t.error)})}catch{try{localStorage.setItem(k,JSON.stringify(v))}catch{this.memory[k]=clone(v)}}}
};
function attendanceRecordCount(source){
  return (source?.classes||[]).reduce((n,c)=>n+(c.students||[]).reduce((m,st)=>m+Object.keys(st.attendance||{}).length,0),0)
}
function attendanceSnapshot(source){
  return {kind:'student-roster-attendance-snapshot',createdAt:new Date().toISOString(),classes:(source?.classes||[]).map(c=>({id:c.id,name:c.name,grade:c.grade,subject:c.subject,students:(c.students||[]).map(st=>({id:st.id,name:st.name,attendance:clone(st.attendance||{})}))}))}
}
function persistAttendanceSnapshot(source){
  try{
    const snap=attendanceSnapshot(source),json=JSON.stringify(snap);
    const current=localStorage.getItem('student-roster-attendance-snapshot-1');
    if(current===json)return;
    for(let i=5;i>=2;i--){const prev=localStorage.getItem('student-roster-attendance-snapshot-'+(i-1));if(prev)localStorage.setItem('student-roster-attendance-snapshot-'+i,prev)}
    localStorage.setItem('student-roster-attendance-snapshot-1',json)
  }catch{}
}
function persistAttendanceMirror(source){
  try{localStorage.setItem('student-roster-attendance-mirror',JSON.stringify(attendanceSnapshot(source)))}catch{}
}
function localAttendanceCandidates(){
  const out=[];
  try{
    for(let i=0;i<localStorage.length;i++){
      const key=localStorage.key(i);if(!key)continue;
      const raw=localStorage.getItem(key);if(!raw)continue;
      try{
        const parsed=JSON.parse(raw);
        if(parsed&&Array.isArray(parsed.classes)&&attendanceRecordCount(parsed)>0)out.push({key,state:parsed,count:attendanceRecordCount(parsed)})
      }catch{}
    }
  }catch{}
  return out
}
function sameClassForRecovery(a,b){
  if(a?.id&&b?.id&&a.id===b.id)return true;
  return gradeImportKey(a?.grade||'')===gradeImportKey(b?.grade||'')&&sectionImportKey(a?.name||'')===sectionImportKey(b?.name||'')
}
function sameStudentForRecovery(a,b){
  if(a?.id&&b?.id&&a.id===b.id)return true;
  return studentNameKey(a?.name||'')===studentNameKey(b?.name||'')
}
function mergeAttendanceFromSource(target,source){
  let added=0,conflicts=0,matchedStudents=0,sourceEntries=attendanceRecordCount(source);
  for(const sc of source?.classes||[]){
    const tc=(target.classes||[]).find(c=>sameClassForRecovery(c,sc));if(!tc)continue;
    for(const ss of sc.students||[]){
      const ts=(tc.students||[]).find(st=>sameStudentForRecovery(st,ss));if(!ts)continue;
      matchedStudents++;ensureStudent(ts);
      for(const [date,status] of Object.entries(ss.attendance||{})){
        if(!['present','absent','late','excused'].includes(status))continue;
        if(ts.attendance[date]===undefined){ts.attendance[date]=status;added++}
        else if(ts.attendance[date]!==status)conflicts++
      }
    }
  }
  return {added,conflicts,matchedStudents,sourceEntries}
}
async function recoverAttendanceFromLocalSources({silent=false}={}){
  const candidates=localAttendanceCandidates();let added=0,conflicts=0,sources=0;
  for(const cand of candidates){
    const result=mergeAttendanceFromSource(state,cand.state);
    if(result.added){added+=result.added;conflicts+=result.conflicts;sources++}
  }
  if(added){await db.set('state',state);persistAttendanceMirror(state);if(!silent)toast('تمت استعادة '+arabicNum(added)+' سجل حضور قديم')}
  return {added,conflicts,sources,candidates,current:attendanceRecordCount(state)}
}
function storageRecoverySummary(result){
  const el=$('#storageRecoveryStatus');if(!el)return;
  const candidateRecords=(result.candidates||[]).reduce((n,x)=>n+x.count,0);
  el.innerHTML=`<div><span>السجلات الحالية</span><b>${arabicNum(result.current||0)}</b></div><div><span>نسخ محلية مكتشفة</span><b>${arabicNum((result.candidates||[]).length)}</b></div><div><span>سجلات داخل النسخ</span><b>${arabicNum(candidateRecords)}</b></div><div><span>تمت استعادتها الآن</span><b>${arabicNum(result.added||0)}</b></div>${result.conflicts?`<p>وجدت ${arabicNum(result.conflicts)} حالة مختلفة في تاريخ موجود أصلًا؛ تم الاحتفاظ بالقيمة الحالية ولم تُستبدل.</p>`:''}`
}
async function scanAndRecoverAttendance(){
  const result=await recoverAttendanceFromLocalSources({silent:true});
  storageRecoverySummary(result);
  if(result.added){renderAll();queueSave();toast('تمت استعادة '+arabicNum(result.added)+' سجل حضور')}
  else toast(result.candidates.length?'لا توجد سجلات أقدم مفقودة في التخزين المحلي':'لم توجد نسخة حضور محلية إضافية')
}
async function restoreAttendanceOnly(file){
  try{
    const parsed=JSON.parse(await file.text());
    if(!parsed||!Array.isArray(parsed.classes))throw 0;
    const before=attendanceRecordCount(state),probe=mergeAttendanceFromSource(clone(state),parsed);
    if(!probe.added){toast('لا توجد سجلات حضور مفقودة في هذا الملف');return}
    if(!confirm(`سيتم دمج ${arabicNum(probe.added)} سجل حضور مفقود من الملف دون استبدال الدرجات أو السجلات الحالية. متابعة؟`))return;
    persistAttendanceSnapshot(state);
    const result=mergeAttendanceFromSource(state,parsed);
    await db.set('state',state);persistAttendanceMirror(state);renderAll();showView('dashboard',false);
    storageRecoverySummary({current:attendanceRecordCount(state),candidates:[],added:result.added,conflicts:result.conflicts});
    toast('تمت استعادة '+arabicNum(attendanceRecordCount(state)-before)+' سجل حضور')
  }catch{toast('تعذر قراءة ملف النسخة الاحتياطية')}
}

function diagnosticSourceState(){return attendanceDiagnosticDbState||state}
function renderDiagnosticClassOptions(preferredId=''){
  const sel=$('#attendanceDiagnosticClass');if(!sel)return;
  const source=diagnosticSourceState(),classes=source?.classes||[];
  const previous=preferredId||sel.value||source?.activeClassId||state.activeClassId||classes[0]?.id||'';
  sel.innerHTML=classes.map(c=>`<option value="${escapeHtml(c.id)}">${escapeHtml(c.grade||'')} — ${escapeHtml(c.name||'')} — ${escapeHtml(c.subject||'')}</option>`).join('');
  if([...sel.options].some(o=>o.value===previous))sel.value=previous;
}
function diagnosticClass(){
  const source=diagnosticSourceState(),id=$('#attendanceDiagnosticClass')?.value;
  return (source?.classes||[]).find(c=>c.id===id)||(source?.classes||[])[0]||currentClass()
}
function attendanceRawEntries(st,cutoff=''){
  return Object.entries(st?.attendance||{})
    .filter(([date,status])=>/^\d{4}-\d{2}-\d{2}$/.test(date)&&['present','absent','late','excused'].includes(status)&&(!cutoff||date<=cutoff))
    .sort((a,b)=>a[0].localeCompare(b[0]))
}
function attendanceRawCounts(st,cutoff=''){
  const out={present:0,absent:0,late:0,excused:0,total:0};
  attendanceRawEntries(st,cutoff).forEach(([,status])=>{out[status]++;out.total++});
  return out
}
function referenceDateFromFilename(name=''){
  const m=String(name).match(/(20\d{2}-\d{2}-\d{2})/);return m?.[1]||''
}
function parseAttendanceReferenceCsv(text,fileName=''){
  const rows=parseCSV(String(text||'').replace(/^\uFEFF/,''));
  if(!rows.length)throw new Error('empty');
  const headers=rows[0].map(x=>normalizeImportText(x));
  const nameIdx=csvHeaderIndex(headers,['الاسم','اسم الطالب','name']);
  const absentIdx=csvHeaderIndex(headers,['الغياب','غائب','absent']);
  const lateIdx=csvHeaderIndex(headers,['التأخر','متأخر','late']);
  if(nameIdx<0||absentIdx<0)throw new Error('headers');
  const map=new Map(),items=[];
  rows.slice(1).forEach(row=>{
    const name=normalizeImportText(row[nameIdx]);if(!name)return;
    const item={name,absent:Number(latinDigits(row[absentIdx]||'0'))||0,late:lateIdx>=0?(Number(latinDigits(row[lateIdx]||'0'))||0):0};
    map.set(studentNameKey(name),item);items.push(item)
  });
  return {fileName,cutoff:referenceDateFromFilename(fileName),map,items}
}
function bestClassForAttendanceReference(ref){
  let best=null,bestScore=-1;
  for(const c of diagnosticSourceState()?.classes||[]){
    const names=new Set((c.students||[]).map(st=>studentNameKey(st.name)));
    let score=0;for(const k of ref.map.keys())if(names.has(k))score++;
    if(score>bestScore){best={classId:c.id,score,total:names.size};bestScore=score}
  }
  return best
}
function attendanceDiagnosticComparison(st,ref){
  const current=attendanceRawCounts(st),cutoff=ref?.cutoff||'',atRef=attendanceRawCounts(st,cutoff),csv=ref?.map.get(studentNameKey(st.name))||null;
  if(!ref)return {current,atRef,csv:null,kind:'none',label:'بدون CSV مرجعي'};
  if(!csv)return {current,atRef,csv:null,kind:'missing-csv',label:'غير موجود في CSV'};
  const absentDiff=atRef.absent-csv.absent,lateDiff=atRef.late-csv.late;
  if(absentDiff===0&&lateDiff===0)return {current,atRef,csv,kind:'match',label:'مطابق'};
  const parts=[];
  if(absentDiff<0)parts.push(`غياب ناقص ${arabicNum(Math.abs(absentDiff))}`);
  if(absentDiff>0)parts.push(`غياب DB أكثر ${arabicNum(absentDiff)}`);
  if(lateDiff<0)parts.push(`تأخر ناقص ${arabicNum(Math.abs(lateDiff))}`);
  if(lateDiff>0)parts.push(`تأخر DB أكثر ${arabicNum(lateDiff)}`);
  return {current,atRef,csv,kind:'diff',label:parts.join(' · ')}
}
function attendanceEntryChip(date,status){
  const day=AR_DAY_BY_JS[parseISODateNoon(date).getDay()]||'',label=statusLabel(status),cls='diag-'+status;
  return `<span class="diagnostic-entry ${cls}"><b>${escapeHtml(date)}</b><small>${escapeHtml(day)} · ${escapeHtml(label)}</small></span>`
}
function renderAttendanceDiagnosticRows(){
  const body=$('#dbDiagnosticRows'),c=diagnosticClass();if(!body||!c)return;
  const ref=attendanceReferenceCsv,onlyDiff=$('#diagnosticOnlyDifferences')?.checked;
  const rows=(c.students||[]).map(st=>({st,cmp:attendanceDiagnosticComparison(st,ref)})).filter(x=>!onlyDiff||x.cmp.kind==='diff'||x.cmp.kind==='missing-csv');
  body.innerHTML=rows.length?rows.map(({st,cmp})=>{
    const entries=attendanceRawEntries(st),chips=entries.length?entries.map(([d,v])=>attendanceEntryChip(d,v)).join(''):'<span class="diagnostic-empty">لا توجد تواريخ حضور محفوظة</span>';
    const dbAbsent=ref?.cutoff?`<b>${arabicNum(cmp.atRef.absent)}</b><small>حتى ${escapeHtml(ref.cutoff)}</small><em>الإجمالي الآن ${arabicNum(cmp.current.absent)}</em>`:`<b>${arabicNum(cmp.current.absent)}</b>`;
    const dbLate=ref?.cutoff?`<b>${arabicNum(cmp.atRef.late)}</b><small>حتى ${escapeHtml(ref.cutoff)}</small><em>الإجمالي الآن ${arabicNum(cmp.current.late)}</em>`:`<b>${arabicNum(cmp.current.late)}</b>`;
    return `<tr class="diagnostic-row ${cmp.kind}"><td class="diagnostic-student"><b>${escapeHtml(st.name)}</b><small>${arabicNum(entries.length)} سجل</small></td><td><div class="diagnostic-entries">${chips}</div></td><td class="diagnostic-count">${dbAbsent}</td><td class="diagnostic-count">${dbLate}</td><td class="diagnostic-count">${cmp.csv?arabicNum(cmp.csv.absent):'—'}</td><td class="diagnostic-count">${cmp.csv?arabicNum(cmp.csv.late):'—'}</td><td><span class="diagnostic-result ${cmp.kind}">${escapeHtml(cmp.label)}</span></td></tr>`
  }).join(''):'<tr><td colspan="7">لا توجد نتائج وفق الفلتر الحالي.</td></tr>';
}
async function idbStoreKeys(dbHandle,storeName){
  try{
    return await new Promise((resolve,reject)=>{
      const store=dbHandle.transaction(storeName,'readonly').objectStore(storeName);
      if(store.getAllKeys){const req=store.getAllKeys();req.onsuccess=()=>resolve(req.result||[]);req.onerror=()=>reject(req.error);return}
      const keys=[],req=store.openKeyCursor();req.onsuccess=()=>{const cur=req.result;if(cur){keys.push(cur.key);cur.continue()}else resolve(keys)};req.onerror=()=>reject(req.error)
    })
  }catch{return[]}
}
async function inspectCurrentOriginDatabases(){
  const catalog=[];
  try{
    const listed=typeof indexedDB.databases==='function'?await indexedDB.databases():[{name:'studentRosterPWA',version:1}];
    for(const meta of listed||[]){
      if(!meta?.name)continue;
      try{
        const handle=await new Promise((resolve,reject)=>{const req=indexedDB.open(meta.name);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});
        const stores=[...handle.objectStoreNames],storeInfo=[];
        for(const store of stores)storeInfo.push({name:store,keys:await idbStoreKeys(handle,store)});
        catalog.push({name:meta.name,version:handle.version,stores:storeInfo});handle.close()
      }catch{catalog.push({name:meta.name,version:meta.version||'?',stores:[]})}
    }
  }catch{}
  if(!catalog.some(x=>x.name==='studentRosterPWA')){
    try{const handle=await db.open(),stores=[...handle.objectStoreNames],storeInfo=[];for(const store of stores)storeInfo.push({name:store,keys:await idbStoreKeys(handle,store)});catalog.push({name:'studentRosterPWA',version:handle.version,stores:storeInfo});handle.close()}catch{}
  }
  return catalog
}
function localRosterStorageKeys(){
  const out=[];try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&(/student-roster|attendance|^state$/i.test(k)))out.push(k)}}catch{}return out.sort()
}
async function runAttendanceDatabaseDiagnostic(){
  const summary=$('#dbDiagnosticSummary');if(summary)summary.innerHTML='<span>جارٍ قراءة قاعدة البيانات…</span>';
  try{attendanceDiagnosticDbState=await db.getIndexed('state')||null}catch{attendanceDiagnosticDbState=null}
  renderDiagnosticClassOptions();
  const source=diagnosticSourceState(),catalog=await inspectCurrentOriginDatabases(),c=diagnosticClass(),classes=source?.classes||[],students=classes.reduce((n,x)=>n+(x.students?.length||0),0),records=attendanceRecordCount(source),lsKeys=localRosterStorageKeys();
  attendanceDiagnosticLastScan={catalog,classes:classes.length,students,records,origin:location.origin,localStorageKeys:lsKeys,usingIndexedDb:!!attendanceDiagnosticDbState};
  const dbText=catalog.length?catalog.map(d=>`<div class="db-catalog-item"><b>${escapeHtml(d.name)}</b><span>v${escapeHtml(d.version)}</span><small>${d.stores.length?d.stores.map(st=>`${escapeHtml(st.name)} [${st.keys.map(k=>escapeHtml(String(k))).join(', ')||'بدون مفاتيح'}]`).join(' · '):'تعذر قراءة المخازن'}</small></div>`).join(''):'<div class="db-catalog-item"><b>تعذر تعداد قواعد IndexedDB</b><small>تمت قراءة الحالة الحالية من التطبيق فقط.</small></div>';
  if(summary)summary.innerHTML=`<div class="db-diagnostic-kpis"><div><span>قواعد IndexedDB</span><b>${arabicNum(catalog.length)}</b></div><div><span>الفصول</span><b>${arabicNum(classes.length)}</b></div><div><span>الطلاب</span><b>${arabicNum(students)}</b></div><div><span>سجلات attendance</span><b>${arabicNum(records)}</b></div></div><div class="db-origin-row"><span>نطاق التخزين الحالي</span><code>${escapeHtml(location.origin)}</code></div><div class="db-catalog">${dbText}</div><div class="db-local-keys"><span>مفاتيح localStorage المرتبطة بالسجل</span><code>${lsKeys.length?lsKeys.map(escapeHtml).join(' · '):'لا توجد'}</code></div><p class="diagnostic-note">الفحص أعلاه قراءة فقط؛ لم يتم تعديل أي حالة حضور. مصدر جدول الطلاب: ${attendanceDiagnosticDbState?'IndexedDB → kv → state':'حالة التطبيق الحالية (تعذر قراءة state مباشرة من IndexedDB)'}.</p>`;
  renderAttendanceDiagnosticRows();
  toast('اكتمل فحص قاعدة بيانات الحضور')
}
function renderAttendanceReferenceSummary(){
  const el=$('#attendanceReferenceSummary');if(!el)return;
  const ref=attendanceReferenceCsv;if(!ref){el.hidden=true;el.innerHTML='';return}
  const c=diagnosticClass(),students=c?.students||[],studentKeys=new Set(students.map(st=>studentNameKey(st.name)));
  const matched=ref.items.filter(x=>studentKeys.has(studentNameKey(x.name))).length,missing=ref.items.length-matched;
  const expectedAbsent=ref.items.reduce((n,x)=>n+x.absent,0),expectedLate=ref.items.reduce((n,x)=>n+x.late,0);
  let dbAbsent=0,dbLate=0,matches=0,diffs=0;
  students.forEach(st=>{const cmp=attendanceDiagnosticComparison(st,ref);if(cmp.csv){dbAbsent+=cmp.atRef.absent;dbLate+=cmp.atRef.late;if(cmp.kind==='match')matches++;else diffs++}});
  el.hidden=false;el.innerHTML=`<div class="reference-title"><b>${escapeHtml(ref.fileName)}</b><span>${ref.cutoff?'المقارنة حتى '+escapeHtml(ref.cutoff):'المقارنة مع الإجمالي الحالي'}</span></div><div class="reference-kpis"><div><span>طلاب CSV المطابقون</span><b>${arabicNum(matched)} / ${arabicNum(ref.items.length)}</b></div><div><span>غياب CSV</span><b>${arabicNum(expectedAbsent)}</b></div><div><span>غياب DB للمطابقين</span><b>${arabicNum(dbAbsent)}</b></div><div><span>طلاب متطابقون</span><b>${arabicNum(matches)}</b></div><div><span>طلاب مختلفون</span><b>${arabicNum(diffs)}</b></div><div><span>أسماء CSV غير موجودة</span><b>${arabicNum(missing)}</b></div></div>`;
}
async function loadAttendanceReferenceCsv(file){
  try{
    attendanceReferenceCsv=parseAttendanceReferenceCsv(await file.text(),file.name);
    const best=bestClassForAttendanceReference(attendanceReferenceCsv);
    if(best?.classId)renderDiagnosticClassOptions(best.classId);
    renderAttendanceReferenceSummary();renderAttendanceDiagnosticRows();
    toast(`تم تحميل CSV ومطابقة ${arabicNum(best?.score||0)} طالبًا`)
  }catch{attendanceReferenceCsv=null;renderAttendanceReferenceSummary();toast('تعذر قراءة CSV: يجب أن يحتوي الاسم والغياب')}
}

async function save(){
  state.schemaVersion=SCHEMA_VERSION;const el=$('#saveStatus');if(el)el.textContent='جارٍ الحفظ…';
  try{const previous=await db.getIndexed('state');if(previous)persistAttendanceSnapshot(previous)}catch{}
  await db.set('state',state);persistAttendanceMirror(state);if(el)el.textContent='محفوظ على هذا الجهاز';const ae=$('#assessmentAutosaveStatus');if(ae){ae.textContent='✓ محفوظ تلقائيًا';ae.classList.remove('pending')}
}
function queueSave(){clearTimeout(saveTimer);saveTimer=setTimeout(save,220)}
async function load(){
  const stored=await db.get('state');
  const needsScheduleMigration=!!stored&&(!Array.isArray(stored.teacherSchedules)||Number(stored.schemaVersion||0)<SCHEMA_VERSION);
  const storedTeacher=String(stored?.appMeta?.teacher||'').trim(),storedSchool=String(stored?.appMeta?.school||'').trim();
  if(stored){const migrated=migrate(stored);if(migrated)state=migrated}
  state.classes.forEach(ensureClass);
  const recovery=await recoverAttendanceFromLocalSources({silent:true});
  const profileBackfilled=!!stored&&((!storedTeacher&&String(state.appMeta?.teacher||'').trim())||(!storedSchool&&String(state.appMeta?.school||'').trim()));
  if(needsScheduleMigration||profileBackfilled)await db.set('state',state);
  if(recovery.added)persistAttendanceMirror(state);
  if(!state.activeClassId&&state.classes[0])state.activeClassId=state.classes[0].id;
  const q=new URLSearchParams(location.search).get('view');if(['dashboard','admin','assessments','attendance','schedule','reports'].includes(q))state.ui.activeView=q;
  $('#attendanceDate').value=localDateISO();renderAll();showView(state.ui.activeView||'dashboard',false);
  storageRecoverySummary(recovery);
  if(recovery.added)setTimeout(()=>toast('استعاد التطبيق '+arabicNum(recovery.added)+' سجل حضور قديم تلقائيًا'),500)
}

function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(t._timer);t._timer=setTimeout(()=>t.classList.remove('show'),2100)}
function arabicNum(n){return Number(n||0).toLocaleString('ar-SA',{maximumFractionDigits:2})}
function pct(n){return n===null||n===undefined?'—':`${Math.round(Number(n)||0).toLocaleString('ar-SA')}٪`}
function escapeHtml(s=''){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function typeLabel(t){return TYPE_LABELS[t]||'أخرى'}
function statusLabel(s){return ({present:'حاضر',absent:'غائب',late:'متأخر',excused:'مستأذن'})[s]||'غير مسجل'}
function formatDate(d){if(!d)return'بدون تاريخ';try{return new Intl.DateTimeFormat('ar-SA',{year:'numeric',month:'short',day:'numeric'}).format(new Date(d+'T12:00:00'))}catch{return d}}
function monthLabel(m){if(!m)return'بدون تاريخ';try{return new Intl.DateTimeFormat('ar-SA',{year:'numeric',month:'long'}).format(new Date(m+'-15T12:00:00'))}catch{return m}}
function allStudents(){return state.classes.flatMap(c=>c.students)}
function allAssessmentCount(){return state.classes.reduce((n,c)=>n+(c.assessmentEvents?.length||0),0)}
function eventsForPeriod(c,period='all'){return (c.assessmentEvents||[]).filter(a=>period==='all'||monthKey(a.date)===period)}
function scoreSummary(s,c,period='all'){
  const events=eventsForPeriod(c,period);let earned=0,gradedMax=0,totalMax=0,gradedCount=0;
  for(const a of events){totalMax+=Number(a.maxScore)||0;const raw=s.grades?.[a.id];if(raw!==undefined&&raw!==null&&raw!==''&&!Number.isNaN(Number(raw))){earned+=Number(raw);gradedMax+=Number(a.maxScore)||0;gradedCount++}}
  return {earned,gradedMax,totalMax,gradedCount,eventCount:events.length,performance:gradedMax?earned/gradedMax*100:null,completion:events.length?gradedCount/events.length*100:0};
}
function attendanceCounts(s,period='all'){const out={present:0,absent:0,late:0,excused:0,total:0};Object.entries(s.attendance||{}).forEach(([d,v])=>{if(period!=='all'&&monthKey(d)!==period)return;if(out[v]!==undefined){out[v]++;out.total++}});return out}
function classAttendanceForDate(c,date){const out={present:0,absent:0,late:0,excused:0,unmarked:0};c.students.forEach(s=>{const v=s.attendance?.[date];if(out[v]!==undefined)out[v]++;else out.unmarked++});return out}
function riskForStudent(s,c,period='all'){const sc=scoreSummary(s,c,period),at=attendanceCounts(s,period),reasons=[];if(sc.performance!==null&&sc.performance<state.settings.gradeAlertThreshold)reasons.push(`المستوى ${pct(sc.performance)}`);if(at.absent>=state.settings.absenceAlertThreshold)reasons.push(`${arabicNum(at.absent)} غياب`);return {isRisk:reasons.length>0,reasons,score:sc,attendance:at}}
function monthsForClass(c){const set=new Set();(c.assessmentEvents||[]).forEach(a=>{const m=monthKey(a.date);if(m)set.add(m)});c.students.forEach(s=>Object.keys(s.attendance||{}).forEach(d=>{const m=monthKey(d);if(m)set.add(m)}));return [...set].sort().reverse()}

function renderAll(){renderAppMeta();renderClassBars();renderDashboard();renderAssessments();renderAttendance();renderSchedule();renderReports();renderInstallNote();renderDiagnosticClassOptions()}
function showView(name,saveUi=true){
  if(!['dashboard','admin','assessments','attendance','schedule','reports'].includes(name))name='dashboard';
  state.ui.activeView=name;
  $$('.view').forEach(v=>v.classList.toggle('active',v.dataset.view===name));
  $$('[data-nav]').forEach(b=>b.classList.toggle('active',b.dataset.nav===name));
  if(name==='assessments')renderAssessments();
  if(name==='attendance')renderAttendance();
  if(name==='schedule')renderSchedule();
  if(name==='reports'){renderReports();showReportsHub(false)}
  if(name==='admin'){renderAppMeta();renderSchedule();renderDiagnosticClassOptions();if($('#adminVersion'))$('#adminVersion').textContent='v'+APP_VERSION}
  window.scrollTo({top:0,behavior:'instant'});
  if(saveUi)queueSave()
}
function showReportsHub(saveUi=false){
  const view=$('#view-reports');if(!view)return;
  view.classList.remove('report-detail-mode');
  $$('[data-report-panel]').forEach(p=>p.classList.remove('active'));
  $$('[data-preview-box]').forEach(p=>p.classList.remove('open'));
  if(saveUi)queueSave()
}
function setReportTab(tab='class',saveUi=true,openDetail=true){
  if(!['class','attendance','students'].includes(tab))tab='class';
  state.ui.reportTab=tab;
  const view=$('#view-reports');if(view)view.classList.toggle('report-detail-mode',openDetail);
  $$('[data-report-panel]').forEach(p=>p.classList.toggle('active',openDetail&&p.dataset.reportPanel===tab));
  if(openDetail)requestAnimationFrame(()=>window.scrollTo({top:0,behavior:'smooth'}));
  if(saveUi)queueSave()
}
function toggleReportPreview(type){
  const box=$(`[data-preview-box="${type}"]`);if(!box)return;
  box.classList.toggle('open');
  const btn=$(`[data-preview-toggle="${type}"]`);
  if(btn)btn.textContent=box.classList.contains('open')?'إخفاء المعاينة':'👁 معاينة '+(type==='attendance'?'السجل':'الكشف')
}

function setActiveClass(id){
  if(!findClass(id))return;
  state.activeClassId=id;searchTerm='';reportStudentSearchTerm='';state.ui.assessmentMonth='all';state.ui.reportPeriod='all';
  const c=currentClass();if(c&&!c.selectedAssessmentId&&c.assessmentEvents[0])c.selectedAssessmentId=c.assessmentEvents[0].id;
  renderAll();if(state.ui.activeView==='reports')showReportsHub(false);queueSave()
}

function renderAppMeta(){$$('[data-app-meta]').forEach(inp=>{const k=inp.dataset.appMeta;if(document.activeElement!==inp)inp.value=state.appMeta[k]||'';inp.oninput=()=>{state.appMeta[k]=inp.value;if(k==='teacher'||k==='school'){(state.teacherSchedules||[]).forEach(t=>{if(k==='teacher')t.teacherName=inp.value;else t.school=inp.value});renderScheduleHeader()}queueSave()}})}
function classChipMarkup(c){return `<button class="chip ${c.id===state.activeClassId?'active':''}" data-class-switch="${c.id}">${escapeHtml(c.grade)} · ${escapeHtml(c.name)}</button>`}
function renderClassBars(){['#assessmentClassbar','#attendanceClassbar','#reportsClassbar'].forEach(sel=>{const b=$(sel);if(!b)return;b.innerHTML=state.classes.map(classChipMarkup).join('')+`<button class="chip add" data-open-classes>＋ فصل</button>`});$$('[data-class-switch]').forEach(x=>x.onclick=()=>setActiveClass(x.dataset.classSwitch));$$('[data-open-classes]').forEach(x=>x.onclick=openClasses)}

function schoolDateArabic(d=new Date()){
  try{return new Intl.DateTimeFormat('ar-SA-u-ca-gregory',{weekday:'long',year:'numeric',month:'long',day:'numeric'}).format(d)}catch{return d.toLocaleDateString('ar-SA')}
}
function schoolDateEnglish(d=new Date()){
  try{return new Intl.DateTimeFormat('en-GB',{weekday:'long',year:'numeric',month:'long',day:'numeric'}).format(d)}catch{return d.toLocaleDateString('en-GB')}
}
function schoolHijriDate(d=new Date()){
  try{return new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura',{year:'numeric',month:'long',day:'numeric'}).format(d)}catch{return 'التاريخ الهجري غير متاح'}
}
function schoolClock(d=new Date()){
  try{return new Intl.DateTimeFormat('ar-SA',{hour:'2-digit',minute:'2-digit'}).format(d)}catch{return d.toLocaleTimeString()}
}
function timeToMinutes(v=''){
  const m=String(v).match(/^(\d{1,2}):(\d{2})$/);return m?Number(m[1])*60+Number(m[2]):null
}
function schoolWeekForDate(d,schedule){
  const cfg=scheduleTermConfig(schedule?.semester||state.appMeta.semester||''),startText=schedule?.startDate||cfg?.start||'',endText=schedule?.endDate||cfg?.end||'';
  if(!startText)return {number:null,status:'لم تُحدد بداية الفصل'};
  const date=new Date(d.getFullYear(),d.getMonth(),d.getDate()),startRaw=new Date(startText+'T12:00:00');
  if(Number.isNaN(startRaw.getTime()))return {number:null,status:'بداية الفصل غير صالحة'};
  if(localDateISO(d)<startText)return {number:null,status:'لم يبدأ الفصل بعد'};
  if(endText&&localDateISO(d)>endText)return {number:null,status:'انتهت فترة سريان الجدول'};
  const sunday=x=>{const y=new Date(x.getFullYear(),x.getMonth(),x.getDate());y.setDate(y.getDate()-y.getDay());return y};
  const number=Math.floor((sunday(date)-sunday(startRaw))/(7*86400000))+1;
  return {number:Math.max(1,number),status:'حسب بداية الفصل'}
}
function schoolSlotText(slot){
  if(!slot)return {title:'لا توجد حصة مسجلة',detail:'وقت متاح في جدولك'};
  if(slot.kind==='standby')return {title:'انتظار / احتياط',detail:slot.note||'حصة انتظار'};
  return {title:slot.subject||'حصة دراسية',detail:slot.className||'الفصل غير محدد'}
}
function schoolMinutesText(minutes,prefix='متبقي'){
  if(!Number.isFinite(minutes))return '—';
  if(minutes<=0)return 'الآن';
  if(minutes<1)return prefix+' أقل من دقيقة';
  return prefix+' '+arabicNum(Math.ceil(minutes))+' د';
}
function schoolDaySnapshot(now=new Date()){
  const date=localDateISO(now),day=AR_DAY_BY_JS[now.getDay()],schedule=scheduleForDate(date),week=schoolWeekForDate(now,schedule);
  const minute=now.getHours()*60+now.getMinutes()+now.getSeconds()/60;
  const periods=Object.entries(PERIOD_TIMES).map(([period,times])=>{
    const start=timeToMinutes(times[0]),end=timeToMinutes(times[1]);
    return {period:Number(period),start,end,startText:times[0],endText:times[1],slot:schedule?.slots?.[scheduleKey(day,Number(period))]||null}
  }).filter(x=>Number.isFinite(x.start)&&Number.isFinite(x.end));
  const current=periods.find(x=>minute>=x.start&&minute<x.end)||null;
  const next=periods.find(x=>x.start>minute&&x.slot)||null;
  const first=periods[0],last=periods[periods.length-1],isSchoolDay=SCHEDULE_DAYS.includes(day);
  let phase='between';
  if(!isSchoolDay)phase='weekend';
  else if(first&&minute<first.start)phase='before';
  else if(last&&minute>=last.end)phase='after';
  else if(current)phase='period';
  const currentText=schoolSlotText(current?.slot);
  const nextText=schoolSlotText(next?.slot);
  const progress=current?Math.max(0,Math.min(100,(minute-current.start)/(current.end-current.start)*100)):0;
  return {now,date,day,schedule,week,minute,periods,current,next,currentText,nextText,phase,progress}
}
function schoolAlertMarks(){
  try{
    const raw=JSON.parse(localStorage.getItem(SCHOOL_ALERT_STORAGE)||'[]');
    const today=localDateISO();return new Set(Array.isArray(raw)?raw.filter(x=>String(x).startsWith(today+'|')):[])
  }catch{return new Set()}
}
function saveSchoolAlertMarks(set){
  try{localStorage.setItem(SCHOOL_ALERT_STORAGE,JSON.stringify([...set]))}catch{}
}
async function showSchoolNotification(title,body,tag){
  if(!('Notification'in window)||Notification.permission!=='granted')return false;
  try{
    const reg=await navigator.serviceWorker?.getRegistration();
    if(reg){await reg.showNotification(title,{body,icon:'./icons/icon-192.png',badge:'./icons/icon-192.png',tag,data:{url:'./?view=schedule'}});return true}
  }catch{}
  return false
}
async function checkSchoolPeriodAlerts(snapshot=schoolDaySnapshot()){
  if(!state.settings.schoolPeriodAlerts||!snapshot.schedule||!SCHEDULE_DAYS.includes(snapshot.day))return;
  if(!('Notification'in window)||Notification.permission!=='granted')return;
  const now=snapshot.minute,marks=schoolAlertMarks();
  for(const p of snapshot.periods){
    if(!p.slot)continue;
    const desc=schoolSlotText(p.slot),startKey=`${snapshot.date}|start|${p.period}`,endKey=`${snapshot.date}|end5|${p.period}`;
    if(now>=p.start&&now<p.start+1&&!marks.has(startKey)){
      marks.add(startKey);saveSchoolAlertMarks(marks);
      toast(`بدأت الحصة ${arabicNum(p.period)} — ${desc.title}`);
      await showSchoolNotification(`بدأت الحصة ${arabicNum(p.period)}`,`${desc.title} · ${desc.detail}`,startKey)
    }
    const five=p.end-5;
    if(now>=five&&now<five+1&&!marks.has(endKey)){
      marks.add(endKey);saveSchoolAlertMarks(marks);
      toast(`باقي ٥ دقائق على نهاية الحصة ${arabicNum(p.period)}`);
      await showSchoolNotification('باقي ٥ دقائق على نهاية الحصة',`الحصة ${arabicNum(p.period)} · ${desc.title}`,endKey)
    }
  }
}
function renderSchoolAlertButton(){
  const b=$('#schoolAlertBtn');if(!b)return;
  if(!('Notification'in window)||!('serviceWorker'in navigator)){
    b.textContent='التنبيهات غير مدعومة';b.disabled=true;b.classList.remove('enabled');return
  }
  b.disabled=false;
  if(Notification.permission==='denied'){
    b.textContent='🔕 التنبيهات محظورة من النظام';b.classList.remove('enabled');return
  }
  const enabled=state.settings.schoolPeriodAlerts&&Notification.permission==='granted';
  b.textContent=enabled?'🔔 تنبيهات الحصص مفعّلة':'🔔 تفعيل تنبيهات الحصص';
  b.classList.toggle('enabled',enabled)
}
async function toggleSchoolAlerts(){
  if(!('Notification'in window)||!('serviceWorker'in navigator)){toast('التنبيهات غير مدعومة على هذا الجهاز');return}
  if(Notification.permission==='denied'){toast('اسمح بالتنبيهات من إعدادات النظام أولًا');return}
  if(Notification.permission!=='granted'){
    const permission=await Notification.requestPermission();
    if(permission!=='granted'){renderSchoolAlertButton();toast('لم يتم السماح بالتنبيهات');return}
    state.settings.schoolPeriodAlerts=true
  }else state.settings.schoolPeriodAlerts=!state.settings.schoolPeriodAlerts;
  renderSchoolAlertButton();queueSave();
  toast(state.settings.schoolPeriodAlerts?'تم تفعيل تنبيهات الحصص':'تم إيقاف تنبيهات الحصص')
}
function renderSchoolDayCard(now=new Date()){
  if(!$('#schoolDayPanel'))return;
  const s=schoolDaySnapshot(now);
  $('#schoolDateArabic').textContent=schoolDateArabic(now);
  $('#schoolDateEnglish').textContent=schoolDateEnglish(now);
  $('#schoolHijriDate').textContent=schoolHijriDate(now)+' · أم القرى';
  $('#schoolLiveClock').textContent=schoolClock(now);
  $('#schoolWeekNumber').textContent=s.week.number?arabicNum(s.week.number):'—';
  $('#schoolWeekStatus').textContent=s.week.status;

  const currentNumber=$('#schoolCurrentPeriodNumber'),currentTitle=$('#schoolCurrentPeriodTitle'),currentDetail=$('#schoolCurrentPeriodDetail'),currentTime=$('#schoolCurrentPeriodTime'),remaining=$('#schoolCurrentRemaining'),progress=$('#schoolCurrentProgress');
  if(s.current){
    currentNumber.textContent='الحصة '+arabicNum(s.current.period);
    currentTitle.textContent=s.currentText.title;
    currentDetail.textContent=s.currentText.detail;
    currentTime.textContent=s.current.startText+' — '+s.current.endText;
    remaining.textContent=schoolMinutesText(s.current.end-s.minute,'متبقي');
    progress.style.width=s.progress.toFixed(1)+'%'
  }else{
    currentNumber.textContent=s.phase==='before'?'قبل الدوام':s.phase==='after'?'انتهى اليوم':s.phase==='weekend'?'إجازة أسبوعية':'بين الحصص';
    currentTitle.textContent=s.phase==='weekend'?'لا توجد حصص اليوم':s.phase==='after'?'انتهى اليوم الدراسي':s.phase==='before'?'لم تبدأ الحصص بعد':'لا توجد حصة الآن';
    currentDetail.textContent=s.schedule?s.schedule.title||'جدول المعلم':'لا يوجد جدول فعّال لهذا التاريخ';
    currentTime.textContent=s.phase==='before'&&s.periods[0]?'تبدأ الحصص '+s.periods[0].startText:'—';
    remaining.textContent='—';progress.style.width='0%'
  }

  const nextNumber=$('#schoolNextPeriodNumber'),nextTitle=$('#schoolNextPeriodTitle'),nextDetail=$('#schoolNextPeriodDetail'),nextTime=$('#schoolNextPeriodTime'),nextIn=$('#schoolNextStartsIn');
  if(s.next){
    nextNumber.textContent='الحصة '+arabicNum(s.next.period);
    nextTitle.textContent=s.nextText.title;
    nextDetail.textContent=s.nextText.detail;
    nextTime.textContent=s.next.startText+' — '+s.next.endText;
    nextIn.textContent=schoolMinutesText(s.next.start-s.minute,'بعد')
  }else{
    nextNumber.textContent='—';
    nextTitle.textContent=s.phase==='weekend'?'لا توجد حصة قادمة اليوم':'لا توجد حصة أخرى اليوم';
    nextDetail.textContent=s.phase==='after'?'اكتمل جدول اليوم':'حسب جدولك الحالي';
    nextTime.textContent='—';nextIn.textContent='—'
  }
  $('#schoolDayMessage').textContent=s.schedule?`${s.day} · ${s.schedule.title||'جدول المعلم'} · التحديث تلقائي`:'لا يوجد جدول فعّال لهذا اليوم';
  renderSchoolAlertButton();
  checkSchoolPeriodAlerts(s)
}
function startSchoolDayTicker(){
  clearInterval(schoolDayTimer);
  renderSchoolDayCard();
  schoolDayTimer=setInterval(()=>renderSchoolDayCard(),20000);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')renderSchoolDayCard()})
}

function renderDashboard(){
  renderSchoolDayCard();
  const students=allStudents(),today=localDateISO(),absentToday=students.filter(s=>s.attendance?.[today]==='absent').length;
  let riskCount=0;state.classes.forEach(c=>c.students.forEach(s=>{if(riskForStudent(s,c,'all').isRisk)riskCount++}));
  $('#dashboardKpis').innerHTML=`<div class="kpi"><span class="kpi-icon">👥</span><b>${arabicNum(students.length)}</b><span>إجمالي الطلاب</span></div><div class="kpi"><span class="kpi-icon">✓</span><b>${arabicNum(allAssessmentCount())}</b><span>التقييمات المسجلة</span></div><div class="kpi bad"><span class="kpi-icon">○</span><b>${arabicNum(absentToday)}</b><span>غياب اليوم</span></div><div class="kpi warn"><span class="kpi-icon">!</span><b>${arabicNum(riskCount)}</b><span>يحتاجون متابعة</span></div>`;
  $('#classCards').innerHTML=state.classes.length?state.classes.map(c=>{const a=classAttendanceForDate(c,today),risks=c.students.filter(s=>riskForStudent(s,c,'all').isRisk).length;return `<article class="class-card"><div class="class-card-head"><div><h3>${escapeHtml(c.name)}</h3><div class="class-sub">${escapeHtml(c.grade)} · ${escapeHtml(c.subject)}</div></div><span class="count-badge">${arabicNum(c.students.length)} طالب</span></div><div class="class-card-metrics"><div class="mini-metric"><b>${arabicNum(c.assessmentEvents.length)}</b><span>تقييم</span></div><div class="mini-metric"><b>${arabicNum(a.absent)}</b><span>غائب اليوم</span></div><div class="mini-metric ${risks?'risk-text':''}"><b>${arabicNum(risks)}</b><span>متابعة</span></div></div><div class="class-card-actions"><button class="btn primary" data-open-class="${c.id}" data-target="assessments">التقييمات</button><button class="btn" data-open-class="${c.id}" data-target="attendance">الحضور</button><button class="btn" data-open-class="${c.id}" data-target="reports">التقارير</button></div></article>`}).join(''):`<div class="empty-state"><b>لا توجد فصول</b>أضف فصلًا لبدء السجل.</div>`;
  $$('[data-open-class]').forEach(b=>b.onclick=()=>{setActiveClass(b.dataset.openClass);showView(b.dataset.target)})
}

function renderMonthOptions(select,selected,includeAll=true,assessmentOnly=false){const c=currentClass(),months=assessmentOnly?[...new Set(c.assessmentEvents.map(a=>monthKey(a.date)).filter(Boolean))].sort().reverse():monthsForClass(c);select.innerHTML=(includeAll?'<option value="all">الفصل كاملًا</option>':'')+months.map(m=>`<option value="${m}">${escapeHtml(monthLabel(m))}</option>`).join('');if([...select.options].some(o=>o.value===selected))select.value=selected;else select.value='all'}
function sortedEvents(c,filter='all'){return eventsForPeriod(c,filter).slice().sort((a,b)=>{if(!a.date&&!b.date)return 0;if(!a.date)return 1;if(!b.date)return-1;return b.date.localeCompare(a.date)})}
function assessmentCompletion(a,c){
  const total=(c.students||[]).length;
  const graded=(c.students||[]).filter(s=>s.grades?.[a.id]!==undefined&&s.grades?.[a.id]!==null&&s.grades?.[a.id]!=='').length;
  return {graded,total,complete:total>0&&graded===total,percent:total?Math.round(graded/total*100):0}
}
function assessmentTypeFilterOptions(){
  return [
    ['all','الكل'],['homework','واجبات'],['participation','مشاركة'],['quiz','اختبارات قصيرة'],
    ['exam','اختبارات'],['project','مشاريع'],['practical','عملي'],['other','أخرى']
  ]
}
function assessmentArchiveMonthKey(a){
  return monthKey(a.date)||'undated'
}
function assessmentArchiveMonthLabel(key){
  return key==='undated'?'بدون تاريخ':monthLabel(key)
}
function assessmentArchiveCurrentMonth(){return localDateISO().slice(0,7)}
function assessmentArchivePreviousMonth(){
  const d=new Date();d.setDate(1);d.setMonth(d.getMonth()-1);return localDateISO(d).slice(0,7)
}
function assessmentArchiveMatches(a){
  const type=state.ui.assessmentTypeFilter||'all';
  if(type!=='all'&&String(a.type||'other')!==type)return false;
  const q=studentNameKey(assessmentArchiveSearchTerm||'');
  if(q){
    const hay=studentNameKey([a.title,typeLabel(a.type),a.note,a.date].filter(Boolean).join(' '));
    if(!hay.includes(q))return false
  }
  return true
}
function assessmentArchiveRow(a,c){
  const x=assessmentCompletion(a,c),active=c.selectedAssessmentId===a.id,status=x.complete?'complete':'pending';
  return `<button class="assessment-archive-row ${status} ${active?'active':''}" data-assessment-select="${escapeHtml(a.id)}" type="button">
    <span class="assessment-row-status" aria-hidden="true"></span>
    <span class="assessment-row-type">${escapeHtml(typeLabel(a.type))}</span>
    <span class="assessment-row-main"><b>${escapeHtml(a.title)}</b><small>${escapeHtml(formatDate(a.date))} · من ${arabicNum(a.maxScore)}</small></span>
    <span class="assessment-row-progress"><b>${arabicNum(x.graded)} / ${arabicNum(x.total)}</b><small>${x.complete?'مكتمل':'قيد الرصد'}</small></span>
  </button>`
}
function assessmentArchiveGroupMarkup(key,items,c,open=false){
  const complete=items.filter(a=>assessmentCompletion(a,c).complete).length;
  const pending=items.length-complete;
  return `<details class="assessment-month-group" data-assessment-month-group="${escapeHtml(key)}" ${open?'open':''}>
    <summary>
      <span class="assessment-month-title"><b>${escapeHtml(assessmentArchiveMonthLabel(key))}</b><small>${arabicNum(items.length)} تقييم</small></span>
      <span class="assessment-month-counts"><em class="done">${arabicNum(complete)} مكتمل</em>${pending?`<em class="pending">${arabicNum(pending)} قيد الرصد</em>`:''}</span>
      <i aria-hidden="true"></i>
    </summary>
    <div class="assessment-month-list">${items.map(a=>assessmentArchiveRow(a,c)).join('')}</div>
  </details>`
}
function renderAssessmentArchive(c){
  const summary=$('#assessmentArchiveSummary'),listEl=$('#assessmentList'),typeBox=$('#assessmentTypeFilters'),search=$('#assessmentArchiveSearch'),monthSelect=$('#assessmentMonthFilter');
  if(!summary||!listEl||!typeBox||!monthSelect)return;
  const all=sortedEvents(c,'all'),completed=all.filter(a=>assessmentCompletion(a,c).complete).length,pending=all.length-completed;
  summary.innerHTML=`<div><span>جميع التقييمات</span><b>${arabicNum(all.length)}</b></div><div class="complete"><span>مكتمل الرصد</span><b>${arabicNum(completed)}</b></div><div class="pending"><span>قيد الرصد</span><b>${arabicNum(pending)}</b></div>`;

  renderMonthOptions(monthSelect,state.ui.assessmentMonth||'all',true,true);
  if(monthSelect.value!==(state.ui.assessmentMonth||'all'))state.ui.assessmentMonth=monthSelect.value;
  typeBox.innerHTML=assessmentTypeFilterOptions().map(([key,label])=>`<button type="button" class="${(state.ui.assessmentTypeFilter||'all')===key?'active':''}" data-assessment-type="${key}">${label}</button>`).join('');
  if(search&&document.activeElement!==search)search.value=assessmentArchiveSearchTerm;

  const selectedMonth=state.ui.assessmentMonth||'all';
  const filtered=all.filter(a=>(selectedMonth==='all'||assessmentArchiveMonthKey(a)===selectedMonth)&&assessmentArchiveMatches(a));
  const groups=new Map();
  filtered.forEach(a=>{const key=assessmentArchiveMonthKey(a);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(a)});
  const ordered=[...groups.entries()].sort((x,y)=>{
    if(x[0]==='undated')return 1;if(y[0]==='undated')return-1;return y[0].localeCompare(x[0])
  });
  const currentMonth=assessmentArchiveCurrentMonth(),selectedAssessment=findAssessment(c.selectedAssessmentId,c),selectedKey=selectedAssessment?assessmentArchiveMonthKey(selectedAssessment):'';
  const collapsed=state.ui.assessmentArchiveCollapsed||{};
  listEl.innerHTML=ordered.length?ordered.map(([key,items],idx)=>{
    const defaultOpen=selectedMonth!=='all'||(selectedKey?key===selectedKey:(key===currentMonth||idx===0));
    const open=Object.prototype.hasOwnProperty.call(collapsed,key)?!collapsed[key]:defaultOpen;
    return assessmentArchiveGroupMarkup(key,items,c,open)
  }).join(''):`<div class="empty-state compact-empty"><b>لا توجد نتائج</b>${all.length?'غيّر البحث أو عوامل التصفية.':'أضف أول واجب أو اختبار.'}</div>`;

  $$('[data-assessment-select]').forEach(b=>b.onclick=()=>{c.selectedAssessmentId=b.dataset.assessmentSelect;renderAssessments();queueSave()});
  $$('[data-assessment-type]').forEach(b=>b.onclick=()=>{state.ui.assessmentTypeFilter=b.dataset.assessmentType;renderAssessments();queueSave()});
  $$('[data-assessment-month-group]').forEach(el=>el.addEventListener('toggle',()=>{
    state.ui.assessmentArchiveCollapsed ||= {};
    state.ui.assessmentArchiveCollapsed[el.dataset.assessmentMonthGroup]=!el.open;
    queueSave()
  }));
}
function renderAssessmentPeriodTabs(){
  const box=$('#assessmentPeriodTabs');if(!box)return;
  const current=assessmentArchiveCurrentMonth(),previous=assessmentArchivePreviousMonth(),value=state.ui.assessmentMonth||'all';
  $$('[data-assessment-period]').forEach(b=>{
    const target=b.dataset.assessmentPeriod==='current'?current:b.dataset.assessmentPeriod==='previous'?previous:'all';
    b.classList.toggle('active',value===target);
    b.disabled=b.dataset.assessmentPeriod!=='all'&&!currentClass()?.assessmentEvents?.some(a=>monthKey(a.date)===target);
  })
}
function renderAssessments(){
  const c=currentClass();if(!c)return;$('#assessmentHeading').textContent=`التقييمات الزمنية — ${c.name}`;
  renderAssessmentArchive(c);renderAssessmentPeriodTabs();
  const a=findAssessment(c.selectedAssessmentId,c);$('#assessmentEmpty').hidden=!!a;$('#assessmentEditor').hidden=!a;if(!a){const nav=$('#assessmentPeerNav');if(nav){nav.innerHTML='';nav.hidden=true}return;}
  $('#selectedAssessmentType').textContent=typeLabel(a.type);$('#selectedAssessmentTitle').textContent=a.title;$('#selectedAssessmentMeta').textContent=`${formatDate(a.date)} · الدرجة العظمى ${arabicNum(a.maxScore)}${a.note?' · '+a.note:''}`;
  renderGradebook(a,c);renderAssessmentSummary(a,c);renderAssessmentPeerNav(a,c)
}
function quickGradeValues(maxScore){
  const max=Math.max(.5,Number(maxScore)||10),vals=[max,max*.9,max*.8,max*.7,max*.6].map(v=>Math.round(v*2)/2);
  return [...new Set(vals.filter(v=>v>=0&&v<=max))].sort((x,y)=>y-x)
}
function assessmentGradeState(st,a){
  const raw=st?.grades?.[a.id],has=raw!==undefined&&raw!==null&&raw!=='',value=has?Number(raw):null,percent=has&&a.maxScore?value/a.maxScore*100:null;
  return {has,value,percent}
}
function markAssessmentAutosavePending(){
  const el=$('#assessmentAutosaveStatus');if(el){el.textContent='جارٍ الحفظ…';el.classList.add('pending')}
}
function refreshAssessmentAfterGrade(a,c){
  renderGradebook(a,c);renderAssessmentSummary(a,c);renderDashboard();renderReports();markAssessmentAutosavePending();queueSave()
}
function setAssessmentGrade(c,a,studentId,value){
  const st=(c.students||[]).find(x=>x.id===studentId);if(!st)return false;
  if(value===null||value===undefined||value===''){delete st.grades[a.id]}
  else{
    const n=Number(value);
    if(Number.isNaN(n)||n<0||n>Number(a.maxScore)){toast(`أدخل درجة من 0 إلى ${arabicNum(a.maxScore)}`);return false}
    st.grades[a.id]=n
  }
  refreshAssessmentAfterGrade(a,c);return true
}
function renderQuickGradeControls(a,c){
  const box=$('#bulkGradeButtons');if(!box)return;
  const values=quickGradeValues(a.maxScore);
  box.innerHTML=values.map(v=>`<button class="quick-grade-btn" type="button" data-bulk-grade="${v}">${arabicNum(v)}</button>`).join('')+`<button class="quick-grade-btn custom" type="button" data-bulk-custom>مخصص</button>`;
  $$('[data-bulk-grade]').forEach(b=>b.onclick=()=>applyBulkAssessmentGrade(Number(b.dataset.bulkGrade),a,c));
  $('[data-bulk-custom]')?.addEventListener('click',()=>{
    const raw=prompt(`الدرجة المراد تعبئتها من ${arabicNum(a.maxScore)}:`);if(raw===null)return;
    const n=Number(latinDigits(raw));if(Number.isNaN(n)||n<0||n>a.maxScore){toast('الدرجة غير صحيحة');return}
    applyBulkAssessmentGrade(n,a,c)
  })
}
function applyBulkAssessmentGrade(value,a,c){
  const onlyEmpty=$('#bulkOnlyEmpty')?.checked!==false,all=c.students||[],targets=onlyEmpty?all.filter(st=>!assessmentGradeState(st,a).has):all;
  if(!targets.length){toast(onlyEmpty?'جميع الطلاب مرصودون بالفعل':'لا يوجد طلاب');return}
  if(!onlyEmpty){
    const existing=all.filter(st=>assessmentGradeState(st,a).has).length;
    if(existing&&!confirm(`سيتم استبدال درجات ${arabicNum(existing)} طالبًا وتعيين الدرجة ${arabicNum(value)} للجميع. متابعة؟`))return
  }
  targets.forEach(st=>{st.grades[a.id]=Number(value)});
  refreshAssessmentAfterGrade(a,c);
  toast(`تم رصد ${arabicNum(value)} لـ ${arabicNum(targets.length)} طالبًا`)
}
function mobileGradeCard(st,a,c){
  const idx=c.students.findIndex(x=>x.id===st.id),g=assessmentGradeState(st,a),values=quickGradeValues(a.maxScore);
  const status=g.has?(g.percent>=state.settings.gradeAlertThreshold?'جيد':'متابعة'):'غير مرصود';
  const statusClass=g.has?(g.percent>=state.settings.gradeAlertThreshold?'ok':'risk'):'neutral';
  return `<article class="mobile-grade-card ${g.has?'graded':'ungraded'}" data-mobile-student="${st.id}">
    <div class="mobile-grade-card-head">
      <span class="mobile-grade-index">${arabicNum(idx+1)}</span>
      <div class="mobile-grade-name"><b>${escapeHtml(st.name)}</b><small><span class="status-tag ${statusClass}">${status}</span>${g.has?' · '+pct(g.percent):''}</small></div>
      <div class="mobile-grade-current"><b>${g.has?arabicNum(g.value):'—'}</b><small>من ${arabicNum(a.maxScore)}</small></div>
    </div>
    <div class="student-quick-grades">
      ${values.map(v=>`<button type="button" class="student-grade-chip ${g.has&&Number(g.value)===Number(v)?'active':''}" data-mobile-grade="${st.id}" data-grade-value="${v}">${arabicNum(v)}</button>`).join('')}
      <button type="button" class="student-grade-chip clear ${!g.has?'active':''}" data-mobile-clear="${st.id}">—</button>
    </div>
    <div class="mobile-grade-custom">
      <label>درجة مخصصة</label>
      <input data-mobile-custom="${st.id}" type="number" inputmode="decimal" min="0" max="${a.maxScore}" step="0.5" value="${g.has?g.value:''}" placeholder="—">
      <button class="btn tiny" type="button" data-mobile-report="${st.id}">تقرير</button>
    </div>
  </article>`
}
function renderGradebook(a,c){
  const term=searchTerm.trim().toLowerCase(),students=term?c.students.filter(s=>s.name.toLowerCase().includes(term)):c.students;
  const table=$('#gradebookTable');
  if(table)table.innerHTML=`<thead><tr><th>م</th><th>اسم الطالب</th><th>الدرجة / ${arabicNum(a.maxScore)}</th><th>النسبة</th><th>الحالة</th><th class="no-print">التقرير</th></tr></thead><tbody>${students.length?students.map(st=>{const idx=c.students.findIndex(x=>x.id===st.id),g=assessmentGradeState(st,a);return `<tr><td>${arabicNum(idx+1)}</td><td class="student-name-cell">${escapeHtml(st.name)}</td><td><input class="grade-input" data-grade="${st.id}" type="number" min="0" max="${a.maxScore}" step="0.5" value="${g.has?g.value:''}" placeholder="—"></td><td>${pct(g.percent)}</td><td>${g.has?(g.percent>=state.settings.gradeAlertThreshold?'<span class="status-tag ok">جيد</span>':'<span class="status-tag risk">متابعة</span>'):'<span class="status-tag neutral">غير مرصود</span>'}</td><td class="no-print"><button class="btn tiny" data-report="${st.id}">عرض</button></td></tr>`}).join(''):`<tr><td colspan="6" class="empty-cell">${term?'لا توجد نتائج مطابقة':'لا يوجد طلاب في هذا الفصل'}</td></tr>`}</tbody>`;
  const mobile=$('#mobileGradeCards');
  if(mobile)mobile.innerHTML=students.length?students.map(st=>mobileGradeCard(st,a,c)).join(''):`<div class="empty-state compact-empty"><b>لا توجد نتائج</b>${term?'غيّر عبارة البحث.':'لا يوجد طلاب في هذا الفصل.'}</div>`;
  renderQuickGradeControls(a,c);
  $$('[data-grade]').forEach(inp=>inp.onchange=()=>setAssessmentGrade(c,a,inp.dataset.grade,inp.value.trim()));
  $$('[data-mobile-grade]').forEach(b=>b.onclick=()=>setAssessmentGrade(c,a,b.dataset.mobileGrade,Number(b.dataset.gradeValue)));
  $$('[data-mobile-clear]').forEach(b=>b.onclick=()=>setAssessmentGrade(c,a,b.dataset.mobileClear,null));
  $$('[data-mobile-custom]').forEach(inp=>inp.onchange=()=>setAssessmentGrade(c,a,inp.dataset.mobileCustom,inp.value.trim()));
  $$('#gradebookTable [data-report]').forEach(b=>b.onclick=()=>openStudentReport(b.dataset.report));
  $$('[data-mobile-report]').forEach(b=>b.onclick=()=>openStudentReport(b.dataset.mobileReport))
}

function renderAssessmentSummary(a,c){const vals=c.students.map(s=>s.grades?.[a.id]).filter(v=>v!==undefined&&v!==null&&v!==''&&!Number.isNaN(Number(v))).map(Number),graded=vals.length,avg=graded?vals.reduce((x,y)=>x+y,0)/graded:null,pass=vals.filter(v=>a.maxScore&&v/a.maxScore*100>=state.settings.gradeAlertThreshold).length;$('#assessmentSummary').innerHTML=`<div class="stat"><b>${arabicNum(graded)} / ${arabicNum(c.students.length)}</b><span>تم الرصد</span></div><div class="stat"><b>${avg===null?'—':arabicNum(avg)}</b><span>متوسط الدرجة</span></div><div class="stat ok"><b>${avg===null?'—':pct(avg/a.maxScore*100)}</b><span>متوسط النسبة</span></div><div class="stat warn"><b>${arabicNum(graded-pass)}</b><span>تحت حد المتابعة</span></div>`}

function assessmentPeerCandidates(a,c){
  return assessmentPeerClasses(c).map(target=>({target,assessment:assessmentCounterpartInClass(a,c,target)})).filter(x=>x.assessment)
}
function openAssessmentPeer(classId,assessmentId){
  const target=findClass(classId),a=target?findAssessment(assessmentId,target):null;if(!target||!a)return;
  state.activeClassId=target.id;target.selectedAssessmentId=a.id;searchTerm='';state.ui.assessmentMonth='all';state.ui.activeView='assessments';
  renderAll();showView('assessments',false);queueSave();
  requestAnimationFrame(()=>$('#assessmentEditor')?.scrollIntoView({block:'start',behavior:'smooth'}))
}
function renderAssessmentPeerNav(a,c){
  const el=$('#assessmentPeerNav');if(!el)return;
  const peers=assessmentPeerCandidates(a,c);
  if(peers.length<=1){el.innerHTML='';el.hidden=true;return}
  const idx=peers.findIndex(x=>x.target.id===c.id),prev=idx>0?peers[idx-1]:null,next=idx>=0&&idx<peers.length-1?peers[idx+1]:null;
  el.hidden=false;
  el.innerHTML=`<div class="assessment-peer-progress"><span>نفس التقييم في الفصول المناظرة</span><b>${arabicNum(idx+1)} / ${arabicNum(peers.length)}</b></div><div class="assessment-peer-actions">${prev?`<button class="btn" data-peer-class="${prev.target.id}" data-peer-assessment="${prev.assessment.id}">› السابق: ${escapeHtml(prev.target.name)}</button>`:''}${next?`<button class="btn primary" data-peer-class="${next.target.id}" data-peer-assessment="${next.assessment.id}">التالي: ${escapeHtml(next.target.name)} ‹</button>`:'<span class="assessment-peer-done">✓ آخر فصل في هذا التقييم</span>'}</div>`;
  $$('[data-peer-class]').forEach(b=>b.onclick=()=>openAssessmentPeer(b.dataset.peerClass,b.dataset.peerAssessment))
}
function assessmentAcademicKey(v=''){
  return String(v??'').normalize('NFKC').trim().replace(/[\u064B-\u065F\u0670\u0640]/g,'').replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/[^\p{L}\p{N}]+/gu,'').toLowerCase()
}
function assessmentPeerClasses(c){
  if(!c)return[];
  const grade=assessmentAcademicKey(c.grade),subject=assessmentAcademicKey(c.subject);
  return (state.classes||[]).filter(x=>assessmentAcademicKey(x.grade)===grade&&assessmentAcademicKey(x.subject)===subject)
}
function assessmentIdentityKey(a){
  return [assessmentAcademicKey(a?.title||''),String(a?.type||''),String(a?.date||'')].join('|')
}
function assessmentExistsInClass(c,draft,excludeId=''){
  const key=assessmentIdentityKey(draft);
  return (c?.assessmentEvents||[]).some(a=>a.id!==excludeId&&assessmentIdentityKey(a)===key)
}
function assessmentCounterpartInClass(base,currentClass,targetClass){
  if(!base||!targetClass)return null;
  if(targetClass.id===currentClass.id)return base;
  if(base.repeatGroupId){
    const linked=(targetClass.assessmentEvents||[]).find(a=>a.repeatGroupId===base.repeatGroupId);
    if(linked)return linked
  }
  const oldKey=assessmentIdentityKey(base);
  return (targetClass.assessmentEvents||[]).find(a=>assessmentIdentityKey(a)===oldKey)||null
}
function assessmentEditPlan(){
  const c=currentClass(),base=editingAssessmentId?findAssessment(editingAssessmentId,c):null,peers=assessmentPeerClasses(c);
  return peers.map(target=>({target,assessment:base?assessmentCounterpartInClass(base,c,target):null}))
}
function highestGradeForAssessment(c,a){
  if(!c||!a)return 0;
  return Math.max(0,...(c.students||[]).map(s=>Number(s.grades?.[a.id])).filter(Number.isFinite))
}
function renderAssessmentRepeatInfo(){
  const card=$('#assessmentRepeatCard'),toggle=$('#assessmentRepeatToggle'),info=$('#assessmentRepeatInfo'),titleEl=$('#assessmentRepeatTitle'),descEl=$('#assessmentRepeatDesc'),c=currentClass();
  if(!card||!toggle||!info||!c)return;
  card.hidden=false;
  const peers=assessmentPeerClasses(c),others=peers.filter(x=>x.id!==c.id);

  if(editingAssessmentId){
    const base=findAssessment(editingAssessmentId,c),plan=assessmentEditPlan(),existingOther=plan.filter(x=>x.target.id!==c.id&&x.assessment).length;
    if(titleEl)titleEl.textContent='تطبيق التعديل على الفصول المناظرة';
    if(descEl)descEl.textContent='يعدّل التقييمات المناظرة في نفس الصف والمادة، وينشئ نسخة في الفصل الذي لا يحتوي هذا التقييم.';
    if(!others.length){
      toggle.checked=false;toggle.disabled=true;
      info.innerHTML='<span class="assessment-repeat-note">لا توجد فصول أخرى من نفس الصف والمادة؛ سيُعدّل التقييم في الفصل الحالي فقط.</span>';
      return
    }
    toggle.disabled=false;
    if(toggle.checked){
      const existing=plan.filter(x=>x.assessment).length,missing=plan.length-existing;
      info.innerHTML=`<div class="assessment-repeat-summary"><b>سيُعدّل ${arabicNum(existing)} تقييم${missing?' · وينشئ '+arabicNum(missing)+' نسخة':''}</b><span>${escapeHtml(c.grade)} · ${escapeHtml(c.subject)}</span></div><div class="assessment-repeat-targets">${plan.map(x=>`<span class="${x.target.id===c.id?'current':''}">${escapeHtml(x.target.name)} · ${x.assessment?'تعديل':'إنشاء'}</span>`).join('')}</div>`
    }else{
      info.innerHTML=`<div class="assessment-repeat-summary"><b>سيُعدّل الفصل الحالي فقط</b><span>${escapeHtml(c.grade)} · ${escapeHtml(c.subject)}</span></div><div class="assessment-repeat-targets"><span class="current">${escapeHtml(c.name)} · الحالي</span></div>`
    }
    return
  }

  if(titleEl)titleEl.textContent='تكرار التقييم على الفصول المناظرة';
  if(descEl)descEl.textContent='نفس الصف ونفس المادة. يمكنك إيقافه لإنشاء التقييم في الفصل الحالي فقط.';
  if(!others.length){
    toggle.checked=false;toggle.disabled=true;
    info.innerHTML='<span class="assessment-repeat-note">لا توجد فصول أخرى من نفس الصف والمادة؛ سيُحفظ التقييم في الفصل الحالي فقط.</span>';
    return
  }
  toggle.disabled=false;
  const targets=toggle.checked?peers:[c];
  info.innerHTML=`<div class="assessment-repeat-summary"><b>${toggle.checked?'سيُنشأ في '+arabicNum(targets.length)+' فصول':'سيُنشأ في الفصل الحالي فقط'}</b><span>${escapeHtml(c.grade)} · ${escapeHtml(c.subject)}</span></div><div class="assessment-repeat-targets">${targets.map(x=>`<span class="${x.id===c.id?'current':''}">${escapeHtml(x.name)}${x.id===c.id?' · الحالي':''}</span>`).join('')}</div>`
}
function openAssessmentModal(id=null){
  const a=id?findAssessment(id):null;
  editingAssessmentId=id;
  $('#assessmentModalTitle').textContent=a?'تعديل التقييم':'تقييم جديد';
  $('#assessmentTitleInput').value=a?.title||'';
  $('#assessmentTypeInput').value=a?.type||'homework';
  $('#assessmentDateInput').value=a?.date||localDateISO();
  $('#assessmentMaxInput').value=a?.maxScore||10;
  $('#assessmentNoteInput').value=a?.note||'';
  const toggle=$('#assessmentRepeatToggle');
  if(toggle){
    const c=currentClass(),peers=assessmentPeerClasses(c),hasPeers=peers.length>1;
    if(a){
      const plan=assessmentEditPlan(),hasLinkedOrMatched=plan.some(x=>x.target.id!==c.id&&x.assessment);
      toggle.checked=hasPeers&&!!(a.repeatGroupId||hasLinkedOrMatched)
    }else toggle.checked=hasPeers;
    toggle.disabled=!hasPeers
  }
  renderAssessmentRepeatInfo();
  $('#assessmentModal').showModal();
  setTimeout(()=>$('#assessmentTitleInput').focus(),50)
}
function saveAssessment(){
  const c=currentClass(),title=$('#assessmentTitleInput').value.trim(),date=$('#assessmentDateInput').value,type=$('#assessmentTypeInput').value,maxScore=Number($('#assessmentMaxInput').value),note=$('#assessmentNoteInput').value.trim();
  if(!title){toast('اكتب اسم التقييم');return}
  if(!date){toast('اختر تاريخ التقييم');return}
  if(!maxScore||maxScore<=0){toast('الدرجة العظمى غير صحيحة');return}
  const draft={title,type,date,maxScore,note,legacy:false};

  if(editingAssessmentId){
    const base=findAssessment(editingAssessmentId,c);if(!base)return;
    const repeat=!!$('#assessmentRepeatToggle')?.checked&&assessmentPeerClasses(c).length>1;

    if(!repeat){
      const highest=highestGradeForAssessment(c,base);
      if(maxScore<highest){toast(`يوجد طالب درجته ${highest}؛ ارفع الدرجة العظمى أولًا`);return}
      if(assessmentExistsInClass(c,draft,base.id)){toast('يوجد تقييم آخر بنفس الاسم والنوع والتاريخ في هذا الفصل');return}
      Object.assign(base,draft);
      delete base.repeatGroupId;delete base.repeatSourceClassId;
      $('#assessmentModal').close();state.ui.assessmentMonth='all';renderAll();queueSave();toast('تم تعديل التقييم في الفصل الحالي فقط');return
    }

    const plan=assessmentEditPlan(),groupId=base.repeatGroupId||uid(),sourceClassId=base.repeatSourceClassId||c.id;
    for(const item of plan){
      if(item.assessment){
        const highest=highestGradeForAssessment(item.target,item.assessment);
        if(maxScore<highest){toast(`لا يمكن خفض الدرجة: في ${item.target.name} توجد درجة ${highest}`);return}
        if(assessmentExistsInClass(item.target,draft,item.assessment.id)){toast(`يوجد تقييم آخر مطابق في ${item.target.name}`);return}
      }else if(assessmentExistsInClass(item.target,draft)){
        toast(`يوجد تقييم مطابق مسبقًا في ${item.target.name}`);return
      }
    }

    let updated=0,created=0;
    for(const item of plan){
      if(item.assessment){
        Object.assign(item.assessment,draft,{repeatGroupId:groupId,repeatSourceClassId:sourceClassId});updated++
      }else{
        const copy={id:uid(),...draft,repeatGroupId:groupId,repeatSourceClassId:sourceClassId};
        item.target.assessmentEvents.push(copy);
        if(!item.target.selectedAssessmentId)item.target.selectedAssessmentId=copy.id;
        created++
      }
    }
    $('#assessmentModal').close();state.ui.assessmentMonth='all';renderAll();queueSave();
    toast(`تم تحديث التقييم في ${arabicNum(updated)} فصول${created?' · وإنشاء '+arabicNum(created)+' نسخة':''}`);
    return
  }

  const repeat=!!$('#assessmentRepeatToggle')?.checked,peers=assessmentPeerClasses(c),targets=repeat&&peers.length>1?peers:[c],repeatGroupId=targets.length>1?uid():null;
  let created=0,skipped=0,currentAssessmentId=null;
  for(const target of targets){
    if(assessmentExistsInClass(target,draft)){skipped++;continue}
    const a={id:uid(),...draft};
    if(repeatGroupId){a.repeatGroupId=repeatGroupId;a.repeatSourceClassId=c.id}
    target.assessmentEvents.push(a);
    if(target.id===c.id)currentAssessmentId=a.id;
    if(!target.selectedAssessmentId)target.selectedAssessmentId=a.id;
    created++
  }
  if(!created){toast('هذا التقييم موجود مسبقًا في الفصول المحددة');return}
  if(currentAssessmentId)c.selectedAssessmentId=currentAssessmentId;
  $('#assessmentModal').close();state.ui.assessmentMonth='all';renderAll();queueSave();
  if(targets.length>1){
    const skippedText=skipped?` · تم تجاوز ${arabicNum(skipped)} مكرر`:'';
    toast(`تم إنشاء التقييم في ${arabicNum(created)} فصول${skippedText}`)
  }else toast('تم إنشاء التقييم')
}

function deleteAssessment(){const c=currentClass(),a=findAssessment(c.selectedAssessmentId,c);if(!a)return;if(!confirm(`حذف «${a.title}» وجميع درجاته؟`))return;c.assessmentEvents=c.assessmentEvents.filter(x=>x.id!==a.id);c.students.forEach(s=>delete s.grades?.[a.id]);c.selectedAssessmentId=c.assessmentEvents[0]?.id||null;renderAll();queueSave();toast('تم حذف التقييم')}

function addStudent(){const c=currentClass();if(!c)return;const name=prompt('اسم الطالب:');if(!name?.trim())return;c.students.push(makeStudent(name.trim()));renderAll();queueSave();toast('تمت إضافة الطالب')}
function openStudents(){renderStudentsModal();$('#studentsModal').showModal()}
function renderStudentsModal(){const c=currentClass();$('#studentsModalTitle').textContent=`إدارة الطلاب — ${c.name}`;$('#studentsBody').innerHTML=c.students.length?c.students.map((s,i)=>`<div class="student-manage-row" data-student-manage="${s.id}"><span>${arabicNum(i+1)}</span><input value="${escapeHtml(s.name)}" data-student-rename="${s.id}"><button class="iconbtn" data-student-up="${s.id}" title="أعلى">↑</button><button class="iconbtn" data-student-down="${s.id}" title="أسفل">↓</button><button class="iconbtn" data-student-move="${s.id}" title="نقل">↪</button><button class="iconbtn" data-student-delete="${s.id}" title="حذف">×</button></div>`).join(''):`<div class="empty-state"><b>لا يوجد طلاب</b>أضف طالبًا أو استورد CSV.</div>`;$$('[data-student-rename]').forEach(i=>i.onchange=()=>{const s=findStudent(i.dataset.studentRename);if(s)s.name=i.value.trim()||s.name;renderAll();renderStudentsModal();queueSave()});$$('[data-student-up]').forEach(b=>b.onclick=()=>moveStudentRelative(b.dataset.studentUp,-1));$$('[data-student-down]').forEach(b=>b.onclick=()=>moveStudentRelative(b.dataset.studentDown,1));$$('[data-student-delete]').forEach(b=>b.onclick=()=>deleteStudent(b.dataset.studentDelete));$$('[data-student-move]').forEach(b=>b.onclick=()=>moveStudentClass(b.dataset.studentMove))}
function moveStudentRelative(id,delta){const a=currentClass().students,i=a.findIndex(s=>s.id===id),j=i+delta;if(i<0||j<0||j>=a.length)return;[a[i],a[j]]=[a[j],a[i]];renderAll();renderStudentsModal();queueSave()}
function deleteStudent(id){const c=findStudentClass(id),s=findStudent(id);if(!c||!s)return;if(!confirm(`حذف الطالب «${s.name}» وجميع درجاته وحضوره؟`))return;c.students=c.students.filter(x=>x.id!==id);renderAll();renderStudentsModal();queueSave()}
function moveStudentClass(id){const from=findStudentClass(id),s=findStudent(id);if(!from||!s)return;if(state.classes.length<2){toast('أضف فصلًا آخر أولًا');return}const targets=state.classes.filter(c=>c.id!==from.id),choices=targets.map((c,i)=>`${i+1}) ${c.grade} · ${c.name}`).join('\n'),n=Number(prompt(`انقل «${s.name}» إلى:\n${choices}`));if(!n||!targets[n-1])return;const target=targets[n-1];from.students=from.students.filter(x=>x.id!==id);target.students.push(s);target.students.sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'ar',{sensitivity:'base',ignorePunctuation:true,numeric:true}));renderAll();renderStudentsModal();queueSave();toast('تم نقل الطالب وترتيبه أبجديًا')}

function openClasses(){renderClassesModal();$('#classesModal').showModal()}
function renderClassesModal(){const b=$('#classesBody');b.innerHTML=state.classes.map(c=>`<div class="fieldrow class-edit-row" data-class-row="${c.id}"><input data-class-name value="${escapeHtml(c.name)}" aria-label="اسم الفصل"><input data-class-grade value="${escapeHtml(c.grade)}" aria-label="الصف"><input data-class-subject value="${escapeHtml(c.subject)}" aria-label="المادة"><button class="iconbtn" data-class-del="${c.id}" ${state.classes.length===1?'disabled':''}>×</button></div>`).join('');$$('[data-class-row]').forEach(r=>{const c=findClass(r.dataset.classRow);r.querySelector('[data-class-name]').onchange=e=>{c.name=e.target.value.trim()||'فصل';renderAll();queueSave()};r.querySelector('[data-class-grade]').onchange=e=>{c.grade=e.target.value.trim();renderAll();queueSave()};r.querySelector('[data-class-subject]').onchange=e=>{c.subject=e.target.value.trim();renderAll();queueSave()}});$$('[data-class-del]').forEach(x=>x.onclick=()=>{const c=findClass(x.dataset.classDel);if((c.students.length||c.assessmentEvents.length)&&!confirm('الفصل يحتوي سجلات. حذف الفصل سيحذف الطلاب والتقييمات والحضور. متابعة؟'))return;state.classes=state.classes.filter(k=>k.id!==c.id);if(!state.classes.some(k=>k.id===state.activeClassId))state.activeClassId=state.classes[0]?.id;renderClassesModal();renderAll();queueSave()})}
function addClass(){const name=$('#newClassName').value.trim(),grade=$('#newClassGrade').value.trim(),subject=$('#newClassSubject').value.trim();if(!name){toast('اكتب اسم الفصل');return}const c=makeClass(name,grade||'الصف',subject||'المادة',[]);state.classes.push(c);state.activeClassId=c.id;$('#newClassName').value='';$('#newClassGrade').value='';$('#newClassSubject').value='';renderClassesModal();renderAll();queueSave();toast('تمت إضافة الفصل')}


let editingScheduleSlot=null,editingSupervisionId=null,scheduleEntryMode='cell',scheduleEntrySubject='',scheduleEntryClassId='',scheduleEntryContextKey='',scheduleEntrySelected=new Set(),scheduleCellPickerDay='',scheduleCellPickerPeriod=0;
function scheduleKey(day,period){return `${day}-${period}`}
function scheduleTimeLabel(start,end){const fmt=t=>{if(!t)return'';let [h,m]=t.split(':').map(Number),ap=h>=12?'م':'ص';h=h%12||12;return `${h}:${String(m).padStart(2,'0')} ${ap}`};return start&&end?`${fmt(start)} - ${fmt(end)}`:''}
function scheduleSlot(day,period,t=currentTeacherSchedule()){const base=t?.slots?.[scheduleKey(day,period)]||null;if(!base)return null;const pt=PERIOD_TIMES[period]||[];return {...base,start:base.start||pt[0]||'',end:base.end||pt[1]||''}}
function scheduleClassColor(name=''){const palette=['#dbeafe','#dcfce7','#fef3c7','#fce7f3','#ede9fe','#cffafe','#ffedd5','#e2e8f0','#d1fae5'];let h=0;for(const ch of name)h=(h*31+ch.charCodeAt(0))>>>0;return palette[h%palette.length]}

function scheduleSubjectKey(v=''){return assessmentAcademicKey(v||'')}
function scheduleTeachingSubjects(){
  const map=new Map();
  for(const c of state.classes||[]){
    const name=String(c.subject||'').trim();if(!name)continue;
    const key=scheduleSubjectKey(name);if(key&&!map.has(key))map.set(key,name)
  }
  if(!map.size){
    for(const slot of Object.values(currentTeacherSchedule()?.slots||{})){
      const name=String(slot?.subject||'').trim();if(!name)continue;
      const key=scheduleSubjectKey(name);if(key&&!map.has(key))map.set(key,name)
    }
  }
  return [...map.values()]
}
function scheduleClassesForSubject(subject=scheduleEntrySubject){
  const key=scheduleSubjectKey(subject);
  return (state.classes||[]).filter(c=>scheduleSubjectKey(c.subject||'')===key)
}
function scheduleEntryClass(){return (state.classes||[]).find(c=>c.id===scheduleEntryClassId)||null}
function sameScheduledClass(slot,c){
  if(!slot||slot.kind!=='class'||!c)return false;
  if(slot.classId&&slot.classId===c.id)return true;
  return normalizeScheduleCode(slot.className||'')===normalizeScheduleCode(classScheduleCode(c))
}
function scheduleOwnSlotKeys(t,c){
  const out=[];
  for(const [key,slot] of Object.entries(t?.slots||{}))if(sameScheduledClass(slot,c))out.push(key);
  return out
}
function syncScheduleEntryContext(force=false){
  const t=currentTeacherSchedule(),subjects=scheduleTeachingSubjects();
  if(!subjects.some(x=>scheduleSubjectKey(x)===scheduleSubjectKey(scheduleEntrySubject)))scheduleEntrySubject=subjects[0]||'';
  const classes=scheduleClassesForSubject(scheduleEntrySubject);
  if(!classes.some(c=>c.id===scheduleEntryClassId))scheduleEntryClassId=classes[0]?.id||'';
  const context=[t?.id||'',scheduleSubjectKey(scheduleEntrySubject),scheduleEntryClassId].join('|');
  if(force||context!==scheduleEntryContextKey){
    scheduleEntryContextKey=context;
    scheduleEntrySelected=new Set(scheduleOwnSlotKeys(t,scheduleEntryClass()))
  }
}
function scheduleEntryConflict(day,period){
  const t=currentTeacherSchedule(),c=scheduleEntryClass(),slot=t?.slots?.[scheduleKey(day,period)]||null;
  return !!slot&&!sameScheduledClass(slot,c)
}
function scheduleEntrySlotLabel(key){
  const m=String(key).match(/^(.*)-(\d+)$/);if(!m)return key;
  return `${m[1]} ح${arabicNum(Number(m[2]))}`
}
function renderScheduleEntryControls(){
  const subjectTabs=$('#scheduleSubjectTabs'),classSelect=$('#scheduleClassSelect'),summary=$('#scheduleEntrySummary'),distribution=$('#scheduleDistributionControls'),hint=$('#scheduleCellModeHint');
  if(!subjectTabs||!classSelect||!summary)return;
  syncScheduleEntryContext();
  if(distribution)distribution.hidden=scheduleEntryMode!=='distribution';
  if(hint)hint.hidden=scheduleEntryMode!=='cell';
  $$('[data-schedule-mode]').forEach(b=>b.classList.toggle('active',b.dataset.scheduleMode===scheduleEntryMode));
  const subjects=scheduleTeachingSubjects(),classes=scheduleClassesForSubject(scheduleEntrySubject),c=scheduleEntryClass();
  subjectTabs.innerHTML=subjects.length?subjects.map(name=>`<button class="schedule-subject-chip ${scheduleSubjectKey(name)===scheduleSubjectKey(scheduleEntrySubject)?'active':''}" data-schedule-subject="${escapeHtml(name)}" style="--subject-color:${scheduleClassColor(name)}">${escapeHtml(name)}</button>`).join(''):`<span class="schedule-entry-empty">لا توجد مواد مرتبطة بالفصول. أضف المادة من إدارة الفصول أولًا.</span>`;
  classSelect.innerHTML=classes.length?classes.map(x=>`<option value="${escapeHtml(x.id)}" ${x.id===scheduleEntryClassId?'selected':''}>${escapeHtml(x.grade)} — ${escapeHtml(x.name)}</option>`).join(''):'<option value="">لا توجد فصول لهذه المادة</option>';
  classSelect.disabled=!classes.length||scheduleEntryMode!=='distribution';
  const selected=[...scheduleEntrySelected].sort((a,b)=>{
    const ma=a.match(/^(.*)-(\d+)$/),mb=b.match(/^(.*)-(\d+)$/);
    return SCHEDULE_DAYS.indexOf(ma?.[1])-SCHEDULE_DAYS.indexOf(mb?.[1])||Number(ma?.[2]||0)-Number(mb?.[2]||0)
  });
  if(scheduleEntryMode==='cell'){
    summary.innerHTML='<div class="schedule-entry-mode-note"><b>الإدخال السريع</b><span>اضغط أي حصة ثم اختر المادة والفصل، وسيتم الحفظ مباشرة.</span></div>'
  }else if(scheduleEntryMode==='single'){
    summary.innerHTML='<div class="schedule-entry-mode-note"><b>التعديل المفصل</b><span>اضغط أي حصة لتعديل الوقت أو إضافة انتظار / احتياط.</span></div>'
  }else if(!c){
    summary.innerHTML='<div class="schedule-entry-mode-note"><b>اختر مادة وفصلًا</b><span>بعد الاختيار ستتمكن من تحديد الحصص من الشبكة.</span></div>'
  }else{
    summary.innerHTML=`<div class="schedule-entry-summary-main"><div><span>المادة</span><b>${escapeHtml(scheduleEntrySubject)}</b></div><div><span>الفصل</span><b>${escapeHtml(c.grade)} · ${escapeHtml(c.name)}</b></div><div><span>الحصص المحددة</span><b>${arabicNum(selected.length)}</b></div></div><div class="schedule-entry-selected-list">${selected.length?selected.map(k=>`<span>${escapeHtml(scheduleEntrySlotLabel(k))}</span>`).join(''):'<em>لم تحدد أي حصة بعد.</em>'}</div>`
  }
  $$('[data-schedule-subject]').forEach(b=>b.onclick=()=>{scheduleEntrySubject=b.dataset.scheduleSubject;scheduleEntryClassId='';scheduleEntryContextKey='';renderSchedule()});
  classSelect.onchange=()=>{scheduleEntryClassId=classSelect.value;scheduleEntryContextKey='';renderSchedule()};
  const saveBtn=$('#scheduleSaveDistributionBtn'),nextBtn=$('#scheduleNextClassBtn'),clearBtn=$('#scheduleClearSelectionBtn');
  if(saveBtn)saveBtn.disabled=scheduleEntryMode!=='distribution'||!c;
  if(nextBtn)nextBtn.disabled=scheduleEntryMode!=='distribution'||classes.length<2||!c;
  if(clearBtn)clearBtn.disabled=scheduleEntryMode!=='distribution'||!c||!scheduleEntrySelected.size
}
function setScheduleEntryMode(mode='cell'){
  if(!['cell','distribution','single'].includes(mode))mode='cell';
  scheduleEntryMode=mode;
  if(mode==='distribution')syncScheduleEntryContext(true);
  renderSchedule()
}
function clearScheduleEntrySelection(){if(scheduleEntryMode!=='distribution')return;scheduleEntrySelected.clear();renderSchedule()}
function handleScheduleCellClick(day,period){
  if(scheduleEntryMode==='cell'){openScheduleCellPicker(day,period);return}
  if(scheduleEntryMode==='single'){openScheduleSlot(day,period);return}
  const c=scheduleEntryClass();if(!c){toast('اختر المادة والفصل أولًا');return}
  if(scheduleEntryConflict(day,period)){
    const slot=scheduleSlot(day,period),label=slot?.kind==='standby'?(slot.note||'انتظار'):`${slot?.className||'حصة'} · ${slot?.subject||''}`;
    toast('الحصة مشغولة بـ '+label);return
  }
  const key=scheduleKey(day,period);
  if(scheduleEntrySelected.has(key))scheduleEntrySelected.delete(key);else scheduleEntrySelected.add(key);
  renderSchedule()
}

function schedulePickerSubject(){
  const subjects=scheduleTeachingSubjects(),stored=state.ui?.scheduleQuickSubject||scheduleEntrySubject||'';
  return subjects.find(x=>scheduleSubjectKey(x)===scheduleSubjectKey(stored))||subjects[0]||''
}
function renderScheduleCellPicker(){
  const dlg=$('#scheduleCellPicker');if(!dlg||!scheduleCellPickerDay||!scheduleCellPickerPeriod)return;
  const t=currentTeacherSchedule(),slot=t?.slots?.[scheduleKey(scheduleCellPickerDay,scheduleCellPickerPeriod)]||null,subjects=scheduleTeachingSubjects();
  const subject=schedulePickerSubject();
  scheduleEntrySubject=subject;
  state.ui ||= {};state.ui.scheduleQuickSubject=subject;
  $('#scheduleCellPickerTitle').textContent=`${scheduleCellPickerDay} — الحصة ${arabicNum(scheduleCellPickerPeriod)}`;
  const current=$('#scheduleCellPickerCurrent');
  if(current)current.textContent=slot?(slot.kind==='standby'?(slot.note||'انتظار / احتياط'):`${slot.className||'فصل'} · ${slot.subject||''}`):'الحصة فارغة';
  const subjectWrap=$('#scheduleCellPickerSubjects'),classWrap=$('#scheduleCellPickerClasses');
  subjectWrap.innerHTML=subjects.length?subjects.map(name=>`<button class="schedule-picker-subject ${scheduleSubjectKey(name)===scheduleSubjectKey(subject)?'active':''}" data-picker-subject="${escapeHtml(name)}">${escapeHtml(name)}</button>`).join(''):'<span class="schedule-picker-empty">لا توجد مواد مسجلة.</span>';
  const classes=scheduleClassesForSubject(subject);
  classWrap.innerHTML=classes.length?classes.map(c=>{
    const active=slot?.kind==='class'&&sameScheduledClass(slot,c);
    return `<button class="schedule-picker-class ${active?'active':''}" data-picker-class="${escapeHtml(c.id)}"><b>${escapeHtml(c.name)}</b><small>${escapeHtml(c.grade||'')}</small>${active?'<span>الحصة الحالية</span>':''}</button>`
  }).join(''):'<span class="schedule-picker-empty">لا توجد فصول مرتبطة بهذه المادة.</span>';
  $$('[data-picker-subject]').forEach(b=>b.onclick=()=>{scheduleEntrySubject=b.dataset.pickerSubject;state.ui.scheduleQuickSubject=scheduleEntrySubject;queueSave();renderScheduleCellPicker()});
  $$('[data-picker-class]').forEach(b=>b.onclick=()=>assignScheduleCellClass(b.dataset.pickerClass));
  const clear=$('#scheduleCellPickerClear');if(clear)clear.hidden=!slot;
}
function openScheduleCellPicker(day,period){
  scheduleCellPickerDay=day;scheduleCellPickerPeriod=period;
  const slot=scheduleSlot(day,period),subjects=scheduleTeachingSubjects();
  if(slot?.kind==='class'&&slot.subject){
    const found=subjects.find(x=>scheduleSubjectKey(x)===scheduleSubjectKey(slot.subject));
    if(found){scheduleEntrySubject=found;state.ui.scheduleQuickSubject=found}
  }else scheduleEntrySubject=schedulePickerSubject();
  renderScheduleCellPicker();
  const sheet=$('#scheduleCellPicker');if(!sheet)return;
  sheet.hidden=false;document.body.classList.add('schedule-picker-open');
  requestAnimationFrame(()=>sheet.classList.add('visible'))
}
function closeScheduleCellPicker(){
  const sheet=$('#scheduleCellPicker');if(!sheet)return;
  sheet.classList.remove('visible');document.body.classList.remove('schedule-picker-open');
  setTimeout(()=>{if(!sheet.classList.contains('visible'))sheet.hidden=true},160)
}
function assignScheduleCellClass(classId){
  const t=currentTeacherSchedule(),c=findClass(classId);if(!t||!c||!scheduleCellPickerDay||!scheduleCellPickerPeriod)return;
  const key=scheduleKey(scheduleCellPickerDay,scheduleCellPickerPeriod),pt=PERIOD_TIMES[scheduleCellPickerPeriod]||['',''];
  t.slots[key]={kind:'class',classId:c.id,className:classScheduleCode(c)||c.name,subject:c.subject||scheduleEntrySubject||'',start:pt[0]||'',end:pt[1]||''};
  scheduleEntrySubject=c.subject||scheduleEntrySubject;state.ui.scheduleQuickSubject=scheduleEntrySubject;
  closeScheduleCellPicker();renderSchedule();renderReports();queueSave();toast(`تم تعيين ${c.name} — ${scheduleCellPickerDay} ح${arabicNum(scheduleCellPickerPeriod)}`)
}
function clearScheduleCell(){
  const t=currentTeacherSchedule();if(!t||!scheduleCellPickerDay||!scheduleCellPickerPeriod)return;
  delete t.slots[scheduleKey(scheduleCellPickerDay,scheduleCellPickerPeriod)];
  closeScheduleCellPicker();renderSchedule();renderReports();queueSave();toast('تم تفريغ الحصة')
}
function openScheduleCellDetails(kind=''){
  const day=scheduleCellPickerDay,period=scheduleCellPickerPeriod;closeScheduleCellPicker();openScheduleSlot(day,period);
  if(kind==='standby'){$('#scheduleSlotKind').value='standby';if(!$('#scheduleSlotNote').value)$('#scheduleSlotNote').value='انتظار'}
}

function saveScheduleDistribution(){
  if(scheduleEntryMode!=='distribution')return;
  const t=currentTeacherSchedule(),c=scheduleEntryClass();if(!t||!c)return;
  const selected=[...scheduleEntrySelected];
  const conflicts=selected.filter(key=>{
    const slot=t.slots?.[key];return slot&&!sameScheduledClass(slot,c)
  });
  if(conflicts.length){toast('يوجد تعارض في '+arabicNum(conflicts.length)+' حصة؛ أزلها أولًا');return}
  for(const key of scheduleOwnSlotKeys(t,c))delete t.slots[key];
  for(const key of selected){
    const m=key.match(/^(.*)-(\d+)$/);if(!m)continue;
    t.slots[key]={kind:'class',classId:c.id,className:classScheduleCode(c)||c.name,subject:scheduleEntrySubject||c.subject||'',start:PERIOD_TIMES[Number(m[2])]?.[0]||'',end:PERIOD_TIMES[Number(m[2])]?.[1]||''}
  }
  scheduleEntryContextKey='';syncScheduleEntryContext(true);renderSchedule();renderReports();queueSave();
  toast('تم حفظ '+arabicNum(selected.length)+' حصة لـ '+c.name)
}
function nextScheduleEntryClass(){
  const classes=scheduleClassesForSubject(scheduleEntrySubject),i=classes.findIndex(c=>c.id===scheduleEntryClassId);
  if(classes.length<2||i<0)return;
  scheduleEntryClassId=classes[(i+1)%classes.length].id;scheduleEntryContextKey='';renderSchedule()
}
function scheduleCounts(t=currentTeacherSchedule()){const slots=Object.values(t?.slots||{}),teaching=slots.filter(x=>x.kind==='class'),classes=new Set(teaching.map(x=>x.className).filter(Boolean));return {teaching:teaching.length,classes:classes.size}}
function scheduleCellMarkup(day,period,mobile=false){
  const slot=scheduleSlot(day,period),time=PERIOD_TIMES[period]||['',''],key=scheduleKey(day,period),distribution=scheduleEntryMode==='distribution',selected=distribution&&scheduleEntrySelected.has(key),conflict=distribution&&scheduleEntryConflict(day,period),entryClass=selected?' entry-selected':(conflict?' entry-conflict':'');
  if(!slot)return `<button class="schedule-cell empty${entryClass}" data-schedule-slot="${escapeHtml(day)}|${period}" aria-pressed="${selected?'true':'false'}"><span class="period-mobile-label">الحصة ${arabicNum(period)}</span><small>${scheduleTimeLabel(time[0],time[1])}</small><em>${selected?'✓':'＋'}</em></button>`;
  if(slot.kind==='standby')return `<button class="schedule-cell standby${entryClass}" data-schedule-slot="${escapeHtml(day)}|${period}"><span class="period-mobile-label">الحصة ${arabicNum(period)}</span><b>${escapeHtml(slot.note||'انتظار')}</b><small>${scheduleTimeLabel(slot.start,slot.end)}</small></button>`;
  const color=scheduleClassColor(slot.className);
  return `<button class="schedule-cell class-session${entryClass}" style="--session-color:${color}" data-schedule-slot="${escapeHtml(day)}|${period}" aria-pressed="${selected?'true':'false'}"><span class="period-mobile-label">الحصة ${arabicNum(period)}</span><b>${escapeHtml(slot.className||'فصل')}</b><span>${escapeHtml(slot.subject||'')}</span><small>${scheduleTimeLabel(slot.start,slot.end)}</small>${selected?'<em class="schedule-entry-check">✓</em>':''}</button>`
}
function scheduleStateInfo(t){
  if(!t)return {label:'غير محدد',kind:'muted'};
  if(t.archived)return {label:'مؤرشف',kind:'archived'};
  if(t.id===state.activeScheduleId)return {label:'نشط',kind:'active'};
  const today=localDateISO();
  if(t.startDate&&today<t.startDate)return {label:'مجدول للمستقبل',kind:'future'};
  if(t.endDate&&today>t.endDate)return {label:'منتهي',kind:'ended'};
  if((!t.startDate||today>=t.startDate)&&(!t.endDate||today<=t.endDate))return {label:'ساري اليوم',kind:'current'};
  return {label:'محفوظ',kind:'muted'}
}
function renderScheduleLibrary(){
  const tabs=$('#scheduleTabs'),status=$('#scheduleStatus'),t=currentTeacherSchedule();if(!tabs||!status||!t)return;
  const list=state.teacherSchedules||[];
  tabs.hidden=list.length<=1;
  tabs.innerHTML=list.length>1?list.map(x=>{const st=scheduleStateInfo(x);return `<button class="schedule-tab ${x.id===t.id?'selected':''} ${st.kind}" data-schedule-select="${escapeHtml(x.id)}"><span>${escapeHtml(x.title||'جدول')}</span><small>${escapeHtml(st.label)}</small></button>`}).join(''):'';
  const overlap=schedulesOverlappingRange(t.startDate,t.endDate).filter(x=>x.id!==t.id);
  const st=scheduleStateInfo(t),range=`${t.startDate?formatDate(t.startDate):'بداية مفتوحة'} — ${t.endDate?formatDate(t.endDate):'نهاية مفتوحة'}`;
  status.innerHTML=`<div class="schedule-current-main"><div class="schedule-current-title"><b>${escapeHtml(t.title||'جدول')}</b><span class="schedule-state-badge ${st.kind}">${escapeHtml(st.label)}</span></div><small>${escapeHtml(t.semester||'')} · ${escapeHtml(range)}</small></div>${overlap.length?`<p class="schedule-overlap-note">يوجد تداخل في فترة السريان مع ${arabicNum(overlap.length)} جدول. عند التاريخ المتداخل يستخدم النظام الجدول ذو بداية السريان الأحدث.</p>`:''}`;
  $$('[data-schedule-select]').forEach(b=>b.onclick=()=>selectTeacherSchedule(b.dataset.scheduleSelect));
  const activate=$('#activateScheduleBtn'),archive=$('#archiveScheduleBtn'),del=$('#deleteScheduleBtn');
  if(activate){activate.disabled=t.id===state.activeScheduleId;activate.textContent=t.id===state.activeScheduleId?'✓ الجدول النشط':'✓ تعيين نشط'}
  if(archive){archive.textContent=t.archived?'إلغاء الأرشفة':'أرشفة';archive.disabled=!t.archived&&t.id===state.activeScheduleId&&list.filter(x=>!x.archived&&x.id!==t.id).length===0}
  if(del){
    del.disabled=t.id===state.activeScheduleId||list.length<=1;
    del.title=t.id===state.activeScheduleId?'لا يمكن حذف الجدول النشط':(list.length<=1?'لا يمكن حذف آخر جدول':'حذف الجدول نهائيًا')
  }
}
function selectTeacherSchedule(id){if(!(state.teacherSchedules||[]).some(x=>x.id===id))return;state.ui.scheduleId=id;editingScheduleSlot=null;editingSupervisionId=null;scheduleEntryContextKey='';scheduleEntrySelected=new Set();renderSchedule();queueSave()}
function setActiveTeacherSchedule(){const t=currentTeacherSchedule();if(!t)return;t.archived=false;state.activeScheduleId=t.id;state.appMeta.semester=t.semester||state.appMeta.semester;state.appMeta.teacher=t.teacherName||state.appMeta.teacher;state.appMeta.school=t.school||state.appMeta.school;renderAll();queueSave();toast('تم تعيين الجدول النشط')}
function toggleArchiveTeacherSchedule(){
  const t=currentTeacherSchedule();if(!t)return;
  if(!t.archived&&t.id===state.activeScheduleId){
    const replacement=(state.teacherSchedules||[]).find(x=>x.id!==t.id&&!x.archived);
    if(!replacement){toast('لا يمكن أرشفة الجدول النشط الوحيد');return}
    state.activeScheduleId=replacement.id
  }
  t.archived=!t.archived;renderSchedule();renderReports();queueSave();toast(t.archived?'تمت أرشفة الجدول':'تم إلغاء أرشفة الجدول')
}
function scheduleAttendanceUsageDates(t){
  if(!t)return[];
  const today=localDateISO(),dates=new Set();
  for(const c of state.classes||[])for(const st of c.students||[])for(const date of Object.keys(st.attendance||{})){
    if(date>today)continue;
    if(t.startDate&&date<t.startDate)continue;
    if(t.endDate&&date>t.endDate)continue;
    if(scheduleForDate(date)?.id===t.id)dates.add(date)
  }
  return [...dates].sort()
}
function deleteTeacherSchedule(){
  const t=currentTeacherSchedule(),list=state.teacherSchedules||[];if(!t)return;
  if(list.length<=1){toast('لا يمكن حذف آخر جدول');return}
  if(t.id===state.activeScheduleId){toast('عيّن جدولًا آخر نشطًا قبل حذف هذا الجدول');return}
  const usedDates=scheduleAttendanceUsageDates(t),name=t.title||'الجدول';
  const message=usedDates.length
    ? `الجدول «${name}» مرتبط بفترة تحتوي على حضور مسجل في ${arabicNum(usedDates.length)} يوم. حذف الجدول لن يحذف سجلات الحضور، لكنه قد يغيّر تخطيط تقارير الحضور السابقة. يُفضّل أرشفته بدل الحذف. هل تريد الحذف النهائي رغم ذلك؟`
    : `حذف الجدول «${name}» نهائيًا؟ سيتم حذف حصصه ومناوباته فقط، ولن تُحذف بيانات الطلاب أو التقييمات أو سجلات الحضور.`;
  if(!confirm(message))return;
  state.teacherSchedules=list.filter(x=>x.id!==t.id);
  const fallback=(state.teacherSchedules||[]).find(x=>x.id===state.activeScheduleId)||state.teacherSchedules[0];
  state.ui.scheduleId=fallback?.id||null;
  editingScheduleSlot=null;editingSupervisionId=null;scheduleEntryContextKey='';scheduleEntrySelected=new Set();
  try{closeScheduleCellPicker()}catch{}
  renderSchedule();renderReports();queueSave();toast('تم حذف الجدول')
}
function scheduleCreateModeChanged(){
  const mode=$('#newScheduleMode')?.value||'blank',field=$('#newScheduleSourceField'),note=$('#scheduleCreateNote');
  if(field)field.hidden=mode!=='copy';
  if(note)note.textContent=mode==='copy'?'سيتم نسخ الحصص والمناوبات فقط، مع إنشاء سجل مستقل للجدول الجديد.':'سيبدأ الجدول فارغًا ويمكنك إضافة الحصص بعد إنشائه.'
}
function openScheduleCreateModal(copyCurrent=false){
  const current=currentTeacherSchedule(),semester=current?.semester||state.appMeta.semester||'الفصل الدراسي الأول',cfg=scheduleTermConfig(semester),today=localDateISO();
  $('#scheduleCreateTitle').textContent=copyCurrent?'نسخ الجدول':'إضافة جدول';
  $('#newScheduleTitle').value=copyCurrent?`${current?.title||'جدول'} — نسخة`:'جدول جديد';
  $('#newScheduleSemester').value=semester;
  $('#newScheduleStart').value=(today>=cfg.start&&today<=cfg.end)?today:cfg.start;
  $('#newScheduleEnd').value=cfg.end;
  $('#newScheduleMode').value=copyCurrent?'copy':'blank';
  $('#newScheduleSource').innerHTML=(state.teacherSchedules||[]).map(x=>`<option value="${escapeHtml(x.id)}" ${x.id===current?.id?'selected':''}>${escapeHtml(x.title||'جدول')}</option>`).join('');
  scheduleCreateModeChanged();$('#scheduleCreateModal').showModal();setTimeout(()=>$('#newScheduleTitle').focus(),50)
}
function saveNewTeacherSchedule(){
  const title=$('#newScheduleTitle').value.trim(),semester=$('#newScheduleSemester').value,startDate=$('#newScheduleStart').value,endDate=$('#newScheduleEnd').value,mode=$('#newScheduleMode').value;
  if(!title){toast('اكتب اسم الجدول');return}
  if(startDate&&endDate&&endDate<startDate){toast('نهاية السريان يجب أن تكون بعد البداية');return}
  let base={};
  if(mode==='copy'){
    const source=(state.teacherSchedules||[]).find(x=>x.id===$('#newScheduleSource').value);
    if(source)base={teacherName:source.teacherName,school:source.school,slots:clone(source.slots||{}),supervision:(source.supervision||[]).map(x=>({...clone(x),id:uid()}))}
  }
  const t=ensureTeacherSchedule({id:uid(),title,semester,startDate,endDate,archived:false,teacherName:base.teacherName||state.appMeta.teacher,school:base.school||state.appMeta.school,slots:base.slots||{},supervision:base.supervision||[]},state.appMeta);
  state.teacherSchedules.push(t);state.ui.scheduleId=t.id;
  $('#scheduleCreateModal').close();renderSchedule();queueSave();toast(mode==='copy'?'تم إنشاء نسخة مستقلة من الجدول':'تم إنشاء الجدول')
}
function updateSelectedScheduleMeta(field,value){
  const t=currentTeacherSchedule();if(!t)return;
  if((field==='startDate'||field==='endDate')){
    const start=field==='startDate'?value:t.startDate,end=field==='endDate'?value:t.endDate;
    if(start&&end&&end<start){toast('نهاية السريان يجب أن تكون بعد البداية');renderSchedule();return}
  }
  t[field]=value;
  if(field==='teacherName')state.appMeta.teacher=value;
  if(field==='school')state.appMeta.school=value;
  if(field==='semester'&&t.id===state.activeScheduleId)state.appMeta.semester=value;
  renderScheduleHeader();renderScheduleLibrary();renderReports();queueSave()
}
function syncScheduleFolds(){
  state.ui ||= {};
  state.ui.scheduleFolds ||= {};
  const mobile=window.matchMedia('(max-width:680px)').matches;
  $$('[data-schedule-fold]').forEach(el=>{
    const key=el.dataset.scheduleFold;
    const saved=state.ui.scheduleFolds[key];
    const desired=mobile?(typeof saved==='boolean'?saved:false):true;
    if(el.open!==desired)el.open=desired;
    if(!el.dataset.foldBound){
      el.dataset.foldBound='1';
      el.addEventListener('toggle',()=>{
        if(!window.matchMedia('(max-width:680px)').matches)return;
        state.ui.scheduleFolds ||= {};
        state.ui.scheduleFolds[key]=el.open;
        queueSave()
      })
    }
  })
}
function renderSchedule(){
  const t=currentTeacherSchedule(),counts=scheduleCounts(t);if(!t)return;
  const settingsSelect=$('#scheduleSettingsSelect'),title=$('#scheduleTitleInput'),semester=$('#scheduleSemesterInput'),start=$('#scheduleStartInput'),end=$('#scheduleEndInput'),settingsState=$('#scheduleSettingsState');
  syncScheduleEntryContext();
  renderScheduleLibrary();
  if(settingsSelect){
    settingsSelect.innerHTML=(state.teacherSchedules||[]).map(x=>`<option value="${escapeHtml(x.id)}" ${x.id===t.id?'selected':''}>${escapeHtml(x.title||'جدول')} — ${escapeHtml(scheduleStateInfo(x).label)}</option>`).join('');
    settingsSelect.onchange=()=>selectTeacherSchedule(settingsSelect.value)
  }
  if(title&&document.activeElement!==title)title.value=t.title||'';
  if(semester&&document.activeElement!==semester)semester.value=t.semester||state.appMeta.semester||'الفصل الدراسي الأول';
  if(start&&document.activeElement!==start)start.value=t.startDate||'';
  if(end&&document.activeElement!==end)end.value=t.endDate||'';
  if(title)title.oninput=()=>updateSelectedScheduleMeta('title',title.value);
  if(semester)semester.onchange=()=>updateSelectedScheduleMeta('semester',semester.value);
  if(start)start.onchange=()=>updateSelectedScheduleMeta('startDate',start.value);
  if(end)end.onchange=()=>updateSelectedScheduleMeta('endDate',end.value);
  if(settingsState){const st=scheduleStateInfo(t);settingsState.innerHTML=`<span class="schedule-state-badge ${st.kind}">${escapeHtml(st.label)}</span><small>${t.startDate?formatDate(t.startDate):'بداية مفتوحة'} — ${t.endDate?formatDate(t.endDate):'نهاية مفتوحة'}</small>`}
  const profileTeacher=String(state.appMeta?.teacher||t.teacherName||'').trim();
  const profileSchool=String(state.appMeta?.school||t.school||'').trim();
  if($('#scheduleLibraryFoldMeta'))$('#scheduleLibraryFoldMeta').textContent=`${t.title||'جدول المعلم'} · ${scheduleStateInfo(t).label}`;
  if($('#scheduleProfileFoldMeta'))$('#scheduleProfileFoldMeta').textContent=[profileTeacher,profileSchool].filter(Boolean).join(' · ')||'المعلم والمدرسة وفترة السريان';
  if($('#scheduleEntryFoldMeta'))$('#scheduleEntryFoldMeta').textContent=scheduleEntryMode==='distribution'?'وضع التوزيع الجماعي':scheduleEntryMode==='single'?'التعديل المفصل / الانتظار':'الإدخال السريع مفعّل';
  if($('#scheduleProfileTitle'))$('#scheduleProfileTitle').textContent=t.title||'جدول المعلم';
  if($('#scheduleProfileTeacher'))$('#scheduleProfileTeacher').textContent=profileTeacher||'غير محدد';
  if($('#scheduleProfileSchool'))$('#scheduleProfileSchool').textContent=profileSchool||'غير محددة';
  if($('#scheduleProfileSemester'))$('#scheduleProfileSemester').textContent=t.semester||state.appMeta.semester||'غير محدد';
  if($('#scheduleProfileValidity'))$('#scheduleProfileValidity').textContent=`${t.startDate?formatDate(t.startDate):'بداية مفتوحة'} — ${t.endDate?formatDate(t.endDate):'نهاية مفتوحة'}`;
  $('#scheduleStats').innerHTML=`<div><b>${arabicNum(counts.teaching)}</b><span>عدد الحصص</span></div><div><b>${arabicNum(counts.classes)}</b><span>عدد الفصول</span></div>`;
  $('#teacherScheduleTable').innerHTML=`<thead><tr><th>اليوم / الحصة</th>${[1,2,3,4,5,6,7].map(p=>`<th><b>${arabicNum(p)}</b><small>${scheduleTimeLabel(...PERIOD_TIMES[p])}</small></th>`).join('')}</tr></thead><tbody>${SCHEDULE_DAYS.map(day=>`<tr><th>${day}</th>${[1,2,3,4,5,6,7].map(p=>`<td>${scheduleCellMarkup(day,p)}</td>`).join('')}</tr>`).join('')}</tbody>`;
  const selectedMobileDay=SCHEDULE_DAYS.includes(state.ui?.scheduleDay)?state.ui.scheduleDay:SCHEDULE_DAYS[0];
  const dayNav=$('#scheduleDayNav');
  if(dayNav){
    dayNav.innerHTML=SCHEDULE_DAYS.map(day=>`<button type="button" class="schedule-day-tab ${day===selectedMobileDay?'active':''}" data-schedule-day="${day}" aria-pressed="${day===selectedMobileDay?'true':'false'}">${day}</button>`).join('');
    $$('[data-schedule-day]').forEach(b=>b.onclick=()=>{state.ui.scheduleDay=b.dataset.scheduleDay;renderSchedule();queueSave()});
  }
  $('#scheduleMobile').innerHTML=`<article class="schedule-day-card" data-mobile-day="${selectedMobileDay}"><h3>${selectedMobileDay}</h3><div>${[1,2,3,4,5,6,7].map(p=>scheduleCellMarkup(selectedMobileDay,p,true)).join('')}</div></article>`;
  syncScheduleFolds();
  renderScheduleHeader();renderSupervisions();renderScheduleEntryControls();$$('[data-schedule-slot]').forEach(b=>b.onclick=()=>{const [day,p]=b.dataset.scheduleSlot.split('|');handleScheduleCellClick(day,Number(p))})
}
function renderScheduleHeader(){const t=currentTeacherSchedule();if(!t||!$('#schedulePrintHeader'))return;$('#schedulePrintHeader').innerHTML=`<div><b>المملكة العربية السعودية</b><span>وزارة التعليم</span><span>${escapeHtml(state.appMeta.school||t.school||'')}</span></div><div class="schedule-logo-center"><img class="schedule-official-logo" src="./assets/moe-logo.png" alt="شعار وزارة التعليم"><h1>${escapeHtml(t.title||'جدول المعلم')}</h1><b>${escapeHtml(state.appMeta.teacher||t.teacherName||'')}</b></div><div><b>جدول المعلم</b><span>${escapeHtml(state.appMeta.year||'')}</span><span>${escapeHtml(t.semester||state.appMeta.semester||'')}</span></div>`}
function openScheduleSlot(day,period){const t=currentTeacherSchedule();if(!t)return;editingScheduleSlot={day,period};const raw=t.slots?.[scheduleKey(day,period)]||{},pt=PERIOD_TIMES[period]||['',''];$('#scheduleSlotTitle').textContent=`${day} — الحصة ${arabicNum(period)}`;$('#scheduleSlotKind').value=raw.kind||'empty';$('#scheduleSlotClass').value=raw.className||'';$('#scheduleSlotSubject').value=raw.subject||'';$('#scheduleSlotStart').value=raw.start||pt[0]||'';$('#scheduleSlotEnd').value=raw.end||pt[1]||'';$('#scheduleSlotNote').value=raw.note||'';$('#scheduleSlotModal').showModal()}
function saveScheduleSlot(){const t=currentTeacherSchedule();if(!editingScheduleSlot||!t)return;const {day,period}=editingScheduleSlot,key=scheduleKey(day,period),kind=$('#scheduleSlotKind').value;if(kind==='empty')delete t.slots[key];else t.slots[key]={kind,className:$('#scheduleSlotClass').value.trim(),subject:$('#scheduleSlotSubject').value.trim(),start:$('#scheduleSlotStart').value,end:$('#scheduleSlotEnd').value,note:$('#scheduleSlotNote').value.trim()};$('#scheduleSlotModal').close();renderSchedule();renderReports();queueSave();toast('تم تحديث الجدول')}
function renderSupervisions(){const list=$('#supervisionList'),t=currentTeacherSchedule();if(!list||!t)return;const items=t.supervision||[];list.innerHTML=items.length?items.map(x=>`<article class="supervision-card"><div><b>${escapeHtml(x.day||'')} ${x.date?`<span class="supervision-date">(${escapeHtml(x.date)})</span>`:''}</b><span>${escapeHtml(x.start||'')} - ${escapeHtml(x.end||'')}</span></div><div class="supervision-main"><strong>👁️ ${escapeHtml(x.title||'إشراف')}</strong><span>${escapeHtml(x.type||'إشراف')} — ${escapeHtml(x.location||'')}</span></div><button class="btn tiny no-print" data-edit-supervision="${x.id}">تعديل</button></article>`).join(''):`<div class="empty-state"><b>لا توجد مناوبات مسجلة</b>أضف مناوبة أو إشرافًا جديدًا.</div>`;$$('[data-edit-supervision]').forEach(b=>b.onclick=()=>openSupervision(b.dataset.editSupervision))}
function openSupervision(id=null){const t=currentTeacherSchedule();if(!t)return;editingSupervisionId=id;const x=id?(t.supervision||[]).find(v=>v.id===id):null;$('#supervisionModalTitle').textContent=x?'تعديل المناوبة':'إضافة مناوبة';$('#supervisionDay').value=x?.day||'الأحد';$('#supervisionDate').value=x?.date||'';$('#supervisionStart').value=x?.start||'';$('#supervisionEnd').value=x?.end||'';$('#supervisionType').value=x?.type||'إشراف';$('#supervisionTitle').value=x?.title||'';$('#supervisionLocation').value=x?.location||'';$('#deleteSupervisionBtn').hidden=!x;$('#supervisionModal').showModal()}
function saveSupervision(){const t=currentTeacherSchedule();if(!t)return;const obj={day:$('#supervisionDay').value,date:$('#supervisionDate').value.trim(),start:$('#supervisionStart').value,end:$('#supervisionEnd').value,type:$('#supervisionType').value.trim(),title:$('#supervisionTitle').value.trim()||'إشراف',location:$('#supervisionLocation').value.trim()};if(editingSupervisionId){const x=t.supervision.find(v=>v.id===editingSupervisionId);if(x)Object.assign(x,obj)}else t.supervision.push({id:uid(),...obj});$('#supervisionModal').close();renderSchedule();queueSave();toast('تم حفظ المناوبة')}
function deleteSupervision(){const t=currentTeacherSchedule();if(!editingSupervisionId||!t)return;if(!confirm('حذف هذه المناوبة؟'))return;t.supervision=t.supervision.filter(v=>v.id!==editingSupervisionId);$('#supervisionModal').close();renderSchedule();queueSave();toast('تم حذف المناوبة')}
function printTeacherSchedule(){runPrintSession('print-teacher-schedule','landscape')}

function renderAttendance(){
  const c=currentClass();if(!c)return;
  const date=$('#attendanceDate').value||localDateISO();
  $('#attendanceHeading').textContent=`تسجيل الحضور — ${c.name}`;
  const a=classAttendanceForDate(c,date);
  $('#attendanceStats').innerHTML=`<div class="stat ok"><b>${arabicNum(a.present)}</b><span>حاضر</span></div><div class="stat bad"><b>${arabicNum(a.absent)}</b><span>غائب</span></div><div class="stat late"><b>${arabicNum(a.late)}</b><span>متأخر</span></div><div class="stat excused"><b>${arabicNum(a.excused)}</b><span>مستأذن</span></div>`;
  $('#attendanceList').innerHTML=c.students.length?c.students.map((st,i)=>{const cur=st.attendance?.[date]||'';return `<div class="attendance-row"><div class="index">${arabicNum(i+1)}</div><div class="student-name">${escapeHtml(st.name)}</div><div class="status-options">${[['present','حاضر'],['absent','غائب'],['late','متأخر'],['excused','مستأذن']].map(([v,l])=>`<button class="status-btn ${cur===v?'active':''}" data-attendance="${st.id}" data-status="${v}">${l}</button>`).join('')}</div></div>`}).join(''):`<div class="empty-state"><b>لا يوجد طلاب</b>أضف طلابًا من شاشة التقييمات أولًا.</div>`;
  $$('[data-attendance]').forEach(b=>b.onclick=()=>{const st=findStudent(b.dataset.attendance),d=$('#attendanceDate').value||localDateISO();ensureStudent(st);if(st.attendance[d]===b.dataset.status)delete st.attendance[d];else st.attendance[d]=b.dataset.status;renderAttendance();renderDashboard();renderReports();queueSave()});
}
function markAllAttendance(status){const c=currentClass(),date=$('#attendanceDate').value||localDateISO();c.students.forEach(s=>{ensureStudent(s);if(!s.attendance[date])s.attendance[date]=status});renderAttendance();renderDashboard();renderReports();queueSave();toast('تم تحديد غير المسجلين حاضر')}
function clearAttendanceDay(){const c=currentClass(),date=$('#attendanceDate').value||localDateISO();if(!confirm('مسح حالات الحضور المسجلة لهذا اليوم؟'))return;c.students.forEach(s=>delete s.attendance?.[date]);renderAttendance();renderDashboard();renderReports();queueSave()}

function attendanceMonthsForClass(c){
  const set=new Set();
  plannedAttendanceSessions(c,'all').forEach(x=>set.add(monthKey(x.date)));
  (c?.students||[]).forEach(st=>Object.keys(st.attendance||{}).forEach(d=>{const m=monthKey(d);if(m)set.add(m)}));
  return [...set].filter(Boolean).sort().reverse();
}
function attendanceDatesForPeriod(c,period='all'){const set=new Set();(c?.students||[]).forEach(st=>Object.keys(st.attendance||{}).forEach(d=>{if(period==='all'||monthKey(d)===period)set.add(d)}));return [...set].sort()}
function attendanceMark(v){return ({present:'ح',absent:'غ',late:'ت',excused:'إ'})[v]||'—'}
function rosterTermKey(){return /الثاني/.test(state.appMeta?.semester||'')?'2':'1'}
function parseISODateNoon(iso){const [y,m,d]=String(iso).split('-').map(Number);return new Date(y,m-1,d,12,0,0)}
function isoFromDateLocal(d){return localDateISO(d)}
function inRange(iso,start,end){return iso>=start&&iso<=end}
function schoolHoliday(iso){return ROSTER_HOLIDAYS.some(([a,b])=>inRange(iso,a,b))}
function examWeekRange(term){
  const cfg=ROSTER_ACADEMIC_TERMS[term];if(!cfg)return null;
  const end=parseISODateNoon(cfg.end),day=end.getDay(),back=(day+7)%7;
  const sunday=new Date(end);sunday.setDate(end.getDate()-back);
  return {start:isoFromDateLocal(sunday),end:cfg.end};
}
function classSectionLetter(c){
  const raw=String(c?.name||'').trim();
  const letter=(raw.match(/[أبجد]/)||[])[0];if(letter)return letter;
  const n=Number(latinDigits(raw).match(/\d+/)?.[0]||0);return ({1:'أ',2:'ب',3:'ج',4:'د'})[n]||'';
}
function classGradeNumber(c){const g=String(c?.grade||'');if(/الأول|اول/.test(g))return 1;if(/الثاني|ثاني/.test(g))return 2;if(/الثالث|ثالث/.test(g))return 3;return 0}
function classScheduleCode(c){const g=classGradeNumber(c),sec=classSectionLetter(c);return g&&sec?`${g}م ${sec}`:''}
function normalizeScheduleCode(v=''){return String(v).replace(/\s+/g,'').replace(/[إآ]/g,'أ')}
function scheduledSlotsForClass(c,t=activeTeacherSchedule()){
  const target=normalizeScheduleCode(classScheduleCode(c)),out=[];
  Object.entries(t?.slots||{}).forEach(([key,v])=>{
    if(v?.kind!=='class'||normalizeScheduleCode(v.className)!==target)return;
    const m=key.match(/^(.*)-(\d+)$/);if(m)out.push({day:m[1],period:Number(m[2])})
  });
  return out.sort((a,b)=>SCHEDULE_DAYS.indexOf(a.day)-SCHEDULE_DAYS.indexOf(b.day)||a.period-b.period);
}
function storedAttendanceDatesForPeriod(c,period='all'){
  const term=rosterTermKey(),cfg=ROSTER_ACADEMIC_TERMS[term];
  return attendanceDatesForPeriod(c,period).filter(date=>{
    if(period!=='all'||!cfg)return true;
    return inRange(date,cfg.start,cfg.end)
  })
}
function plannedAttendanceSessions(c,period='all'){
  const term=rosterTermKey(),cfg=ROSTER_ACADEMIC_TERMS[term];if(!cfg)return[];
  const exam=state.settings.excludeExamWeek!==false?examWeekRange(term):null,out=[];
  let d=parseISODateNoon(cfg.start),end=parseISODateNoon(cfg.end);
  while(d<=end){
    const iso=isoFromDateLocal(d),day=AR_DAY_BY_JS[d.getDay()],schedule=scheduleForDate(iso),slots=scheduledSlotsForClass(c,schedule);
    if(slots.length&&!schoolHoliday(iso)&&!(exam&&inRange(iso,exam.start,exam.end))){
      slots.filter(x=>x.day===day).forEach(x=>out.push({date:iso,day,period:x.period,planned:true,historical:false,scheduleId:schedule?.id||null}));
    }
    d.setDate(d.getDate()+1);
  }
  const merged=(period==='all'?out:out.filter(x=>monthKey(x.date)===period)).slice();
  const plannedDates=new Set(merged.map(x=>x.date));
  storedAttendanceDatesForPeriod(c,period).forEach(date=>{
    if(plannedDates.has(date))return;
    merged.push({date,day:AR_DAY_BY_JS[parseISODateNoon(date).getDay()],period:null,planned:false,historical:true,scheduleId:scheduleForDate(date)?.id||null})
  });
  merged.sort((a,b)=>a.date.localeCompare(b.date)||(Number(a.period)||99)-(Number(b.period)||99));
  return merged
}
function plannedAttendanceMeta(c,sessions,period='all'){
  const term=rosterTermKey(),cfg=ROSTER_ACADEMIC_TERMS[term],exclude=state.settings.excludeExamWeek!==false;
  const applicable=schedulesOverlappingRange(cfg?.start||'',cfg?.end||''),weekly=Math.max(0,...applicable.map(t=>scheduledSlotsForClass(c,t).length),Number(c.weeklySessions||1));
  const plannedSessions=sessions.filter(x=>x.planned).length,historicalSessions=sessions.filter(x=>x.historical).length;
  return {term,cfg,weekly,teachingWeeks:Math.max(0,(cfg?.plannedWeeks||0)-(exclude?1:0)),sessions:sessions.length,plannedSessions,historicalSessions,period};
}
function attendanceCountsForSessions(st,sessions){
  const out={present:0,absent:0,late:0,excused:0,total:0};
  sessions.forEach(x=>{const v=st.attendance?.[x.date];if(out[v]!==undefined){out[v]++;out.total++}});
  return out;
}
function compactClassOfficialHeader(title,c,periodText){
  const m=state.appMeta||{},school=m.school||'اسم المدرسة',region=m.region||'إدارة التعليم';
  return `<header class="compact-class-header" dir="rtl"><div class="compact-class-gov"><b>المملكة العربية السعودية</b><span>وزارة التعليم</span><span>${escapeHtml(region)}</span><span>${escapeHtml(school)}</span></div><div class="compact-class-logo"><img src="./assets/moe-logo.png" alt="شعار وزارة التعليم"></div><div class="compact-class-title"><h1>${escapeHtml(title)}</h1><span>${escapeHtml(periodText||m.semester||'')}</span><small>${escapeHtml(m.year||'')}</small></div></header><div class="compact-class-meta" dir="rtl"><span><b>الصف:</b> ${escapeHtml(c.grade||'—')}</span><span><b>الفصل:</b> ${escapeHtml(c.name||'—')}</span><span><b>المادة:</b> ${escapeHtml(c.subject||'—')}</span></div>`;
}
function attendanceRegisterSheet(c,period='all'){
  const sessions=plannedAttendanceSessions(c,period),meta=plannedAttendanceMeta(c,sessions,period),periodText=period==='all'?state.appMeta.semester:monthLabel(period);
  if(!sessions.length)return `<div class="attendance-official-print"><section class="attendance-print-page">${compactClassOfficialHeader('سجل متابعة الحضور والغياب',c,periodText)}<div class="attendance-empty-print">لا توجد حصص مخططة أو بيانات حضور في هذه الفترة.</div>${officialReportSignatures()}</section></div>`;
  const heads=sessions.map((x,j)=>`<th class="att-session ${x.historical?'att-session-history':''}" title="${x.historical?'سجل سابق محفوظ':''}"><b>ح${arabicNum(j+1)}${x.historical?'*':''}</b><small>${arabicNum(Number(x.date.slice(8)))}/${arabicNum(Number(x.date.slice(5,7)))}</small></th>`).join('');
  const rows=(c.students||[]).map((st,i)=>{const all=attendanceCountsForSessions(st,sessions),cells=sessions.map(x=>`<td class="att-session att-${escapeHtml(st.attendance?.[x.date]||'none')}">${attendanceMark(st.attendance?.[x.date])}</td>`).join('');return `<tr><td class="att-num">${arabicNum(i+1)}</td><td class="att-name">${escapeHtml(st.name)}</td>${cells}<td class="att-total">${arabicNum(all.present)}</td><td class="att-total">${arabicNum(all.absent)}</td><td class="att-total">${arabicNum(all.late)}</td><td class="att-total">${arabicNum(all.excused)}</td></tr>`}).join('')||`<tr><td colspan="${sessions.length+6}">لا يوجد طلاب في الفصل</td></tr>`;
  const historyText=meta.historicalSessions?` · سجلات سابقة محفوظة: ${arabicNum(meta.historicalSessions)}`:'';const planText=period==='all'&&meta.cfg?`أسابيع الخطة: ${arabicNum(meta.cfg.plannedWeeks)} · أسابيع التدريس بعد استبعاد الاختبارات: ${arabicNum(meta.teachingWeeks)} · حصص المادة أسبوعيًا: ${arabicNum(meta.weekly)} · الخانات المخططة: ${arabicNum(meta.plannedSessions)}${historyText}`:`الخانات المخططة: ${arabicNum(meta.plannedSessions)} · حصص المادة أسبوعيًا: ${arabicNum(meta.weekly)}${historyText}`;
  return `<div class="attendance-official-print one-page-attendance"><section class="attendance-print-page">${compactClassOfficialHeader('سجل متابعة الحضور والغياب',c,periodText)}<div class="attendance-plan-summary">${planText}</div><div class="attendance-page-note"><span>الحصص ١–${arabicNum(sessions.length)}</span><span>صفحة واحدة</span></div><div class="attendance-legend"><span><b>ح</b> حاضر</span><span><b>غ</b> غائب</span><span><b>ت</b> متأخر</span><span><b>إ</b> مستأذن</span><span><b>—</b> غير مسجل</span></div><table class="attendance-register-table"><thead><tr><th class="att-num">م</th><th class="att-name">اسم الطالب</th>${heads}<th class="att-total">ح</th><th class="att-total">غ</th><th class="att-total">ت</th><th class="att-total">إ</th></tr></thead><tbody>${rows}</tbody></table>${officialReportSignatures()}</section></div>`;
}
function renderAttendanceRegister(){
  const c=currentClass(),sel=$('#attendanceReportPeriod'),preview=$('#attendanceReportPreview');if(!c||!sel||!preview)return;
  const months=attendanceMonthsForClass(c),wanted=state.ui.attendanceReportPeriod||'all';
  sel.innerHTML='<option value="all">الفصل كاملًا</option>'+months.map(m=>`<option value="${m}">${escapeHtml(monthLabel(m))}</option>`).join('');
  sel.value=[...sel.options].some(o=>o.value===wanted)?wanted:'all';state.ui.attendanceReportPeriod=sel.value;
  const exam=$('#excludeExamWeek');if(exam){exam.checked=state.settings.excludeExamWeek!==false;exam.onchange=()=>{state.settings.excludeExamWeek=exam.checked;renderAttendanceRegister();queueSave()}}
  const sessions=plannedAttendanceSessions(c,sel.value),meta=plannedAttendanceMeta(c,sessions,sel.value),summary=$('#attendanceReportSummary');
  if(summary)summary.innerHTML=`<div><span>حصص أسبوعية</span><b>${arabicNum(meta.weekly)}</b></div><div><span>أسابيع التدريس</span><b>${arabicNum(meta.teachingWeeks)}</b></div><div><span>خانات السجل</span><b>${arabicNum(meta.sessions)}</b>${meta.historicalSessions?`<small>منها ${arabicNum(meta.historicalSessions)} سجل سابق</small>`:''}</div><div><span>أسبوع الاختبارات</span><b>${state.settings.excludeExamWeek!==false?'مستبعد':'محسوب'}</b></div>`;
  preview.innerHTML=attendanceRegisterSheet(c,sel.value);
  sel.onchange=e=>{state.ui.attendanceReportPeriod=e.target.value;renderAttendanceRegister();queueSave()};
  const printBtn=$('#printAttendanceReportBtn');if(printBtn){printBtn.textContent=isIOSLike()?'🖨 PDF بالعرض للطباعة':'🖨 طباعة سجل الحضور';printBtn.onclick=printAttendanceReport;}
}

function isIOSLike(){
  return /iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1)
}
function pdfAscii(str){return new TextEncoder().encode(str)}
function pdfConcat(parts){
  const total=parts.reduce((n,p)=>n+p.length,0),out=new Uint8Array(total);let o=0;
  parts.forEach(p=>{out.set(p,o);o+=p.length});return out
}
function base64Bytes(b64){
  const bin=atob(b64),out=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)out[i]=bin.charCodeAt(i);return out
}
function buildJpegPdf(pages){
  const PAGE_W=841.89,PAGE_H=595.28,n=pages.length,totalObjects=2+n*3,objects=new Array(totalObjects+1);
  const kids=[];
  for(let i=0;i<n;i++){
    const pageId=3+i*3,imgId=4+i*3,contentId=5+i*3;
    kids.push(`${pageId} 0 R`);
    const jpg=pages[i].bytes,content=pdfAscii(`q ${PAGE_W} 0 0 ${PAGE_H} 0 0 cm /Im0 Do Q\n`);
    objects[pageId]=pdfAscii(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /XObject << /Im0 ${imgId} 0 R >> >> /Contents ${contentId} 0 R >>`);
    objects[imgId]=pdfConcat([pdfAscii(`<< /Type /XObject /Subtype /Image /Width ${pages[i].width} /Height ${pages[i].height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpg.length} >>\nstream\n`),jpg,pdfAscii('\nendstream')]);
    objects[contentId]=pdfConcat([pdfAscii(`<< /Length ${content.length} >>\nstream\n`),content,pdfAscii('endstream')]);
  }
  objects[1]=pdfAscii('<< /Type /Catalog /Pages 2 0 R >>');
  objects[2]=pdfAscii(`<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${n} >>`);
  const chunks=[new Uint8Array([37,80,68,70,45,49,46,52,10,37,255,255,255,255,10])],offsets=new Array(totalObjects+1).fill(0);let offset=chunks[0].length;
  for(let id=1;id<=totalObjects;id++){
    offsets[id]=offset;
    const a=pdfAscii(`${id} 0 obj\n`),b=objects[id],c=pdfAscii('\nendobj\n');
    chunks.push(a,b,c);offset+=a.length+b.length+c.length
  }
  const xrefOffset=offset;
  let xref=`xref\n0 ${totalObjects+1}\n0000000000 65535 f \n`;
  for(let id=1;id<=totalObjects;id++)xref+=String(offsets[id]).padStart(10,'0')+' 00000 n \n';
  xref+=`trailer\n<< /Size ${totalObjects+1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  chunks.push(pdfAscii(xref));
  return new Blob(chunks,{type:'application/pdf'})
}
function attendancePdfText(ctx,text,x,y,size=20,weight='400',align='right'){
  ctx.save();ctx.direction='rtl';ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillStyle='#111827';ctx.font=`${weight} ${size}px Arial, Tahoma, sans-serif`;ctx.fillText(String(text??''),x,y);ctx.restore()
}
function attendancePdfLine(ctx,x1,y1,x2,y2,width=1,color='#5b6570'){
  ctx.save();ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();ctx.restore()
}
function attendancePdfCell(ctx,x,y,w,h,text,{align='center',size=17,weight='400',fill=null}={}){
  if(fill){ctx.fillStyle=fill;ctx.fillRect(x,y,w,h)}
  ctx.strokeStyle='#5f6670';ctx.lineWidth=1;ctx.strokeRect(x,y,w,h);
  attendancePdfText(ctx,text,align==='right'?x+w-7:align==='left'?x+7:x+w/2,y+h/2,size,weight,align)
}
function attendancePdfPage(c,part,allSessions,meta,periodText,pageIndex,pageCount){
  const W=1684,H=1190,M=46,canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;
  const ctx=canvas.getContext('2d',{alpha:false});ctx.fillStyle='#fff';ctx.fillRect(0,0,W,H);
  const gov=state.appMeta||{},right=W-M,left=M,center=W/2;
  attendancePdfText(ctx,'المملكة العربية السعودية',right,44,19,'700');
  attendancePdfText(ctx,'وزارة التعليم',right,70,17,'400');
  attendancePdfText(ctx,gov.region||'إدارة التعليم',right,94,16,'400');
  attendancePdfText(ctx,gov.school||c.school||'المدرسة',right,117,16,'400');
  const logo=document.querySelector('.app-brand-logo');
  if(logo?.complete&&logo.naturalWidth){try{ctx.drawImage(logo,center-51,20,102,81)}catch{}}
  attendancePdfText(ctx,'سجل متابعة الحضور والغياب',left,52,25,'700','left');
  attendancePdfText(ctx,periodText||gov.semester||'',left,82,17,'700','left');
  attendancePdfText(ctx,gov.year||'',left,107,16,'400','left');
  attendancePdfLine(ctx,M,140,W-M,140,2,'#2f3740');

  const metaY=151,metaH=39,metaW=(W-2*M)/3;
  [['الصف',c.grade||'—'],['الفصل',c.name||'—'],['المادة',c.subject||'—']].forEach((it,i)=>{
    const x=M+i*metaW;ctx.strokeStyle='#7b838c';ctx.lineWidth=1;ctx.strokeRect(x,metaY,metaW,metaH);
    attendancePdfText(ctx,`${it[0]}: ${it[1]}`,x+metaW-9,metaY+metaH/2,16,'700')
  });

  const planY=201,planH=34;
  ctx.fillStyle='#f6f7f8';ctx.fillRect(M,planY,W-2*M,planH);ctx.strokeStyle='#a0a6ad';ctx.strokeRect(M,planY,W-2*M,planH);
  const hist=meta.historicalSessions?`  ·  سجلات سابقة: ${arabicNum(meta.historicalSessions)}`:'';const planText=meta.cfg?`أسابيع الخطة: ${arabicNum(meta.cfg.plannedWeeks)}  ·  أسابيع التدريس: ${arabicNum(meta.teachingWeeks)}  ·  حصص المادة أسبوعيًا: ${arabicNum(meta.weekly)}  ·  الخانات المخططة: ${arabicNum(meta.plannedSessions)}${hist}`:`حصص المادة أسبوعيًا: ${arabicNum(meta.weekly)}  ·  الخانات المخططة: ${arabicNum(meta.plannedSessions)}${hist}`;
  attendancePdfText(ctx,planText,center,planY+planH/2,14,'700','center');

  attendancePdfText(ctx,`الحصص ١–${arabicNum(allSessions.length)}`,right,252,14,'700');
  attendancePdfText(ctx,'صفحة واحدة',left,252,14,'700','left');
  attendancePdfText(ctx,'ح حاضر   غ غائب   ت متأخر   إ مستأذن   — غير مسجل',center,252,12,'400','center');

  const count=part.items.length,tableY=273,tableW=W-2*M,numW=38,nameW=278,totalW=48,sessionW=(tableW-numW-nameW-totalW*4)/Math.max(1,count),headH=54;
  const sessionTitleSize=count>24?11:14,dateSize=count>24?9:12,sessionCellSize=count>24?11:14;
  let x=W-M;
  attendancePdfCell(ctx,x-numW,tableY,numW,headH,'م',{size:14,weight:'700',fill:'#eef0f2'});x-=numW;
  attendancePdfCell(ctx,x-nameW,tableY,nameW,headH,'اسم الطالب',{align:'right',size:16,weight:'700',fill:'#eef0f2'});x-=nameW;
  part.items.forEach((sess,j)=>{
    const sx=x-sessionW;ctx.fillStyle='#eef0f2';ctx.fillRect(sx,tableY,sessionW,headH);ctx.strokeStyle='#5f6670';ctx.strokeRect(sx,tableY,sessionW,headH);
    attendancePdfText(ctx,`ح${arabicNum(part.start+j+1)}${sess.historical?'*':''}`,sx+sessionW/2,tableY+17,sessionTitleSize,'700','center');
    attendancePdfText(ctx,`${arabicNum(Number(sess.date.slice(8)))}/${arabicNum(Number(sess.date.slice(5,7))) }`,sx+sessionW/2,tableY+38,dateSize,'400','center');x-=sessionW
  });
  [['ح',totalW],['غ',totalW],['ت',totalW],['إ',totalW]].forEach(([lab,w])=>{attendancePdfCell(ctx,x-w,tableY,w,headH,lab,{size:14,weight:'700',fill:'#eef0f2'});x-=w});

  const students=c.students||[],available=H-tableY-headH-92,rowH=Math.max(20,Math.min(25,Math.floor(available/Math.max(1,students.length)))),allCounts=students.map(st=>attendanceCountsForSessions(st,allSessions));
  students.forEach((st,row)=>{
    let cx=W-M,y=tableY+headH+row*rowH;
    attendancePdfCell(ctx,cx-numW,y,numW,rowH,arabicNum(row+1),{size:12});cx-=numW;
    attendancePdfCell(ctx,cx-nameW,y,nameW,rowH,st.name,{align:'right',size:13,weight:'600'});cx-=nameW;
    part.items.forEach(sess=>{attendancePdfCell(ctx,cx-sessionW,y,sessionW,rowH,attendanceMark(st.attendance?.[sess.date]),{size:sessionCellSize,weight:'600'});cx-=sessionW});
    const cnt=allCounts[row];[cnt.present,cnt.absent,cnt.late,cnt.excused].forEach(v=>{attendancePdfCell(ctx,cx-totalW,y,totalW,rowH,arabicNum(v),{size:12,weight:'600'});cx-=totalW})
  });

  const signY=Math.min(H-50,tableY+headH+students.length*rowH+38);
  attendancePdfLine(ctx,M,signY-20,W-M,signY-20,1,'#444');
  attendancePdfText(ctx,'معلم المادة',W*0.72,signY,14,'400','center');
  attendancePdfText(ctx,state.appMeta.teacher||'—',W*0.72,signY+22,16,'700','center');
  attendancePdfText(ctx,'التوقيع: __________________',W*0.72,signY+44,12,'400','center');
  attendancePdfText(ctx,'مدير المدرسة',W*0.28,signY,14,'400','center');
  attendancePdfText(ctx,state.appMeta.principal||'—',W*0.28,signY+22,16,'700','center');
  attendancePdfText(ctx,'التوقيع: __________________',W*0.28,signY+44,12,'400','center');
  const data=canvas.toDataURL('image/jpeg',0.95),bytes=base64Bytes(data.split(',')[1]);
  return {bytes,width:W,height:H}
}
function buildAttendanceLandscapePdf(){
  const c=currentClass(),period=$('#attendanceReportPeriod')?.value||state.ui.attendanceReportPeriod||'all';
  if(!c)throw new Error('No active class');
  const sessions=plannedAttendanceSessions(c,period);if(!sessions.length)throw new Error('No attendance sessions');
  const meta=plannedAttendanceMeta(c,sessions,period),periodText=period==='all'?state.appMeta.semester:monthLabel(period);
  const page=attendancePdfPage(c,{start:0,items:sessions},sessions,meta,periodText,0,1);
  return buildJpegPdf([page])
}
function openAttendanceLandscapePdf(){
  try{
    const blob=buildAttendanceLandscapePdf(),c=currentClass(),safe=(c?.name||'الفصل').replace(/[\\/:*?"<>|]/g,'-'),filename=`سجل-الحضور-${safe}.pdf`;
    const file=new File([blob],filename,{type:'application/pdf'});
    const fallback=()=>{
      const url=URL.createObjectURL(blob),w=window.open(url,'_blank');
      if(!w)window.location.href=url;
      setTimeout(()=>URL.revokeObjectURL(url),120000)
    };
    if(navigator.share&&navigator.canShare?.({files:[file]})){navigator.share({files:[file],title:'سجل متابعة الحضور والغياب'}).catch(fallback)}
    else fallback()
  }catch(err){
    console.error(err);toast('تعذر إنشاء PDF بالعرض، سيتم فتح الطباعة العادية.');runPrintSession('print-attendance-report','landscape')
  }
}

function printAttendanceReport(){showView('reports',false);setReportTab('attendance',false,true);if(isIOSLike())openAttendanceLandscapePdf();else runPrintSession('print-attendance-report','landscape')}

function studentOfficialHeader(c,periodText,studentName=''){
  const m=state.appMeta||{},school=m.school||'اسم المدرسة',region=m.region||'إدارة التعليم';
  return `<header class="student-official-header" dir="rtl">
    <div class="student-official-gov"><b>المملكة العربية السعودية</b><span>وزارة التعليم</span><span>${escapeHtml(region)}</span><span>${escapeHtml(school)}</span></div>
    <div class="student-official-logo"><img src="./assets/moe-logo.png" alt="شعار وزارة التعليم"></div>
    <div class="student-official-title"><h1>تقرير متابعة طالب</h1><span>${escapeHtml(periodText||m.semester||'')}</span><small>${escapeHtml(m.year||'')}</small></div>
  </header>
  <div class="student-identity-strip" dir="rtl">
    <div><span>الطالب</span><b>${escapeHtml(studentName||'—')}</b></div>
    <div><span>الصف / الفصل</span><b>${escapeHtml(c.grade||'—')} — ${escapeHtml(c.name||'—')}</b></div>
    <div><span>المادة</span><b>${escapeHtml(c.subject||'—')}</b></div>
  </div>`;
}
function officialReportSignatures(){return `<footer class="official-signatures"><div><span>معلم المادة</span><b>${escapeHtml(state.appMeta.teacher||'—')}</b><em>التوقيع: __________________</em></div><div><span>مدير المدرسة</span><b>${escapeHtml(state.appMeta.principal||'—')}</b><em>التوقيع: __________________</em></div></footer>`}
function setPrintPage(orientation='portrait'){let el=document.getElementById('dynamicPrintPage');if(!el){el=document.createElement('style');el.id='dynamicPrintPage';document.head.appendChild(el)}el.textContent=`@page{size:A4 ${orientation};margin:10mm}`}
function clearPrintPage(){document.getElementById('dynamicPrintPage')?.remove()}
const PRINT_BODY_CLASSES=['print-student','print-class-summary','print-teacher-schedule','print-attendance-report'];
function cleanupPrintSession(){
  PRINT_BODY_CLASSES.forEach(c=>document.body.classList.remove(c));
  clearPrintPage();
  printSessionActive=false;printSessionClass='';printSessionStartedAt=0;printSessionSawHidden=false;printMediaEntered=false;
}
function runPrintSession(printClass,orientation='portrait'){
  if(printSessionActive){toast('الطباعة مفتوحة بالفعل. أغلق معاينة الطباعة أولًا.');return}
  printSessionActive=true;printSessionClass=printClass;printSessionStartedAt=Date.now();printSessionSawHidden=false;printMediaEntered=false;
  PRINT_BODY_CLASSES.forEach(c=>document.body.classList.remove(c));
  setPrintPage(orientation);document.body.classList.add(printClass);
  try{window.print()}catch(e){cleanupPrintSession();toast('تعذر فتح الطباعة. حاول من Safari أو أعد فتح التطبيق.')}
}

function assessmentTypeScore(s,c,period,type){
  const events=eventsForPeriod(c,period).filter(a=>a.type===type);let earned=0,max=0,count=0;
  for(const a of events){const raw=s.grades?.[a.id];if(raw!==undefined&&raw!==null&&raw!==''&&!Number.isNaN(Number(raw))){earned+=Number(raw);max+=Number(a.maxScore)||0;count++}}
  return count?`${arabicNum(earned)} / ${arabicNum(max)}`:'—'
}
function buildClassLandscapePdf(){
  const c=currentClass(),period=$('#reportPeriod')?.value||state.ui.reportPeriod||'all';if(!c)throw new Error('No active class');
  const periodText=period==='all'?state.appMeta.semester:monthLabel(period),W=1684,H=1190,M=48,canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;
  const ctx=canvas.getContext('2d',{alpha:false});ctx.fillStyle='#fff';ctx.fillRect(0,0,W,H);
  const gov=state.appMeta||{},right=W-M,left=M,center=W/2;
  attendancePdfText(ctx,'المملكة العربية السعودية',right,44,19,'700');attendancePdfText(ctx,'وزارة التعليم',right,70,17,'400');attendancePdfText(ctx,gov.region||'إدارة التعليم',right,94,16,'400');attendancePdfText(ctx,gov.school||'المدرسة',right,117,16,'400');
  const logo=document.querySelector('.app-brand-logo');if(logo?.complete&&logo.naturalWidth){try{ctx.drawImage(logo,center-51,20,102,81)}catch{}}
  attendancePdfText(ctx,'كشف متابعة الفصل',left,52,26,'700','left');attendancePdfText(ctx,periodText||gov.semester||'',left,83,17,'700','left');attendancePdfText(ctx,gov.year||'',left,108,16,'400','left');attendancePdfLine(ctx,M,140,W-M,140,2,'#2f3740');
  const metaY=151,metaH=39,metaW=(W-2*M)/3;[['الصف',c.grade||'—'],['الفصل',c.name||'—'],['المادة',c.subject||'—']].forEach((it,i)=>{const x=M+i*metaW;ctx.strokeStyle='#7b838c';ctx.strokeRect(x,metaY,metaW,metaH);attendancePdfText(ctx,`${it[0]}: ${it[1]}`,x+metaW-9,metaY+metaH/2,16,'700')});
  const tableY=212,tableW=W-2*M,numW=40,nameW=292,metricCount=9,metricW=(tableW-numW-nameW)/metricCount,headH=68;
  const headers=[['الواجبات'],['المشاركة','والتفاعل'],['المشاريع','والبحوث'],['التطبيقات','العملية'],['الاختبارات','القصيرة'],['الاختبارات'],['المجموع','المرصود'],['النسبة'],['الغياب']];
  let x=W-M;attendancePdfCell(ctx,x-numW,tableY,numW,headH,'م',{size:14,weight:'700',fill:'#eef0f2'});x-=numW;attendancePdfCell(ctx,x-nameW,tableY,nameW,headH,'اسم الطالب',{align:'right',size:16,weight:'700',fill:'#eef0f2'});x-=nameW;
  headers.forEach(lines=>{const sx=x-metricW;ctx.fillStyle='#eef0f2';ctx.fillRect(sx,tableY,metricW,headH);ctx.strokeStyle='#5f6670';ctx.strokeRect(sx,tableY,metricW,headH);lines.forEach((line,j)=>attendancePdfText(ctx,line,sx+metricW/2,tableY+headH/2+(j-(lines.length-1)/2)*17,12,'700','center'));x-=metricW});
  const students=c.students||[],available=H-tableY-headH-92,rowH=Math.max(20,Math.min(26,Math.floor(available/Math.max(1,students.length))));
  students.forEach((st,row)=>{const sc=scoreSummary(st,c,period),at=attendanceCounts(st,period),vals=[assessmentTypeScore(st,c,period,'homework'),assessmentTypeScore(st,c,period,'participation'),assessmentTypeScore(st,c,period,'project'),assessmentTypeScore(st,c,period,'practical'),assessmentTypeScore(st,c,period,'quiz'),assessmentTypeScore(st,c,period,'exam'),sc.gradedMax?`${arabicNum(sc.earned)}/${arabicNum(sc.gradedMax)}`:'—',pct(sc.performance),arabicNum(at.absent)];let cx=W-M,y=tableY+headH+row*rowH;attendancePdfCell(ctx,cx-numW,y,numW,rowH,arabicNum(row+1),{size:12});cx-=numW;attendancePdfCell(ctx,cx-nameW,y,nameW,rowH,st.name,{align:'right',size:13,weight:'600'});cx-=nameW;vals.forEach(v=>{attendancePdfCell(ctx,cx-metricW,y,metricW,rowH,v,{size:11,weight:'500'});cx-=metricW})});
  const signY=Math.min(H-50,tableY+headH+students.length*rowH+40);attendancePdfLine(ctx,M,signY-20,W-M,signY-20,1,'#444');attendancePdfText(ctx,'معلم المادة',W*0.72,signY,14,'400','center');attendancePdfText(ctx,state.appMeta.teacher||'—',W*0.72,signY+22,16,'700','center');attendancePdfText(ctx,'التوقيع: __________________',W*0.72,signY+44,12,'400','center');attendancePdfText(ctx,'مدير المدرسة',W*0.28,signY,14,'400','center');attendancePdfText(ctx,state.appMeta.principal||'—',W*0.28,signY+22,16,'700','center');attendancePdfText(ctx,'التوقيع: __________________',W*0.28,signY+44,12,'400','center');
  const data=canvas.toDataURL('image/jpeg',0.95),bytes=base64Bytes(data.split(',')[1]);return buildJpegPdf([{bytes,width:W,height:H}])
}
function openClassLandscapePdf(){
  try{
    const blob=buildClassLandscapePdf(),c=currentClass(),safe=(c?.name||'الفصل').replace(/[\\/:*?"<>|]/g,'-'),filename=`كشف-متابعة-${safe}.pdf`,file=new File([blob],filename,{type:'application/pdf'});
    const fallback=()=>{const url=URL.createObjectURL(blob),w=window.open(url,'_blank');if(!w)window.location.href=url;setTimeout(()=>URL.revokeObjectURL(url),120000)};
    if(navigator.share&&navigator.canShare?.({files:[file]})){navigator.share({files:[file],title:'كشف متابعة الفصل'}).catch(fallback)}else fallback()
  }catch(err){console.error(err);toast('تعذر إنشاء PDF بالعرض، سيتم فتح الطباعة العادية.');runPrintSession('print-class-summary','landscape')}
}

function classOfficialSheet(c,period='all'){
  const periodText=period==='all'?state.appMeta.semester:monthLabel(period);
  const rows=c.students.map((st,i)=>{const sc=scoreSummary(st,c,period),at=attendanceCounts(st,period);return `<tr><td class="sheet-num">${arabicNum(i+1)}</td><td class="sheet-name">${escapeHtml(st.name)}</td><td>${assessmentTypeScore(st,c,period,'homework')}</td><td>${assessmentTypeScore(st,c,period,'participation')}</td><td>${assessmentTypeScore(st,c,period,'project')}</td><td>${assessmentTypeScore(st,c,period,'practical')}</td><td>${assessmentTypeScore(st,c,period,'quiz')}</td><td>${assessmentTypeScore(st,c,period,'exam')}</td><td>${sc.gradedMax?`${arabicNum(sc.earned)} / ${arabicNum(sc.gradedMax)}`:'—'}</td><td>${pct(sc.performance)}</td><td>${arabicNum(at.absent)}</td></tr>`}).join('')||'<tr><td colspan="11">لا يوجد طلاب في الفصل</td></tr>';
  return `<div class="official-class-print landscape-class-report">${compactClassOfficialHeader('كشف متابعة الفصل',c,periodText)}<table class="official-class-sheet"><thead><tr><th>م</th><th>اسم الطالب</th><th>الواجبات</th><th>المشاركة والتفاعل</th><th>المشاريع والبحوث</th><th>التطبيقات العملية</th><th>الاختبارات القصيرة</th><th>الاختبارات</th><th>المجموع المرصود</th><th>النسبة</th><th>الغياب</th></tr></thead><tbody>${rows}</tbody></table>${officialReportSignatures()}</div>`;
}
function renderReports(){
  const c=currentClass();if(!c)return;
  renderMonthOptions($('#reportPeriod'),state.ui.reportPeriod||'all');
  $('#gradeAlertThreshold').value=state.settings.gradeAlertThreshold;
  $('#absenceAlertThreshold').value=state.settings.absenceAlertThreshold;
  if($('#reportsContextTitle'))$('#reportsContextTitle').textContent=`${c.grade} · ${c.name}`;
  if($('#reportsContextMeta'))$('#reportsContextMeta').textContent=c.subject||'';
  const period=$('#reportPeriod').value||'all',events=eventsForPeriod(c,period),allStudents=c.students;
  const risks=allStudents.map(st=>({s:st,...riskForStudent(st,c,period)})),riskList=risks.filter(x=>x.isRisk);
  const perf=risks.map(x=>x.score.performance).filter(x=>x!==null),avg=perf.length?perf.reduce((a,b)=>a+b,0)/perf.length:null,absence=risks.reduce((n,x)=>n+x.attendance.absent,0);

  $('#reportPrintHeader').innerHTML=classOfficialSheet(c,period);if($('#printClassReportBtn'))$('#printClassReportBtn').textContent=isIOSLike()?'🖨 PDF بالعرض للطباعة':'🖨 طباعة كشف الفصل';
  $('#reportKpis').innerHTML=`<div class="stat"><b>${arabicNum(events.length)}</b><span>تقييم</span></div><div class="stat ok"><b>${pct(avg)}</b><span>متوسط الأداء</span></div><div class="stat bad"><b>${arabicNum(absence)}</b><span>غياب</span></div><div class="stat warn"><b>${arabicNum(riskList.length)}</b><span>يحتاج متابعة</span></div>`;
  $('#riskBanner').innerHTML=riskList.length?`<div class="risk-box"><b>${arabicNum(riskList.length)} طالب يحتاج متابعة</b><span>وفق حدود الدرجة والغياب الحالية.</span></div>`:`<div class="risk-box clear"><b>لا توجد تنبيهات حالية</b><span>وفق الحدود المحددة.</span></div>`;

  const key=studentNameKey(reportStudentSearchTerm),shown=key?risks.filter(x=>studentNameKey(x.s.name).includes(key)):risks;
  $('#studentReportList').innerHTML=shown.length?shown.map((x,i)=>{const sc=x.score,at=x.attendance;return `<div class="student-report-row ${x.isRisk?'risk-row':''}"><div class="student-report-index">${arabicNum(i+1)}</div><div class="student-report-person"><b>${escapeHtml(x.s.name)}</b><span>${x.isRisk?escapeHtml(x.reasons.join(' · ')):`${arabicNum(sc.gradedCount)} من ${arabicNum(sc.eventCount)} تقييمات`}</span></div><div class="student-report-quick"><span><b>${pct(sc.performance)}</b><small>الأداء</small></span><span><b>${arabicNum(at.absent)}</b><small>غياب</small></span></div><button class="btn student-report-open" data-report="${x.s.id}">فتح التقرير</button></div>`}).join(''):`<div class="empty-state"><b>لا توجد نتائج</b>${key?'غيّر عبارة البحث.':'أضف طلابًا إلى الفصل.'}</div>`;
  $$('#studentReportList [data-report]').forEach(b=>b.onclick=()=>openStudentReport(b.dataset.report));
  renderAttendanceRegister();
  if($('#view-reports')?.classList.contains('report-detail-mode'))setReportTab(state.ui.reportTab||'class',false,true);else showReportsHub(false)
}

function trendChart(s,c,period){const pts=eventsForPeriod(c,period).filter(a=>a.date&&s.grades?.[a.id]!==undefined&&s.grades?.[a.id]!==null&&a.maxScore>0).sort((a,b)=>a.date.localeCompare(b.date)).map(a=>({a,p:Number(s.grades[a.id])/a.maxScore*100}));if(pts.length<2)return `<div class="trend-empty">يحتاج الرسم إلى تقييمين مؤرخين على الأقل.</div>`;const w=560,h=160,pad=26,dx=(w-pad*2)/(pts.length-1),coords=pts.map((x,i)=>({x:pad+i*dx,y:h-pad-(Math.max(0,Math.min(100,x.p))/100)*(h-pad*2),...x})),poly=coords.map(p=>`${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');return `<div class="trend-wrap"><svg class="trend-chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="تطور مستوى الطالب"><line x1="${pad}" y1="${pad}" x2="${pad}" y2="${h-pad}"/><line x1="${pad}" y1="${h-pad}" x2="${w-pad}" y2="${h-pad}"/><line class="mid" x1="${pad}" y1="${h/2}" x2="${w-pad}" y2="${h/2}"/><polyline points="${poly}" fill="none"/><g>${coords.map(p=>`<circle cx="${p.x}" cy="${p.y}" r="4"><title>${escapeHtml(p.a.title)}: ${Math.round(p.p)}%</title></circle>`).join('')}</g><text x="4" y="${pad+4}">١٠٠٪</text><text x="8" y="${h-pad+4}">٠٪</text></svg><div class="trend-labels"><span>${escapeHtml(formatDate(pts[0].a.date))}</span><span>${escapeHtml(formatDate(pts.at(-1).a.date))}</span></div></div>`}
function studentAssessmentRows(s,c,period){const events=eventsForPeriod(c,period).slice().sort((a,b)=>(a.date||'').localeCompare(b.date||''));return events.map(a=>{const v=s.grades?.[a.id],has=v!==undefined&&v!==null&&v!=='',pr=has&&a.maxScore?Number(v)/a.maxScore*100:null;return `<tr><td>${escapeHtml(formatDate(a.date))}</td><td>${escapeHtml(typeLabel(a.type))}</td><td>${escapeHtml(a.title)}</td><td>${has?`${arabicNum(v)} / ${arabicNum(a.maxScore)}`:'—'}</td><td>${pct(pr)}</td></tr>`}).join('')||'<tr><td colspan="5">لا توجد تقييمات في هذه الفترة</td></tr>'}
function recentAttendanceRows(s,period){return Object.entries(s.attendance||{}).filter(([d])=>period==='all'||monthKey(d)===period).sort((a,b)=>b[0].localeCompare(a[0])).map(([d,v])=>`<tr><td>${escapeHtml(formatDate(d))}</td><td>${escapeHtml(statusLabel(v))}</td></tr>`).join('')||'<tr><td colspan="2">لا توجد بيانات حضور في هذه الفترة</td></tr>'}
function openStudentReport(id){
  const st=findStudent(id),c=findStudentClass(id);if(!st||!c)return;openStudentId=id;
  const period=state.ui.reportPeriod||'all',r=riskForStudent(st,c,period),sc=r.score,a=r.attendance,periodText=period==='all'?state.appMeta.semester:monthLabel(period);
  const trendReady=eventsForPeriod(c,period).filter(x=>x.date&&st.grades?.[x.id]!==undefined&&st.grades?.[x.id]!==null&&x.maxScore>0).length>=2;
  const trendSection=trendReady?`<section class='report-section'><h3>تطور المستوى</h3>${trendChart(st,c,period)}</section>`:'';
  $('#studentModalTitle').textContent=`تقرير ${st.name}`;
  $('#studentReportPrint').innerHTML=`${studentOfficialHeader(c,periodText,st.name)}${r.isRisk?`<div class='risk-box report-risk'><b>يحتاج متابعة</b><span>${escapeHtml(r.reasons.join(' · '))}</span></div>`:''}<div class='student-summary-strip'><div><span>الأداء المرصود</span><b>${pct(sc.performance)}</b></div><div><span>اكتمال الرصد</span><b>${pct(sc.completion)}</b></div><div><span>الغياب</span><b>${arabicNum(a.absent)}</b></div><div><span>التأخر</span><b>${arabicNum(a.late)}</b></div></div>${trendSection}<section class='report-section'><h3>سجل التقييمات</h3><table class='detail-table'><thead><tr><th>التاريخ</th><th>النوع</th><th>التقييم</th><th>الدرجة</th><th>النسبة</th></tr></thead><tbody>${studentAssessmentRows(st,c,period)}</tbody></table></section><section class='report-section'><h3>سجل الحضور والغياب</h3><div class='student-attendance-summary'><span>حاضر <b>${arabicNum(a.present)}</b></span><span>غائب <b>${arabicNum(a.absent)}</b></span><span>متأخر <b>${arabicNum(a.late)}</b></span><span>مستأذن <b>${arabicNum(a.excused)}</b></span></div><table class='detail-table attendance-history'><thead><tr><th>التاريخ</th><th>الحالة</th></tr></thead><tbody>${recentAttendanceRows(st,period)}</tbody></table></section>${st.notes?`<div class='student-report-header note-box'><b>ملاحظات المعلم</b><p>${escapeHtml(st.notes)}</p></div>`:''}${officialReportSignatures()}`;
  $('#studentNotes').value=st.notes||'';if(!$('#studentModal').open)$('#studentModal').showModal();
}
function saveStudentNotes(){const s=findStudent(openStudentId);if(!s)return;s.notes=$('#studentNotes').value.trim();queueSave();openStudentReport(openStudentId);toast('تم حفظ الملاحظات')}
function printStudent(){runPrintSession('print-student','portrait')}
function printClassReport(){showView('reports',false);setReportTab('class',false,true);if(isIOSLike())openClassLandscapePdf();else runPrintSession('print-class-summary','landscape')}

function parseCSV(text){const rows=[];let row=[],cell='',q=false;for(let i=0;i<text.length;i++){const ch=text[i],n=text[i+1];if(ch==='"'&&q&&n==='"'){cell+='"';i++}else if(ch==='"'){q=!q}else if(ch===','&&!q){row.push(cell);cell=''}else if((ch==='\n'||ch==='\r')&&!q){if(ch==='\r'&&n==='\n')i++;row.push(cell);if(row.some(x=>x.trim()))rows.push(row);row=[];cell=''}else cell+=ch}row.push(cell);if(row.some(x=>x.trim()))rows.push(row);return rows}
function csvHeaderIndex(headers,names){return headers.findIndex(h=>names.some(n=>h.toLowerCase()===n.toLowerCase()))}
function normalizeImportText(v=''){return String(v??'').trim().replace(/\s+/g,' ')}
function latinDigits(v=''){return normalizeImportText(v).replace(/[٠-٩]/g,d=>'0123456789'['٠١٢٣٤٥٦٧٨٩'.indexOf(d)]).replace(/[۰-۹]/g,d=>'0123456789'['۰۱۲۳۴۵۶۷۸۹'.indexOf(d)])}
function arabicDigits(v=''){return String(v??'').replace(/\d/g,d=>'٠١٢٣٤٥٦٧٨٩'[Number(d)])}
function studentNameKey(v=''){return normalizeImportText(v).normalize('NFKC').replace(/[\u064B-\u065F\u0670\u0640]/g,'').replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').toLowerCase()}
function gradeImportKey(v=''){return latinDigits(v).normalize('NFKC').toLowerCase()}
function sectionImportKey(v=''){return latinDigits(v).replace(/^الفصل\s*/,'').replace(/\s+/g,'').toLowerCase()}
function findImportedClass(grade,section){const g=gradeImportKey(grade),s=sectionImportKey(section);return state.classes.find(c=>gradeImportKey(c.grade)===g&&sectionImportKey(c.name)===s)}
function starterStateOnly(){const starter=new Set(seedStudents.map(studentNameKey));return state.classes.length<=2&&state.classes.every(c=>(c.assessmentEvents||[]).length===0&&(c.students||[]).every(s=>{const hasRecords=Object.keys(s.grades||{}).length||Object.keys(s.attendance||{}).length||String(s.notes||'').trim();return !hasRecords&&starter.has(studentNameKey(s.name))}))}
function gradeSortValue(v=''){const k=gradeImportKey(v);if(/الأول|اول/.test(k))return 1;if(/الثاني|ثاني/.test(k))return 2;if(/الثالث|ثالث/.test(k))return 3;return 99}
function sortImportedClasses(){state.classes.sort((a,b)=>gradeSortValue(a.grade)-gradeSortValue(b.grade)||Number(sectionImportKey(a.name)||999)-Number(sectionImportKey(b.name)||999)||String(a.name).localeCompare(String(b.name),'ar'))}
async function importSchoolCSV(rows,headers){
  const nameIdx=csvHeaderIndex(headers,['الاسم','اسم الطالب','name']),gradeIdx=csvHeaderIndex(headers,['الصف','grade']),sectionIdx=csvHeaderIndex(headers,['الفصل','الشعبة','section','class']);
  if(nameIdx<0||gradeIdx<0||sectionIdx<0)return false;
  const schoolIdx=csvHeaderIndex(headers,['المدرسة','school']),regionIdx=csvHeaderIndex(headers,['الإدارة','الادارة','المنطقة','region']);
  const grouped=new Map(),schools=new Set(),regions=new Set();
  for(const r of rows.slice(1)){const name=normalizeImportText(r[nameIdx]),grade=normalizeImportText(r[gradeIdx]),section=normalizeImportText(r[sectionIdx]);if(!name||!grade||!section)continue;const key=`${gradeImportKey(grade)}||${sectionImportKey(section)}`;if(!grouped.has(key))grouped.set(key,{grade,section,names:[],seen:new Set()});const g=grouped.get(key),nk=studentNameKey(name);if(!g.seen.has(nk)){g.seen.add(nk);g.names.push(name)}if(schoolIdx>=0&&normalizeImportText(r[schoolIdx]))schools.add(normalizeImportText(r[schoolIdx]));if(regionIdx>=0&&normalizeImportText(r[regionIdx]))regions.add(normalizeImportText(r[regionIdx]))}
  const groups=[...grouped.values()].sort((a,b)=>gradeSortValue(a.grade)-gradeSortValue(b.grade)||Number(sectionImportKey(a.section)||999)-Number(sectionImportKey(b.section)||999)),total=groups.reduce((n,g)=>n+g.names.length,0);if(!total)return false;
  const preview=groups.map(g=>`${g.grade} — الفصل ${arabicDigits(latinDigits(g.section))}: ${g.names.length} طالب`).join('\n');
  const sync=confirm(`تم العثور على ${total} طالبًا موزعين على ${groups.length} فصول:\n\n${preview}\n\nموافق = مزامنة قوائم هذه الفصول مع الملف مع الاحتفاظ بدرجات وحضور الطالب المطابق بالاسم.\nإلغاء = إضافة الطلاب الجدد فقط دون حذف أي طالب موجود.`);
  const defaultSubject=currentClass()?.subject||'المهارات الرقمية',cleanStarter=starterStateOnly();if(cleanStarter)state.classes=[];const touched=[];
  for(const g of groups){const sectionLabel=arabicDigits(latinDigits(g.section));let c=findImportedClass(g.grade,g.section);if(!c){c=makeClass(sectionLabel,g.grade,defaultSubject,[]);state.classes.push(c)}else{c.grade=g.grade;c.name=sectionLabel}const existing=new Map(c.students.map(s=>[studentNameKey(s.name),s]));if(sync)c.students=g.names.map(name=>existing.get(studentNameKey(name))||makeStudent(name));else for(const name of g.names){const k=studentNameKey(name);if(!existing.has(k)){const st=makeStudent(name);c.students.push(st);existing.set(k,st)}}touched.push(c)}
  if(schools.size===1)state.appMeta.school=[...schools][0];if(regions.size===1)state.appMeta.region=[...regions][0];sortImportedClasses();if(touched[0])state.activeClassId=touched[0].id;renderAll();if($('#studentsModal').open)renderStudentsModal();queueSave();toast(`تم توزيع ${total} طالبًا على ${groups.length} فصول`);return true
}
async function importCSV(file){const text=await file.text(),rows=parseCSV(text);if(rows.length<2){toast('ملف CSV فارغ أو غير صالح');return}const headers=rows[0].map(x=>x.trim().replace(/^\uFEFF/,''));if(await importSchoolCSV(rows,headers))return;let idx=headers.findIndex(h=>/^(الاسم|اسم الطالب|name)$/i.test(h));if(idx<0)idx=headers.length-1;const names=rows.slice(1).map(r=>(r[idx]||'').trim()).filter(Boolean);if(!names.length){toast('لم أجد أسماء طلاب');return}const replace=confirm(`تم العثور على ${names.length} طالبًا.\nموافق = استبدال طلاب الفصل الحالي\nإلغاء = إضافة إلى الموجود`);if(replace)currentClass().students=[];const existing=new Set(currentClass().students.map(s=>studentNameKey(s.name)));for(const name of names){const k=studentNameKey(name);if(!existing.has(k)){currentClass().students.push(makeStudent(name));existing.add(k)}}renderAll();if($('#studentsModal').open)renderStudentsModal();queueSave();toast(`تم استيراد ${names.length} طالبًا`)}
function csvCell(v){const s=String(v??'');return /[",\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s}
function exportCurrentClassCSV(){const c=currentClass(),events=c.assessmentEvents.slice().sort((a,b)=>(a.date||'').localeCompare(b.date||'')),headers=['م','الاسم',...events.map(a=>`${a.title} | ${a.date||'بدون تاريخ'} | من ${a.maxScore}`),'نسبة الأداء','اكتمال الرصد','الغياب','التأخر','ملاحظات'];const lines=[headers.map(csvCell).join(',')];c.students.forEach((s,i)=>{const a=attendanceCounts(s),sc=scoreSummary(s,c),vals=events.map(e=>s.grades?.[e.id]??'');lines.push([i+1,s.name,...vals,sc.performance===null?'':Math.round(sc.performance*100)/100,Math.round(sc.completion*100)/100,a.absent,a.late,s.notes||''].map(csvCell).join(','))});download(`سجل-${c.name}-${localDateISO()}.csv`,'\uFEFF'+lines.join('\n'),'text/csv;charset=utf-8')}
function download(name,text,type='application/json'){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;document.body.appendChild(a);a.click();const url=a.href;a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function backup(){const copy=clone(state);copy.exportedAt=new Date().toISOString();download(`student-roster-backup-${localDateISO()}.json`,JSON.stringify(copy,null,2))}
async function restore(file){try{const x=JSON.parse(await file.text()),m=migrate(x);if(!m)throw 0;if(!confirm('سيتم استبدال السجلات الحالية بالنسخة الاحتياطية. متابعة؟'))return;state=m;await save();renderAll();showView('dashboard',false);toast('تمت الاستعادة')}catch{toast('ملف النسخة الاحتياطية غير صالح')}}

function compareVersions(a,b){
  const pa=String(a||'0').replace(/^v/i,'').split('.').map(x=>Number(x)||0),pb=String(b||'0').replace(/^v/i,'').split('.').map(x=>Number(x)||0),n=Math.max(pa.length,pb.length);
  for(let i=0;i<n;i++){const d=(pa[i]||0)-(pb[i]||0);if(d)return d>0?1:-1}return 0
}
function setVersionUI(){
  if($('#versionBadge'))$('#versionBadge').textContent='v'+APP_VERSION;
  if($('#footerVersion'))$('#footerVersion').textContent='v'+APP_VERSION;
  if($('#adminVersion'))$('#adminVersion').textContent='v'+APP_VERSION;
}
function showUpdateBanner(title,text,autoHide=0){
  const b=$('#updateBanner');if(!b)return;
  $('#updateBannerTitle').textContent=title;$('#updateBannerText').textContent=text;b.hidden=false;
  if(updateBannerTimer)clearTimeout(updateBannerTimer);
  if(autoHide)updateBannerTimer=setTimeout(()=>{b.hidden=true},autoHide)
}
function updateAssetLabel(asset=''){
  const clean=String(asset).replace(/^\.\//,'');
  const labels={'':'واجهة التطبيق','index.html':'واجهة التطبيق','app.js':'وظائف التطبيق','styles.css':'تصميم التطبيق','print.css':'تنسيق الطباعة','version.js':'بيانات الإصدار','manifest.webmanifest':'إعدادات PWA','icon-192.png':'أيقونة التطبيق','icon-512.png':'أيقونة التطبيق','moe-logo.png':'شعار الوزارة'};
  const name=clean.split('/').pop()||'';
  return labels[clean]||labels[name]||name||'ملفات التطبيق'
}
function showUpdateSplash({version='',title='جارٍ تحديث التطبيق',status='يتم تجهيز الإصدار الجديد…',progress=0,detail=''}={}){
  const el=$('#updateSplash');
  if(!el){showUpdateBanner(title,status);return}
  updateSplashActive=true;if(version)updateTargetVersion=version;
  const p=Math.max(0,Math.min(100,Number(progress)||0));
  el.hidden=false;document.body.classList.add('update-in-progress');
  if($('#updateSplashTitle'))$('#updateSplashTitle').textContent=title;
  if($('#updateSplashStatus'))$('#updateSplashStatus').textContent=status;
  if($('#updateSplashVersion'))$('#updateSplashVersion').textContent=updateTargetVersion?'v'+updateTargetVersion:'—';
  if($('#updateSplashProgress'))$('#updateSplashProgress').style.width=p+'%';
  if($('#updateSplashPercent'))$('#updateSplashPercent').textContent=Math.round(p).toLocaleString('ar-SA')+'٪';
  if($('#updateSplashDetail'))$('#updateSplashDetail').textContent=detail||'جارٍ تجهيز ملفات التحديث…'
}
function updateSplashFromWorker(data={}){
  const phase=data.phase||'',raw=Math.max(0,Math.min(100,Number(data.progress)||0)),version=data.version||updateTargetVersion;
  if(phase==='start'){showUpdateSplash({version,title:'تم العثور على تحديث',status:'جارٍ تجهيز ملفات الإصدار الجديد…',progress:8,detail:'بدء تنزيل ملفات التطبيق'});return}
  if(phase==='downloading'){
    const mapped=10+raw*.76,current=Number(data.completed||0)+1,total=Number(data.total||0);
    showUpdateSplash({version,title:'جارٍ تنزيل التحديث',status:'يتم تنزيل ملفات الإصدار الجديد بأمان…',progress:mapped,detail:`${updateAssetLabel(data.asset)}${total?' · '+Math.min(current,total).toLocaleString('ar-SA')+' / '+total.toLocaleString('ar-SA'):''}`});return
  }
  if(phase==='installed'){showUpdateSplash({version,title:'اكتمل التنزيل',status:'جارٍ تثبيت التحديث…',progress:90,detail:'تم تنزيل جميع ملفات التطبيق'});return}
  if(phase==='activating'){showUpdateSplash({version,title:'جارٍ تفعيل الإصدار',status:'يتم استبدال ملفات التطبيق القديمة…',progress:96,detail:'تهيئة النسخة الجديدة'});return}
  if(phase==='activated'){showUpdateSplash({version,title:'اكتمل التحديث',status:'سيُعاد فتح التطبيق على الإصدار الجديد.',progress:100,detail:'تم تثبيت التحديث بنجاح'});return}
  if(phase==='error'){showUpdateSplash({version,title:'تعذر إكمال التحديث',status:'احتفظ التطبيق بالإصدار الحالي. سنحاول مرة أخرى عند توفر اتصال مستقر.',progress:raw||10,detail:data.asset?updateAssetLabel(data.asset):'خطأ أثناء تنزيل الملفات'})}
}
async function fetchPublishedVersion(){
  try{
    const r=await fetch('./version.js?check='+Date.now(),{cache:'no-store',headers:{'cache-control':'no-cache'}});
    if(!r.ok)return null;const txt=await r.text(),m=txt.match(/APP_VERSION\s*=\s*['"]([^'"]+)['"]/);return m?.[1]||null
  }catch{return null}
}
async function checkForAppUpdate({manual=false}={}){
  if(!navigator.onLine){if(manual)showUpdateBanner('لا يوجد اتصال','سأفحص التحديث عند عودة الاتصال.',2500);return}
  if(manual)showUpdateBanner('فحص التحديثات','جارٍ التحقق من أحدث إصدار…');
  const latest=await fetchPublishedVersion(),newer=latest&&compareVersions(latest,APP_VERSION)>0;
  if(newer){
    updateTargetVersion=latest;updateProgressEligible=true;
    showUpdateSplash({version:latest,title:'يوجد إصدار جديد',status:'جارٍ بدء التحديث تلقائيًا…',progress:5,detail:'التحقق من ملفات الإصدار v'+latest})
  }
  try{await swRegistration?.update()}catch{}
  if(swRegistration?.waiting){try{swRegistration.waiting.postMessage({type:'SKIP_WAITING'})}catch{}}
  if(manual&&!newer)showUpdateBanner('التطبيق محدث','أنت تستخدم أحدث إصدار v'+APP_VERSION+'.',2200)
}
async function initAppUpdater(){
  setVersionUI();
  try{
    const key='student-roster-app-version',prev=localStorage.getItem(key);
    if(prev&&prev!==APP_VERSION)setTimeout(()=>toast('تم تحديث التطبيق إلى الإصدار v'+APP_VERSION),500);
    localStorage.setItem(key,APP_VERSION)
  }catch{}
  if(!('serviceWorker'in navigator))return;
  const hadController=!!navigator.serviceWorker.controller;
  updateProgressEligible=hadController;
  try{
    navigator.serviceWorker.addEventListener('message',event=>{
      const data=event.data||{};
      if(data.type==='OPEN_VIEW'){showView(data.view||'schedule');return}
      if(data.type!=='UPDATE_PROGRESS')return;
      if(!updateProgressEligible&&!updateSplashActive)return;
      updateProgressEligible=true;updateSplashFromWorker(data)
    });
    swRegistration=await navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'});
    swRegistration.addEventListener('updatefound',()=>{
      const worker=swRegistration.installing;if(!worker||!navigator.serviceWorker.controller)return;
      updateProgressEligible=true;
      showUpdateSplash({version:updateTargetVersion,title:'يوجد تحديث جديد',status:'جارٍ تجهيز الإصدار الجديد…',progress:7,detail:'بدء تثبيت مكونات التحديث'});
      worker.addEventListener('statechange',()=>{
        if(worker.state==='installed'){
          showUpdateSplash({version:updateTargetVersion,title:'اكتمل التنزيل',status:'جارٍ تفعيل الإصدار الجديد…',progress:92,detail:'تم التحقق من ملفات التحديث'});
          if(swRegistration.waiting){try{swRegistration.waiting.postMessage({type:'SKIP_WAITING'})}catch{}}
        }else if(worker.state==='activating')showUpdateSplash({version:updateTargetVersion,title:'جارٍ تفعيل الإصدار',status:'لحظات وسيُفتح التطبيق من جديد…',progress:97,detail:'تطبيق النسخة الجديدة'})
      })
    });
    let canReload=hadController;
    navigator.serviceWorker.addEventListener('controllerchange',()=>{
      updateProgressEligible=true;
      if(!canReload){canReload=true;return}
      if(updateReloading)return;updateReloading=true;
      showUpdateSplash({version:updateTargetVersion,title:'تم التحديث بنجاح',status:'إعادة فتح التطبيق على الإصدار الجديد…',progress:100,detail:'اكتمل تثبيت جميع الملفات'});
      setTimeout(()=>location.reload(),650)
    });
    await checkForAppUpdate();
    setInterval(()=>checkForAppUpdate(),30*60*1000);
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')checkForAppUpdate()});
    window.addEventListener('online',()=>checkForAppUpdate())
  }catch{}
}

function renderInstallNote(){const isIOS=/iphone|ipad|ipod/i.test(navigator.userAgent),standalone=window.matchMedia('(display-mode: standalone)').matches||navigator.standalone;$('#installNote').style.display=isIOS&&!standalone&&!state.ui.dismissedInstall?'block':'none'}

document.addEventListener('click',e=>{const nav=e.target.closest('[data-nav]');if(nav)showView(nav.dataset.nav);if(e.target.matches('[data-close]'))e.target.closest('dialog').close();if(e.target.matches('[data-mark-all]'))markAllAttendance(e.target.dataset.markAll);if(e.target.matches('[data-clear-attendance]'))clearAttendanceDay()});
$('#dashAddAssessment').onclick=()=>{showView('assessments');openAssessmentModal()};$('#dashAddStudent').onclick=()=>{showView('assessments');addStudent()};$('#addAssessmentBtn').onclick=()=>openAssessmentModal();$('#editAssessmentBtn').onclick=()=>openAssessmentModal(currentClass().selectedAssessmentId);$('#deleteAssessmentBtn').onclick=deleteAssessment;$('#saveAssessmentBtn').onclick=saveAssessment;$('#assessmentRepeatToggle').onchange=renderAssessmentRepeatInfo;
$('#assessmentMonthFilter').onchange=e=>{state.ui.assessmentMonth=e.target.value;renderAssessments();queueSave()};
$('#assessmentArchiveSearch')?.addEventListener('input',e=>{assessmentArchiveSearchTerm=e.target.value;renderAssessments()});
$$('[data-assessment-period]').forEach(b=>b.onclick=()=>{
  const current=assessmentArchiveCurrentMonth(),previous=assessmentArchivePreviousMonth();
  state.ui.assessmentMonth=b.dataset.assessmentPeriod==='current'?current:b.dataset.assessmentPeriod==='previous'?previous:'all';
  renderAssessments();queueSave()
});
$('#assessmentArchiveCollapseBtn')?.addEventListener('click',()=>{
  const groups=$('[data-assessment-month-group]'),shouldOpen=groups.length&&groups.every(x=>!x.open);
  groups.forEach(x=>{x.open=!!shouldOpen});
  const btn=$('#assessmentArchiveCollapseBtn');if(btn)btn.textContent=shouldOpen?'طي الكل':'فتح الكل'
});
$('#studentSearch').oninput=e=>{searchTerm=e.target.value;renderAssessments()};$('#addStudentBtn').onclick=addStudent;$('#assessmentAddStudentBtn').onclick=addStudent;$('#manageStudentsBtn').onclick=openStudents;$('#manageStudentsBtnTop').onclick=openStudents;$('#studentsAddBtn').onclick=()=>{addStudent();renderStudentsModal()};$('#studentsImportBtn').onclick=()=>$('#csvInput').click();$('#importBtn').onclick=()=>$('#csvInput').click();$('#csvInput').onchange=e=>{if(e.target.files[0])importCSV(e.target.files[0]);e.target.value=''};$('#exportCsvBtn').onclick=exportCurrentClassCSV;
$('#dashboardImportStudentsBtn')?.addEventListener('click',()=>$('#csvInput').click());
$('#manageClassesBtn').onclick=openClasses;$('#addClassBtn').onclick=addClass;$('#backupBtn').onclick=backup;$('#restoreBtn').onclick=()=>$('#restoreInput').click();$('#restoreInput').onchange=e=>{if(e.target.files[0])restore(e.target.files[0]);e.target.value=''};$('#recoveryScanBtn').onclick=scanAndRecoverAttendance;$('#dbDiagnosticBtn').onclick=runAttendanceDatabaseDiagnostic;$('#attendanceReferenceCsvBtn').onclick=()=>$('#attendanceReferenceCsvInput').click();$('#attendanceReferenceCsvInput').onchange=e=>{if(e.target.files[0])loadAttendanceReferenceCsv(e.target.files[0]);e.target.value=''};$('#attendanceDiagnosticClass').onchange=()=>{renderAttendanceReferenceSummary();renderAttendanceDiagnosticRows()};$('#diagnosticOnlyDifferences').onchange=renderAttendanceDiagnosticRows;$('#attendanceRecoveryFileBtn').onclick=()=>$('#attendanceRecoveryInput').click();$('#attendanceRecoveryInput').onchange=e=>{if(e.target.files[0])restoreAttendanceOnly(e.target.files[0]);e.target.value=''};$('#attendanceDate').onchange=renderAttendance;$('#printAttendanceReportBtn')?.addEventListener('click',printAttendanceReport);
$('#addScheduleBtn').onclick=()=>openScheduleCreateModal(false);$('#scheduleCellEntryBtn').onclick=()=>setScheduleEntryMode('cell');$('#scheduleDistributionModeBtn').onclick=()=>setScheduleEntryMode('distribution');$('#scheduleSingleEditBtn').onclick=()=>setScheduleEntryMode('single');$('#scheduleClearSelectionBtn').onclick=clearScheduleEntrySelection;$('#scheduleSaveDistributionBtn').onclick=saveScheduleDistribution;$('#scheduleNextClassBtn').onclick=nextScheduleEntryClass;$('#duplicateScheduleBtn').onclick=()=>openScheduleCreateModal(true);$('#activateScheduleBtn').onclick=setActiveTeacherSchedule;$('#archiveScheduleBtn').onclick=toggleArchiveTeacherSchedule;$('#deleteScheduleBtn').onclick=deleteTeacherSchedule;$('#newScheduleMode').onchange=scheduleCreateModeChanged;$('#newScheduleSemester').onchange=()=>{const cfg=scheduleTermConfig($('#newScheduleSemester').value);$('#newScheduleStart').value=cfg?.start||'';$('#newScheduleEnd').value=cfg?.end||''};$('#saveNewScheduleBtn').onclick=saveNewTeacherSchedule;$('#scheduleCellPickerClose').onclick=closeScheduleCellPicker;$('#scheduleCellPicker').addEventListener('click',e=>{if(e.target.id==='scheduleCellPicker')closeScheduleCellPicker()});$('#scheduleCellPickerClear').onclick=clearScheduleCell;$('#scheduleCellPickerDetails').onclick=()=>openScheduleCellDetails();$('#scheduleCellPickerStandby').onclick=()=>openScheduleCellDetails('standby');$('#addSupervisionBtn').onclick=()=>openSupervision();$('#printScheduleBtn').onclick=printTeacherSchedule;$('#saveScheduleSlotBtn').onclick=saveScheduleSlot;$('#saveSupervisionBtn').onclick=saveSupervision;$('#deleteSupervisionBtn').onclick=deleteSupervision;
$('#reportPeriod').onchange=e=>{state.ui.reportPeriod=e.target.value;renderReports();queueSave()};
$$('[data-report-open]').forEach(b=>b.onclick=()=>setReportTab(b.dataset.reportOpen));
$$('[data-report-back]').forEach(b=>b.onclick=()=>showReportsHub());
$$('[data-preview-toggle]').forEach(b=>b.onclick=()=>toggleReportPreview(b.dataset.previewToggle));
$('#reportStudentSearch').oninput=e=>{reportStudentSearchTerm=e.target.value;renderReports()};
$('#gradeAlertThreshold').onchange=e=>{state.settings.gradeAlertThreshold=Math.max(0,Math.min(100,Number(e.target.value)||60));renderReports();queueSave()};
$('#absenceAlertThreshold').onchange=e=>{state.settings.absenceAlertThreshold=Math.max(1,Number(e.target.value)||3);renderReports();queueSave()};
$('#printClassReportBtn').onclick=printClassReport;
$('#saveStudentNotesBtn').onclick=saveStudentNotes;
$('#printStudentBtn').onclick=printStudent;
$('#dismissInstall').onclick=()=>{state.ui.dismissedInstall=true;renderInstallNote();queueSave()};
$('#schoolAlertBtn')?.addEventListener('click',toggleSchoolAlerts);
window.addEventListener('beforeprint',()=>{if(printSessionActive)printMediaEntered=true});
window.addEventListener('afterprint',()=>{if(printSessionActive)cleanupPrintSession()});
document.addEventListener('visibilitychange',()=>{
  if(!printSessionActive)return;
  if(document.visibilityState==='hidden')printSessionSawHidden=true;
  else if(document.visibilityState==='visible'&&printSessionSawHidden)setTimeout(()=>{if(printSessionActive)cleanupPrintSession()},250)
});
window.addEventListener('pageshow',()=>{if(printSessionActive&&printSessionSawHidden)setTimeout(()=>{if(printSessionActive)cleanupPrintSession()},250)});
window.addEventListener('focus',()=>{if(printSessionActive&&(printSessionSawHidden||printMediaEntered)&&Date.now()-printSessionStartedAt>800)setTimeout(()=>{if(printSessionActive)cleanupPrintSession()},300)});
try{
  const printMq=window.matchMedia?.('print');
  const onPrintMediaChange=e=>{if(!printSessionActive)return;if(e.matches)printMediaEntered=true;else if(printMediaEntered)setTimeout(()=>{if(printSessionActive)cleanupPrintSession()},150)};
  if(printMq?.addEventListener)printMq.addEventListener('change',onPrintMediaChange);else if(printMq?.addListener)printMq.addListener(onPrintMediaChange)
}catch{}
$('#checkUpdateBtn')?.addEventListener('click',()=>checkForAppUpdate({manual:true}));
load().then(()=>startSchoolDayTicker());
initAppUpdater();
