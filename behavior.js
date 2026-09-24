'use strict';

const BEHAVIOR_RULE_EDITION='الإصدار الخامس 1447هـ – 2025م';
const BEHAVIOR_DEDUCTION={1:1,2:2,3:3,4:10,5:15};
let behaviorEditingId=null,behaviorSearchTerm='',behaviorStudentFilter='all',behaviorDegreeFilter='all',behaviorModuleReady=false;

const BEHAVIOR_CATALOG={
  elementary:[
    {code:'E1-01',degree:1,label:'عدم التقيد بالزي المدرسي المعتمد'},
    {code:'E1-02',degree:1,label:'التأخر الصباحي'},
    {code:'E1-03',degree:1,label:'عدم حضور الاصطفاف الصباحي مع وجود الطالب في المدرسة'},
    {code:'E1-04',degree:1,label:'التأخر عن الاصطفاف أو العبث أثناءه'},
    {code:'E1-05',degree:1,label:'التأخر في دخول الحصة'},
    {code:'E1-06',degree:1,label:'الأكل أو الشرب داخل الحصة دون إذن'},
    {code:'E1-07',degree:1,label:'النوم داخل الفصل'},
    {code:'E1-08',degree:1,label:'تكرار الخروج أو الدخول من بوابة المدرسة دون مسوغ'},
    {code:'E1-09',degree:1,label:'التجمع عند بوابة المدرسة بما يخل بالانضباط'},

    {code:'E2-01',degree:2,label:'عدم حضور الحصة أو الهروب منها'},
    {code:'E2-02',degree:2,label:'الدخول إلى الفصل أو الخروج منه دون إذن'},
    {code:'E2-03',degree:2,label:'دخول فصل آخر دون إذن'},
    {code:'E2-04',degree:2,label:'إثارة الفوضى داخل الفصل أو المدرسة أو وسيلة النقل'},
    {code:'E2-05',degree:2,label:'الشجار أو المضاربة الجماعية'},
    {code:'E2-06',degree:2,label:'إشارة أو حركة غير لائقة تجاه طالب آخر'},
    {code:'E2-07',degree:2,label:'الإساءة اللفظية أو التهديد أو السخرية من طالب'},
    {code:'E2-08',degree:2,label:'إتلاف ممتلكات طالب آخر عمدًا'},
    {code:'E2-09',degree:2,label:'العبث بتجهيزات المدرسة أو مبانيها أو الكتابة عليها'},
    {code:'E2-10',degree:2,label:'عدم احترام الكتب الدراسية أو العبث بها'},

    {code:'E3-01',degree:3,label:'الإتلاف المتعمد لتجهيزات المدرسة أو مبانيها'},
    {code:'E3-02',degree:3,label:'السرقة'},
    {code:'E3-03',degree:3,label:'الاعتداء بالضرب على طالب'},
    {code:'E3-04',degree:3,label:'تصوير الطلاب أو التسجيل الصوتي لهم دون مسوغ'},
    {code:'E3-05',degree:3,label:'الهروب من المدرسة'},
    {code:'E3-06',degree:3,label:'تزوير توقيع ولي الأمر'},
    {code:'E3-07',degree:3,label:'إحضار أو استخدام مواد أو أدوات خطرة'},

    {code:'E4-01',degree:4,label:'الإساءة أو الاستهزاء بشيء من شعائر الإسلام',urgent:true},
    {code:'E4-02',degree:4,label:'الإساءة للدولة أو رموزها',urgent:true},
    {code:'E4-03',degree:4,label:'التحرش الجنسي',urgent:true},
    {code:'E4-04',degree:4,label:'إشعال النار داخل المدرسة',urgent:true},
    {code:'E4-05',degree:4,label:'حيازة السجائر أو التدخين داخل المدرسة'},
    {code:'E4-06',degree:4,label:'حيازة أداة حادة أو سلاح وما في حكمه',urgent:true},
    {code:'E4-07',degree:4,label:'ارتكاب جريمة معلوماتية',urgent:true},
    {code:'E4-08',degree:4,label:'التنمر بجميع أشكاله'},
    {code:'E4-09',degree:4,label:'حيازة أو عرض مواد إعلامية محظورة'}
  ],
  secondary:[
    {code:'M1-01',degree:1,label:'التأخر الصباحي'},
    {code:'M1-02',degree:1,label:'عدم حضور الاصطفاف الصباحي مع وجود الطالب في المدرسة'},
    {code:'M1-03',degree:1,label:'التأخر عن الاصطفاف أو العبث أثناءه'},
    {code:'M1-04',degree:1,label:'التأخر في دخول الحصة'},
    {code:'M1-05',degree:1,label:'إعاقة سير الحصة بالحديث الجانبي أو المقاطعة المتكررة أو الأكل والشرب'},
    {code:'M1-06',degree:1,label:'النوم داخل الفصل'},
    {code:'M1-07',degree:1,label:'تكرار الخروج أو الدخول من بوابة المدرسة دون مسوغ'},
    {code:'M1-08',degree:1,label:'التجمع عند بوابة المدرسة بما يخل بالانضباط'},

    {code:'M2-01',degree:2,label:'عدم حضور الحصة أو الهروب منها'},
    {code:'M2-02',degree:2,label:'الدخول إلى الفصل أو الخروج منه دون إذن'},
    {code:'M2-03',degree:2,label:'دخول فصل آخر دون إذن'},
    {code:'M2-04',degree:2,label:'إثارة الفوضى داخل الفصل أو المدرسة أو وسيلة النقل'},

    {code:'M3-01',degree:3,label:'عدم التقيد بالزي المدرسي المعتمد'},
    {code:'M3-02',degree:3,label:'الشجار أو المضاربة الجماعية'},
    {code:'M3-03',degree:3,label:'إشارة أو حركة غير لائقة تجاه طالب'},
    {code:'M3-04',degree:3,label:'الإساءة اللفظية أو التهديد أو السخرية من طالب'},
    {code:'M3-05',degree:3,label:'إتلاف ممتلكات طالب آخر عمدًا'},
    {code:'M3-06',degree:3,label:'العبث بتجهيزات المدرسة أو مبانيها أو الكتابة عليها'},
    {code:'M3-07',degree:3,label:'إحضار مواد أو أدوات خطرة دون استخدامها'},
    {code:'M3-08',degree:3,label:'حيازة السجائر'},
    {code:'M3-09',degree:3,label:'حيازة مواد إعلامية محظورة'},
    {code:'M3-10',degree:3,label:'تزوير توقيع ولي الأمر'},
    {code:'M3-11',degree:3,label:'عدم احترام الكتب الدراسية أو العبث بها'},

    {code:'M4-01',degree:4,label:'تعمد إصابة طالب بالضرب أو بأداة بما ينتج عنه إصابة',urgent:true},
    {code:'M4-02',degree:4,label:'سرقة ممتلكات طالب أو ممتلكات المدرسة'},
    {code:'M4-03',degree:4,label:'تصوير الطلاب أو التسجيل الصوتي لهم دون مسوغ'},
    {code:'M4-04',degree:4,label:'الإتلاف المتعمد لتجهيزات المدرسة أو مبانيها'},
    {code:'M4-05',degree:4,label:'التدخين داخل المدرسة'},
    {code:'M4-06',degree:4,label:'الهروب من المدرسة'},
    {code:'M4-07',degree:4,label:'إحضار أو استخدام مواد أو أدوات خطرة',urgent:true},
    {code:'M4-08',degree:4,label:'عرض أو توزيع مواد إعلامية محظورة'},
    {code:'M4-S1',degree:4,label:'تهديد أحد منسوبي المدرسة أو الإساءة اللفظية إليه',urgent:true,staff:true},
    {code:'M4-S2',degree:4,label:'السخرية من أحد منسوبي المدرسة أو الاستهزاء به',staff:true},
    {code:'M4-S3',degree:4,label:'تزوير توقيع أحد منسوبي المدرسة',staff:true},
    {code:'M4-S4',degree:4,label:'تصوير أحد منسوبي المدرسة أو التسجيل له دون إذن صريح',staff:true},

    {code:'M5-01',degree:5,label:'الإساءة أو الاستهزاء بشيء من شعائر الإسلام',urgent:true},
    {code:'M5-02',degree:5,label:'الإساءة للدولة أو رموزها',urgent:true},
    {code:'M5-03',degree:5,label:'نشر أفكار متطرفة أو تكفيرية أو إلحادية أو ما يضر بالقيم العامة',urgent:true},
    {code:'M5-04',degree:5,label:'الإساءة للأديان أو إثارة العنصرية أو النعرات القبلية أو الطائفية',urgent:true},
    {code:'M5-05',degree:5,label:'تزوير أو إساءة استخدام الوثائق أو الأختام الرسمية',urgent:true},
    {code:'M5-06',degree:5,label:'التحرش الجنسي',urgent:true},
    {code:'M5-07',degree:5,label:'إشعال النار داخل المدرسة',urgent:true},
    {code:'M5-08',degree:5,label:'حيازة أو استخدام أو التهديد بسلاح أو أداة خطرة',urgent:true},
    {code:'M5-09',degree:5,label:'حيازة أو استخدام أو ترويج المخدرات أو المسكرات',urgent:true},
    {code:'M5-10',degree:5,label:'ارتكاب جريمة معلوماتية',urgent:true},
    {code:'M5-11',degree:5,label:'ابتزاز أحد الطلاب',urgent:true},
    {code:'M5-12',degree:5,label:'التنمر بجميع أشكاله'},
    {code:'M5-S1',degree:5,label:'إتلاف أو سرقة ممتلكات أحد منسوبي المدرسة',urgent:true,staff:true},
    {code:'M5-S2',degree:5,label:'إشارة أو حركة غير لائقة تجاه أحد منسوبي المدرسة',urgent:true,staff:true},
    {code:'M5-S3',degree:5,label:'الاعتداء الجسدي على أحد منسوبي المدرسة',urgent:true,staff:true},
    {code:'M5-S4',degree:5,label:'ابتزاز أحد منسوبي المدرسة أو ارتكاب جريمة معلوماتية بحقه',urgent:true,staff:true}
  ]
};

function behaviorPhase(c=currentClass()){
  const g=String(c?.grade||'');
  return /ابتدائ/.test(g)?'elementary':'secondary'
}
function behaviorCatalog(c=currentClass()){return BEHAVIOR_CATALOG[behaviorPhase(c)]||BEHAVIOR_CATALOG.secondary}
function behaviorRuleByCode(code,c=currentClass()){return behaviorCatalog(c).find(x=>x.code===code)||Object.values(BEHAVIOR_CATALOG).flat().find(x=>x.code===code)||null}
function behaviorDegreeLabel(n){return ({1:'الأولى',2:'الثانية',3:'الثالثة',4:'الرابعة',5:'الخامسة'})[Number(n)]||'—'}
function behaviorOccurrenceLabel(n){
  const words={1:'الأولى',2:'الثانية',3:'الثالثة',4:'الرابعة',5:'الخامسة',6:'السادسة',7:'السابعة',8:'الثامنة',9:'التاسعة',10:'العاشرة'};
  return words[Number(n)]||('رقم '+arabicNum(n))
}
function behaviorPreviousTimesText(n){
  n=Number(n)||0;if(n===0)return 'لم يسبق تسجيل هذه المخالفة على الطالب قبل هذه الواقعة.';
  if(n===1)return 'سبق تسجيل هذه المخالفة مرة واحدة قبل هذه الواقعة.';
  if(n===2)return 'سبق تسجيل هذه المخالفة مرتين قبل هذه الواقعة.';
  return 'سبق تسجيل هذه المخالفة '+arabicNum(n)+' مرات قبل هذه الواقعة.'
}
function behaviorRoleHint(rule){
  if(!rule)return '';
  if(rule.urgent)return 'واقعة عالية الخطورة: سلّمها فورًا لإدارة المدرسة واتبع إجراءات السلامة والحماية المعتمدة بحسب طبيعة الواقعة.';
  if(rule.degree===1)return 'الدرجة الأولى: ينفذ المعلم الإجراءات الأولية المقررة، ثم يرفعها للإدارة عند عدم الاستجابة أو استمرار التكرار.';
  return 'الدرجة الثانية فأعلى: يرصد المعلم الواقعة ويسلمها لإدارة المدرسة لاستكمال الإجراءات النظامية.'
}
function behaviorStudentName(id,c=currentClass()){return c?.students?.find(s=>s.id===id)?.name||'طالب غير موجود'}
function behaviorRecordRule(r,c=currentClass()){return behaviorRuleByCode(r.violationCode,c)||{code:r.violationCode||'',degree:r.degree||'',label:r.violationLabel||'مخالفة سلوكية',urgent:!!r.urgent}}
function behaviorRecordCountForStudentRule(studentId,code,c=currentClass(),excludeId=''){
  return (c?.behaviorRecords||[]).filter(r=>r.id!==excludeId&&r.studentId===studentId&&r.violationCode===code).length
}
function behaviorOrderKey(r={}){
  const date=String(r.date||'9999-12-31'),period=String(Number(r.period)||99).padStart(2,'0'),created=String(r.createdAt||'');
  return `${date}|${period}|${created}|${String(r.id||'')}`
}
function behaviorOccurrenceInfo({studentId='',code='',date='',period='',editingId=''}={},c=currentClass()){
  const records=(c?.behaviorRecords||[]),existing=editingId?records.find(r=>r.id===editingId):null;
  if(!studentId||!code)return {ordinal:1,prior:[],sameTotal:0,studentTotal:0};
  const sameOthers=records.filter(r=>r.id!==editingId&&r.studentId===studentId&&r.violationCode===code);
  const candidate={
    id:editingId||'__new__',studentId,violationCode:code,date:date||localDateISO(),period:Number(period)||'',
    createdAt:existing?.createdAt||new Date().toISOString()
  };
  const ordered=[...sameOthers,candidate].sort((x,y)=>behaviorOrderKey(x).localeCompare(behaviorOrderKey(y)));
  const pos=Math.max(0,ordered.findIndex(r=>r===candidate));
  const prior=ordered.slice(0,pos);
  const studentExisting=records.filter(r=>r.studentId===studentId&&r.id!==editingId).length;
  return {ordinal:pos+1,prior,sameTotal:ordered.length,studentTotal:studentExisting+1}
}
function behaviorRecordOccurrenceOrdinal(record,c=currentClass()){
  if(!record)return 1;
  return behaviorOccurrenceInfo({studentId:record.studentId,code:record.violationCode,date:record.date,period:record.period,editingId:record.id},c).ordinal
}
function behaviorNowPeriod(){
  try{return schoolDaySnapshot(new Date()).current?.period||''}catch{return ''}
}
function behaviorEsc(v){return escapeHtml(v??'')}
function behaviorRecordDateLabel(v){return v?formatDate(v):'بدون تاريخ'}
function behaviorAudience(){return typeof schoolAudience==='function'?schoolAudience():{key:'boys',girls:false,type:'بنين',student:'الطالب',studentBare:'طالب',students:'الطلاب',teacher:'المعلم',subjectTeacher:'معلم المادة',principal:'مدير المدرسة',counselor:'الموجه الطلابي',deputyStudents:'وكيل شؤون الطلبة',educationalDeputy:'وكيل الشؤون التعليمية',recipient:'المكرم',honorific:'حفظه الله',shownAbove:'الموضح أعلاه',statePronoun:'حالته',owner:'صاحب'}}
function behaviorReferralTargets(){
  const g=behaviorAudience();
  return [g.educationalDeputy,g.deputyStudents,g.principal,'إدارة المدرسة']
}
function behaviorReferralTargetForAudience(raw=''){
  const g=behaviorAudience(),s=String(raw||'');
  if(/الشؤون التعليمية/.test(s))return g.educationalDeputy;
  if(/شؤون (الطلبة|الطالبات)/.test(s))return g.deputyStudents;
  if(/مدير|مديرة/.test(s))return g.principal;
  if(/إدارة المدرسة/.test(s))return 'إدارة المدرسة';
  return s||g.educationalDeputy
}

function behaviorSuggestedPeriodForAttendance(c,date){
  if(!c||!date)return '';
  try{
    const d=new Date(date+'T12:00:00'),day=AR_DAY_BY_JS[d.getDay()],schedule=scheduleForDate(date);
    const slots=scheduledSlotsForClass(c,schedule).filter(x=>x.day===day);
    if(date===localDateISO()){
      const snap=schoolDaySnapshot(new Date());
      if(snap.current&&slots.some(x=>Number(x.period)===Number(snap.current.period)))return snap.current.period
    }
    return slots.length===1?slots[0].period:''
  }catch{return ''}
}
function openBehaviorFromAttendance(studentId,date=''){
  const c=currentClass();if(!c)return;
  const selectedDate=date||$('#attendanceDate')?.value||localDateISO();
  const period=behaviorSuggestedPeriodForAttendance(c,selectedDate);
  openBehaviorModal('',{studentId,date:selectedDate,period,source:'attendance'})
}

function renderBehavior(){
  const view=$('#view-behavior');if(!view)return;
  const c=currentClass();if(!c)return;
  c.behaviorRecords ||= [];
  const heading=$('#behaviorHeading');if(heading)heading.textContent='رصد المخالفات السلوكية — '+c.name;

  const studentFilter=$('#behaviorStudentFilter');
  if(studentFilter){
    const old=behaviorStudentFilter;
    studentFilter.innerHTML='<option value="all">كل الطلاب</option>'+c.students.map(s=>`<option value="${behaviorEsc(s.id)}">${behaviorEsc(s.name)}</option>`).join('');
    behaviorStudentFilter=c.students.some(s=>s.id===old)?old:'all';studentFilter.value=behaviorStudentFilter
  }
  const degreeFilter=$('#behaviorDegreeFilter');if(degreeFilter)degreeFilter.value=behaviorDegreeFilter;

  const records=(c.behaviorRecords||[]).slice().sort((x,y)=>String(y.date||'').localeCompare(String(x.date||''))||String(y.createdAt||'').localeCompare(String(x.createdAt||'')));
  const today=localDateISO(),todayCount=records.filter(r=>r.date===today).length,referred=records.filter(r=>r.referred).length,high=records.filter(r=>Number(r.degree)>=4||r.urgent).length;
  const k=$('#behaviorKpis');if(k)k.innerHTML=`
    <div><span>إجمالي الرصد</span><b>${arabicNum(records.length)}</b></div>
    <div><span>اليوم</span><b>${arabicNum(todayCount)}</b></div>
    <div class="referred"><span>محال للإدارة</span><b>${arabicNum(referred)}</b></div>
    <div class="risk"><span>درجة رابعة فأعلى</span><b>${arabicNum(high)}</b></div>`;

  const q=studentNameKey(behaviorSearchTerm||'');
  const filtered=records.filter(r=>{
    if(behaviorStudentFilter!=='all'&&r.studentId!==behaviorStudentFilter)return false;
    if(behaviorDegreeFilter!=='all'&&String(r.degree)!==behaviorDegreeFilter)return false;
    if(q){
      const hay=studentNameKey([behaviorStudentName(r.studentId,c),r.violationLabel,r.actionTaken,r.notes,r.referralTarget].filter(Boolean).join(' '));
      if(!hay.includes(q))return false
    }
    return true
  });
  const list=$('#behaviorList');if(!list)return;
  list.innerHTML=filtered.length?filtered.map(r=>behaviorRecordMarkup(r,c)).join(''):`<div class="empty-state"><b>${records.length?'لا توجد نتائج مطابقة':'لا توجد مخالفات مسجلة'}</b>${records.length?'غيّر عوامل التصفية أو البحث.':'استخدم «رصد مخالفة» لتوثيق واقعة عند الحاجة.'}</div>`;
}
function behaviorRecordMarkup(r,c){
  const rule=behaviorRecordRule(r,c),student=behaviorStudentName(r.studentId,c),danger=Number(r.degree)>=4||rule.urgent;
  return `<article class="behavior-record ${danger?'high-risk':''}" data-behavior-record="${behaviorEsc(r.id)}">
    <div class="behavior-record-main">
      <div class="behavior-record-title"><span class="behavior-degree degree-${Number(r.degree)||1}">الدرجة ${behaviorDegreeLabel(r.degree)}</span>${r.referred?'<span class="behavior-referred-tag">محال</span>':''}<b>${behaviorEsc(student)}</b></div>
      <h3>${behaviorEsc(r.violationLabel||rule.label)}</h3>
      <div class="behavior-record-meta"><span>${behaviorEsc(behaviorRecordDateLabel(r.date))}</span><span>${r.period?'الحصة '+arabicNum(r.period):'الحصة غير محددة'}</span><span>التكرار: المرة ${behaviorOccurrenceLabel(behaviorRecordOccurrenceOrdinal(r,c))}</span><span>الحسم المرجعي: ${arabicNum(r.deduction??BEHAVIOR_DEDUCTION[r.degree]??0)} درجة</span></div>
      ${r.actionTaken?`<p><b>الإجراء:</b> ${behaviorEsc(r.actionTaken)} · <b>الاستجابة:</b> ${behaviorEsc(r.response||'—')}</p>`:''}
      ${r.referred?`<p class="behavior-referral-line"><b>الإحالة الداخلية:</b> ${behaviorEsc(r.referralTarget||'إدارة المدرسة')}</p>`:''}
    </div>
    <div class="behavior-record-actions no-print">
      <button class="btn tiny" data-behavior-edit="${behaviorEsc(r.id)}">تعديل</button>
      <button class="btn tiny" data-behavior-teacher-form="${behaviorEsc(r.id)}">رصد المعلم</button>
      <button class="btn tiny" data-behavior-internal-referral="${behaviorEsc(r.id)}">إحالة داخلية</button>
      <button class="btn tiny primary" data-behavior-official-referral="${behaviorEsc(r.id)}">سري — إحالة</button>
    </div>
  </article>`
}

function behaviorViolationOptions(c=currentClass(),selected=''){
  const grouped=new Map();
  behaviorCatalog(c).forEach(r=>{if(!grouped.has(r.degree))grouped.set(r.degree,[]);grouped.get(r.degree).push(r)});
  return [...grouped.entries()].sort((x,y)=>x[0]-y[0]).map(([degree,items])=>`<optgroup label="الدرجة ${behaviorDegreeLabel(degree)} — حسم ${arabicNum(BEHAVIOR_DEDUCTION[degree])}">${items.map(r=>`<option value="${r.code}" ${r.code===selected?'selected':''}>${behaviorEsc(r.label)}</option>`).join('')}</optgroup>`).join('')
}
function renderBehaviorRulePreview(){
  const select=$('#behaviorViolation'),box=$('#behaviorRulePreview');if(!select||!box)return;
  const rule=behaviorRuleByCode(select.value,currentClass());if(!rule){box.innerHTML='';return}
  box.className='behavior-rule-preview span2 '+(rule.urgent?'urgent':'');
  box.innerHTML=`<div><span>درجة المخالفة</span><b>${behaviorDegreeLabel(rule.degree)}</b></div><div><span>الحسم النظامي</span><b>${arabicNum(BEHAVIOR_DEDUCTION[rule.degree])} درجة</b></div><p>${behaviorEsc(behaviorRoleHint(rule))}</p>`;
  renderBehaviorRecurrenceInfo()
}
function renderBehaviorRecurrenceInfo(){
  const c=currentClass(),studentId=$('#behaviorStudent')?.value||'',code=$('#behaviorViolation')?.value||'',date=$('#behaviorDate')?.value||localDateISO(),period=$('#behaviorPeriod')?.value||'';
  const info=behaviorOccurrenceInfo({studentId,code,date,period,editingId:behaviorEditingId||''},c);
  const occurrence=$('#behaviorOccurrenceOrdinal'),hint=$('#behaviorOccurrenceHint'),total=$('#behaviorStudentViolationTotal'),count=$('#behaviorHistoryCount'),list=$('#behaviorHistoryList'),hidden=$('#behaviorRecurrence');
  if(hidden)hidden.value=String(info.ordinal);
  if(occurrence)occurrence.textContent='المرة '+behaviorOccurrenceLabel(info.ordinal);
  if(hint)hint.textContent=behaviorPreviousTimesText(info.prior.length);
  if(total)total.textContent=arabicNum(info.studentTotal);
  if(count)count.textContent=arabicNum(info.prior.length);
  if(list){
    list.innerHTML=info.prior.length?info.prior.slice().reverse().map((r,i)=>{
      const rule=behaviorRecordRule(r,c),order=behaviorRecordOccurrenceOrdinal(r,c);
      return `<article class="behavior-history-row"><span class="behavior-history-order">المرة ${behaviorOccurrenceLabel(order)}</span><div><b>${behaviorEsc(rule.label||r.violationLabel||'مخالفة سلوكية')}</b><small>${behaviorEsc(behaviorRecordDateLabel(r.date))} · ${r.period?'الحصة '+arabicNum(r.period):'الحصة غير محددة'}${r.response?' · '+behaviorEsc(r.response):''}</small></div></article>`
    }).join(''):'<div class="behavior-history-empty">لا توجد سوابق لهذه المخالفة.</div>'
  }
}
function openBehaviorModal(id='',prefill={}){
  const c=currentClass(),dlg=$('#behaviorModal');if(!c||!dlg)return;
  if(id&&typeof id==='object'){prefill=id;id=''}
  c.behaviorRecords ||= [];
  behaviorEditingId=id||null;
  const record=id?c.behaviorRecords.find(r=>r.id===id):null;
  const requestedStudent=!record&&prefill?.studentId&&c.students.some(s=>s.id===prefill.studentId)?prefill.studentId:'';
  const requestedDate=!record&&prefill?.date?prefill.date:'';
  const requestedPeriod=!record&&prefill?.period?prefill.period:'';
  $('#behaviorModalTitle').textContent=record?'تعديل رصد مخالفة':'رصد مخالفة سلوكية';
  $('#behaviorStudent').innerHTML=c.students.length?c.students.map(s=>`<option value="${behaviorEsc(s.id)}">${behaviorEsc(s.name)}</option>`).join(''):'<option value="">لا يوجد طلاب</option>';
  $('#behaviorStudent').value=record?.studentId||requestedStudent||c.students[0]?.id||'';
  $('#behaviorDate').value=record?.date||requestedDate||localDateISO();
  $('#behaviorPeriod').value=String(record?.period||requestedPeriod||(prefill?.source==='attendance'?'':behaviorNowPeriod())||'');
  $('#behaviorViolation').innerHTML=behaviorViolationOptions(c,record?.violationCode||'');
  if(record?.violationCode)$('#behaviorViolation').value=record.violationCode;
  $('#behaviorAction').value=record?.actionTaken||'';
  $('#behaviorResponse').value=record?.response||'استجاب';
  $('#behaviorNotes').value=record?.notes||'';
  $('#behaviorReferred').checked=!!record?.referred;
  const referralSelect=$('#behaviorReferralTarget');if(referralSelect){const selected=behaviorReferralTargetForAudience(record?.referralTarget||'');referralSelect.innerHTML=behaviorReferralTargets().map(x=>`<option>${behaviorEsc(x)}</option>`).join('');referralSelect.value=selected}

  $('#behaviorReferralTargetWrap').hidden=!$('#behaviorReferred').checked;
  $('#deleteBehaviorBtn').hidden=!record;
  const autoContext=$('#behaviorAutoContext');
  if(autoContext){
    const fromAttendance=!record&&prefill?.source==='attendance';
    autoContext.hidden=!fromAttendance;
    if(fromAttendance)autoContext.innerHTML=requestedPeriod
      ?`<b>تم التحديد من شاشة الحضور</b><span>${behaviorAudience().student} والتاريخ والحصة ${arabicNum(requestedPeriod)} محددة تلقائيًا. يمكنك تغيير التاريخ أو الحصة قبل الحفظ.</span>`
      :`<b>تم التحديد من شاشة الحضور</b><span>تم تحديد ${behaviorAudience().student} والتاريخ تلقائيًا. لم يتم افتراض الحصة لعدم وجود حصة واحدة مؤكدة؛ يمكنك اختيارها يدويًا.</span>`
  }
  renderBehaviorRulePreview();
  if(typeof dlg.showModal==='function')dlg.showModal();else dlg.setAttribute('open','')
}
function saveBehaviorRecord(){
  const c=currentClass();if(!c)return;
  const studentId=$('#behaviorStudent')?.value||'',code=$('#behaviorViolation')?.value||'',rule=behaviorRuleByCode(code,c);
  if(!studentId||!rule){toast('اختر الطالب والمخالفة');return}
  const now=new Date(),existing=behaviorEditingId?c.behaviorRecords.find(r=>r.id===behaviorEditingId):null;
  const recordDate=$('#behaviorDate')?.value||localDateISO(),recordPeriod=Number($('#behaviorPeriod')?.value)||'';
  const occurrence=behaviorOccurrenceInfo({studentId,code:rule.code,date:recordDate,period:recordPeriod,editingId:behaviorEditingId||''},c);
  const rec={
    id:existing?.id||uid(),studentId,
    date:recordDate,
    period:recordPeriod,
    violationCode:rule.code,violationLabel:rule.label,degree:rule.degree,deduction:BEHAVIOR_DEDUCTION[rule.degree]||0,urgent:!!rule.urgent,
    actionTaken:String($('#behaviorAction')?.value||'').trim(),response:$('#behaviorResponse')?.value||'غير مقيم',
    recurrence:occurrence.ordinal,notes:String($('#behaviorNotes')?.value||'').trim(),
    referred:!!$('#behaviorReferred')?.checked,referralTarget:$('#behaviorReferred')?.checked?($('#behaviorReferralTarget')?.value||behaviorAudience().educationalDeputy):'',
    ruleEdition:BEHAVIOR_RULE_EDITION,createdAt:existing?.createdAt||now.toISOString(),updatedAt:now.toISOString()
  };
  if(existing)Object.assign(existing,rec);else c.behaviorRecords.push(rec);
  queueSave();renderBehavior();if(typeof renderAttendance==='function')renderAttendance();$('#behaviorModal')?.close();toast(existing?'تم تحديث الرصد':'تم حفظ الرصد السلوكي')
}
function deleteBehaviorRecord(){
  const c=currentClass(),r=behaviorEditingId?c?.behaviorRecords?.find(x=>x.id===behaviorEditingId):null;if(!c||!r)return;
  if(!confirm('حذف هذا الرصد السلوكي نهائيًا من هذا الجهاز؟'))return;
  c.behaviorRecords=c.behaviorRecords.filter(x=>x.id!==r.id);behaviorEditingId=null;queueSave();renderBehavior();$('#behaviorModal')?.close();toast('تم حذف الرصد')
}

function behaviorPrintBase(){
  const base=new URL('./',location.href).href;
  const g=behaviorAudience();return {base,school:state.appMeta?.school||'اسم المدرسة',region:state.appMeta?.region||'إدارة التعليم',teacher:state.appMeta?.teacher||g.subjectTeacher,year:state.appMeta?.year||'',principal:state.appMeta?.principal||'',audience:g}
}
function behaviorPrintDocument(title,body,{landscape=false,confidential=false}={}){
  const w=window.open('','_blank');if(!w){toast('تعذر فتح نافذة الطباعة. اسمح بالنوافذ المنبثقة للتطبيق.');return}
  const x=behaviorPrintBase();
  w.document.open();w.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><base href="${behaviorEsc(x.base)}"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${behaviorEsc(title)}</title><style>
    @page{size:A4 ${landscape?'landscape':'portrait'};margin:10mm}
    *{box-sizing:border-box}body{font-family:Tahoma,Arial,sans-serif;color:#111;margin:0;background:#fff;font-size:12px;line-height:1.55}.sheet{max-width:100%;margin:auto}.gov-head{display:grid;grid-template-columns:1fr 110px 1fr;gap:12px;align-items:center;border-bottom:2px solid #222;padding-bottom:10px;margin-bottom:12px}.gov-head .right{display:grid;gap:2px}.gov-head img{width:95px;height:70px;object-fit:contain;margin:auto}.gov-head .title{text-align:left}.gov-head h1{font-size:19px;margin:0 0 3px}.confidential{text-align:center;font-size:20px;font-weight:900;border:2px solid #111;padding:5px 12px;margin:0 auto 12px;width:max-content}.meta{display:grid;grid-template-columns:repeat(3,1fr);border:1px solid #333;margin-bottom:10px}.meta>div{padding:7px;border-left:1px solid #777}.meta>div:last-child{border-left:0}.meta span{font-size:10px;color:#444}.meta b{display:block}.intro{font-size:13px;line-height:1.9;margin:14px 0}.box{border:1px solid #333;padding:10px;min-height:70px;margin:10px 0}.box b{display:block;margin-bottom:5px}table{width:100%;border-collapse:collapse;table-layout:fixed}th,td{border:1px solid #333;padding:5px;text-align:center;vertical-align:middle;font-size:9px;overflow-wrap:anywhere}th{background:#f2f2f2;font-weight:800}.signatures{display:grid;grid-template-columns:1fr 1fr;gap:55px;margin-top:24px;text-align:center}.signatures>div{display:grid;gap:8px}.stamp{height:55px}.footnote{margin-top:12px;font-size:9px;color:#555;border-top:1px solid #bbb;padding-top:7px}.screen-actions{position:fixed;bottom:12px;left:12px;display:flex;gap:7px}@media print{.screen-actions{display:none}}button{font:inherit;padding:8px 12px;border:1px solid #555;border-radius:7px;background:#fff}.primary{background:#173f5f;color:#fff}
  </style></head><body><div class="sheet">${confidential?'<div class="confidential">سري</div>':''}<header class="gov-head"><div class="right"><b>المملكة العربية السعودية</b><span>وزارة التعليم</span><span>${behaviorEsc(x.region)}</span><span>${behaviorEsc(x.school)}</span></div><img src="./assets/moe-logo.png" alt=""><div class="title"><h1>${behaviorEsc(title)}</h1><span>${behaviorEsc(x.year)}</span></div></header>${body}<div class="footnote">أُنشئ هذا المستند من سجل المعلم المحلي وفق حقول قواعد السلوك والمواظبة — ${BEHAVIOR_RULE_EDITION}. يجب استكمال التوقيعات والإجراءات من الجهات المخولة.</div></div><div class="screen-actions"><button class="primary" onclick="window.print()">طباعة / حفظ PDF</button><button onclick="window.close()">إغلاق</button></div></body></html>`);
  w.document.close();try{w.focus()}catch{}
}
function printBehaviorSummaryReport(){
  const c=currentClass();if(!c)return;
  const records=(c.behaviorRecords||[]).slice().sort((x,y)=>String(x.date||'').localeCompare(String(y.date||'')));
  if(!records.length){toast('لا توجد سجلات سلوكية لإعداد التقرير');return}
  const total=records.length,referred=records.filter(r=>r.referred).length,high=records.filter(r=>Number(r.degree)>=4||r.urgent).length;
  const byDegree=[1,2,3,4,5].map(d=>[d,records.filter(r=>Number(r.degree)===d).length]).filter(x=>x[1]);
  const rows=records.map((r,i)=>`<tr><td>${arabicNum(i+1)}</td><td>${behaviorEsc(behaviorStudentName(r.studentId,c))}</td><td>${behaviorEsc(r.violationLabel)}</td><td>${behaviorDegreeLabel(r.degree)}</td><td>${behaviorEsc(r.date||'—')}</td><td>${r.period?arabicNum(r.period):'—'}</td><td>${behaviorEsc(r.response||'—')}</td><td>${r.referred?behaviorEsc(r.referralTarget||'إدارة المدرسة'):'—'}</td></tr>`).join('');
  const g=behaviorAudience(),body=`<div class="meta"><div><span>الصف / الفصل</span><b>${behaviorEsc(c.grade||'—')} — ${behaviorEsc(c.name||'—')}</b></div><div><span>المادة</span><b>${behaviorEsc(c.subject||'—')}</b></div><div><span>الفترة</span><b>${behaviorEsc(state.appMeta?.semester||state.appMeta?.year||'—')}</b></div></div>
  <div class="meta"><div><span>إجمالي الرصد</span><b>${arabicNum(total)}</b></div><div><span>المحال للإدارة</span><b>${arabicNum(referred)}</b></div><div><span>درجة رابعة فأعلى</span><b>${arabicNum(high)}</b></div></div>
  <div class="box"><b>التوزيع حسب درجة المشكلة</b>${byDegree.map(([d,n])=>`الدرجة ${behaviorDegreeLabel(d)}: ${arabicNum(n)}`).join(' · ')}</div>
  <table><thead><tr><th style="width:4%">م</th><th style="width:16%">${g.student}</th><th style="width:22%">المشكلة السلوكية</th><th style="width:8%">الدرجة</th><th style="width:11%">التاريخ</th><th style="width:7%">الحصة</th><th style="width:12%">الاستجابة</th><th style="width:20%">الإحالة</th></tr></thead><tbody>${rows}</tbody></table>
  <div class="signatures"><div><span>${g.subjectTeacher}</span><b>${behaviorEsc(state.appMeta?.teacher||'—')}</b><span>التوقيع: __________________</span></div><div><span>${g.principal}</span><b>${behaviorEsc(state.appMeta?.principal||'—')}</b><span>التوقيع: __________________</span></div></div>`;
  behaviorPrintDocument('تقرير السلوك والانضباط',body,{landscape:true})
}

function behaviorTeacherLogRows(records,c){
  return records.map((r,i)=>`<tr><td>${arabicNum(i+1)}</td><td>${behaviorEsc(behaviorStudentName(r.studentId,c))}</td><td>${behaviorEsc(r.violationLabel)}</td><td>${behaviorDegreeLabel(r.degree)}</td><td>${behaviorEsc(r.actionTaken||'—')}</td><td>${behaviorEsc(r.response||'—')}</td><td>${arabicNum(behaviorRecordOccurrenceOrdinal(r,c))}</td><td>${behaviorEsc(r.date||'—')}</td><td>${r.period?arabicNum(r.period):'—'}</td></tr>`).join('')
}
function printBehaviorTeacherLog(recordId=''){
  const c=currentClass();if(!c)return;
  const records=(c.behaviorRecords||[]).filter(r=>!recordId||r.id===recordId).sort((x,y)=>String(x.date||'').localeCompare(String(y.date||'')));
  if(!records.length){toast('لا توجد مخالفات لطباعة النموذج');return}
  const x=behaviorPrintBase(),g=x.audience;
  const body=`<div class="meta"><div><span>المادة</span><b>${behaviorEsc(c.subject||'—')}</b></div><div><span>الصف</span><b>${behaviorEsc(c.grade||'—')}</b></div><div><span>الفصل</span><b>${behaviorEsc(c.name||'—')}</b></div></div>
  <table><thead><tr><th style="width:4%">م</th><th style="width:15%">${g.studentName||('اسم '+g.student)}</th><th style="width:18%">المشكلة السلوكية</th><th style="width:7%">درجة المشكلة</th><th style="width:17%">الإجراء المتخذ</th><th style="width:10%">مدى الاستجابة</th><th style="width:8%">عدد مرات التكرار</th><th style="width:11%">التاريخ</th><th style="width:6%">الحصة</th></tr></thead><tbody>${behaviorTeacherLogRows(records,c)}</tbody></table>
  <div class="signatures"><div><span>${g.teacher}</span><b>${behaviorEsc(x.teacher)}</b><span>التوقيع: __________________</span></div><div><span>التاريخ</span><b>${behaviorEsc(localDateISO())}</b><span>__________________</span></div></div>`;
  behaviorPrintDocument(`نموذج رصد ${g.teacher} لمشكلة سلوكية`,body,{landscape:true})
}
function behaviorRecordById(id,c=currentClass()){return c?.behaviorRecords?.find(r=>r.id===id)||null}
function printBehaviorInternalReferral(id){
  const c=currentClass(),r=behaviorRecordById(id,c);if(!c||!r)return;
  const x=behaviorPrintBase(),g=x.audience,student=behaviorStudentName(r.studentId,c),target=behaviorReferralTargetForAudience(r.referralTarget);
  const body=`<div class="meta"><div><span>${g.student}</span><b>${behaviorEsc(student)}</b></div><div><span>الصف / الفصل</span><b>${behaviorEsc(c.grade)} — ${behaviorEsc(c.name)}</b></div><div><span>التاريخ / الحصة</span><b>${behaviorEsc(r.date)} · ${r.period?'ح '+arabicNum(r.period):'—'}</b></div></div>
  <p class="intro">سعادة/ <b>${behaviorEsc(target)}</b> ${g.honorific}<br>السلام عليكم ورحمة الله وبركاته،<br>أحيل إليكم ${g.student} ${g.shownAbove} بعد رصد المشكلة السلوكية التالية؛ لاستكمال ما يلزم وفق قواعد السلوك والمواظبة والصلاحيات المعتمدة في المدرسة.</p>
  <div class="box"><b>المشكلة السلوكية — الدرجة ${behaviorDegreeLabel(r.degree)}</b>${behaviorEsc(r.violationLabel)}</div>
  <div class="box"><b>إجراء ${g.teacher} ومدى الاستجابة</b>${behaviorEsc(r.actionTaken||'لم يدون إجراء')} — ${behaviorEsc(r.response||'غير مقيم')}</div>
  <div class="box"><b>ملاحظات</b>${behaviorEsc(r.notes||'لا توجد')}</div>
  <div class="signatures"><div><span>${g.teacher}</span><b>${behaviorEsc(x.teacher)}</b><span>التوقيع: __________________</span></div><div><span>المستلم</span><b>${behaviorEsc(target)}</b><span>التوقيع والتاريخ: __________________</span></div></div>`;
  behaviorPrintDocument('إحالة داخلية لمخالفة سلوكية',body,{confidential:true})
}
function printBehaviorOfficialReferral(id){
  const c=currentClass(),r=behaviorRecordById(id,c);if(!c||!r)return;
  const g=behaviorAudience(),student=behaviorStudentName(r.studentId,c);
  const body=`<p class="intro">${g.recipient} <b>${g.counselor}</b> ${g.honorific}<br>السلام عليكم ورحمة الله وبركاته،<br>نحيل إليكم ${g.student} <b>${behaviorEsc(student)}</b> بالصف <b>${behaviorEsc(c.grade)} — ${behaviorEsc(c.name)}</b>، ${g.owner} المشكلة السلوكية من <b>الدرجة ${behaviorDegreeLabel(r.degree)}</b> وهي:</p>
  <div class="box"><b>المشكلة السلوكية</b>${behaviorEsc(r.violationLabel)}</div>
  <p class="intro">يرجى متابعة ${g.student} ودراسة ${g.statePronoun} ووضع الحلول التربوية والعلاجية المناسبة وفق القواعد والإجراءات المعتمدة.</p>
  <div class="box"><b>بيانات الرصد المساندة</b>التاريخ: ${behaviorEsc(r.date||'—')} · الحصة: ${r.period?arabicNum(r.period):'—'} · ترتيب التكرار: المرة ${behaviorOccurrenceLabel(behaviorRecordOccurrenceOrdinal(r,c))}</div>
  <div class="signatures"><div><span>${g.deputyStudents}</span><b>الاسم: __________________</b><span>التوقيع: __________________</span><span>التاريخ: __________________</span></div><div><span>الختم الرسمي</span><div class="stamp"></div></div></div>`;
  behaviorPrintDocument(`إحالة ${g.studentBare}`,body,{confidential:true})
}

function initBehaviorModule(){
  if(behaviorModuleReady)return;behaviorModuleReady=true;
  $('#addBehaviorBtn')?.addEventListener('click',()=>openBehaviorModal());
  $('#printBehaviorReportBtn')?.addEventListener('click',printBehaviorSummaryReport);
  $('#printBehaviorLogBtn')?.addEventListener('click',()=>printBehaviorTeacherLog());
  $('#saveBehaviorBtn')?.addEventListener('click',saveBehaviorRecord);
  $('#deleteBehaviorBtn')?.addEventListener('click',deleteBehaviorRecord);
  $('#behaviorViolation')?.addEventListener('change',renderBehaviorRulePreview);
  $('#behaviorStudent')?.addEventListener('change',renderBehaviorRulePreview);
  $('#behaviorDate')?.addEventListener('change',renderBehaviorRecurrenceInfo);
  $('#behaviorPeriod')?.addEventListener('change',renderBehaviorRecurrenceInfo);
  $('#behaviorReferred')?.addEventListener('change',e=>{$('#behaviorReferralTargetWrap').hidden=!e.target.checked});
  $('#behaviorStudentFilter')?.addEventListener('change',e=>{behaviorStudentFilter=e.target.value;renderBehavior()});
  $('#behaviorDegreeFilter')?.addEventListener('change',e=>{behaviorDegreeFilter=e.target.value;renderBehavior()});
  $('#behaviorSearch')?.addEventListener('input',e=>{behaviorSearchTerm=e.target.value;renderBehavior()});
  $('#behaviorList')?.addEventListener('click',e=>{
    const edit=e.target.closest('[data-behavior-edit]');if(edit){openBehaviorModal(edit.dataset.behaviorEdit);return}
    const teacher=e.target.closest('[data-behavior-teacher-form]');if(teacher){printBehaviorTeacherLog(teacher.dataset.behaviorTeacherForm);return}
    const internal=e.target.closest('[data-behavior-internal-referral]');if(internal){printBehaviorInternalReferral(internal.dataset.behaviorInternalReferral);return}
    const official=e.target.closest('[data-behavior-official-referral]');if(official){printBehaviorOfficialReferral(official.dataset.behaviorOfficialReferral);return}
  });
  renderBehavior()
}
