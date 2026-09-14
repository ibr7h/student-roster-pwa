from pathlib import Path


def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f'{label} anchor not found')
    return text.replace(old, new, 1)

# ---------- index.html ----------
idx=Path('index.html')
h=idx.read_text(encoding='utf-8')

schedule_section=r'''
    <section class="view" id="view-schedule" data-view="schedule">
      <section class="panel teacher-schedule-panel">
        <div class="section-head schedule-head">
          <div><p class="eyebrow">جدول المعلم</p><h2>الجدول الأسبوعي والمناوبة</h2><p class="subtle">اضغط على أي حصة لتعديلها. لكل فصل لون ثابت تلقائيًا.</p></div>
          <div class="view-actions no-print"><button class="btn" id="addSupervisionBtn">＋ مناوبة / إشراف</button><button class="btn primary" id="printScheduleBtn">⬇ حفظ PDF</button></div>
        </div>
        <div class="schedule-meta no-print">
          <div class="field span2"><label>اسم المعلم</label><input id="scheduleTeacherInput"></div>
          <div class="field span2"><label>المدرسة</label><input id="scheduleSchoolInput"></div>
          <div class="field"><label>اسم الجدول</label><input id="scheduleTitleInput"></div>
        </div>
        <div id="schedulePrintArea" class="schedule-print-area">
          <div id="schedulePrintHeader" class="schedule-print-header"></div>
          <div id="scheduleStats" class="schedule-stats"></div>
          <div class="schedule-table-wrap">
            <table class="teacher-schedule-table" id="teacherScheduleTable"></table>
          </div>
          <div class="schedule-mobile" id="scheduleMobile"></div>
          <section class="supervision-section">
            <div class="supervision-title"><h3>جدول المناوبة والإشراف</h3><small>في الخطة الشهرية يحفظ التاريخ مع كل مناوبة حتى يمكن تكرار اليوم نفسه في أسابيع مختلفة.</small></div>
            <div id="supervisionList" class="supervision-list"></div>
          </section>
        </div>
      </section>
    </section>
'''
anchor='''    <section class="view" id="view-reports" data-view="reports">'''
if 'id="view-schedule"' not in h:
    h=replace_once(h,anchor,schedule_section+'\n'+anchor,'schedule section')

old_nav='''    <button data-nav="attendance"><span>◷</span><small>الحضور</small></button>\n    <button data-nav="reports"><span>▤</span><small>التقارير</small></button>'''
new_nav='''    <button data-nav="attendance"><span>◷</span><small>الحضور</small></button>\n    <button data-nav="schedule"><span>▦</span><small>جدولي</small></button>\n    <button data-nav="reports"><span>▤</span><small>التقارير</small></button>'''
if 'data-nav="schedule"' not in h:
    h=replace_once(h,old_nav,new_nav,'schedule nav')

schedule_dialog=r'''
<dialog class="modal schedule-slot-modal" id="scheduleSlotModal"><div class="modalbox"><div class="modalhead"><div><p class="eyebrow">جدول المعلم</p><h3 id="scheduleSlotTitle">تعديل الحصة</h3></div><button class="iconbtn" data-close>×</button></div><div class="modalbody form-grid"><div class="field"><label>نوع الخانة</label><select id="scheduleSlotKind"><option value="class">حصة تدريس</option><option value="standby">انتظار / احتياط</option><option value="empty">فارغ</option></select></div><div class="field"><label>الفصل</label><input id="scheduleSlotClass" placeholder="مثال: 2م أ"></div><div class="field span2"><label>المادة / الوصف</label><input id="scheduleSlotSubject" placeholder="الرقمية"></div><div class="field"><label>بداية الحصة</label><input id="scheduleSlotStart" type="time"></div><div class="field"><label>نهاية الحصة</label><input id="scheduleSlotEnd" type="time"></div><div class="field span2"><label>نص الانتظار / ملاحظة</label><input id="scheduleSlotNote" placeholder="مثال: منتظر 1"></div></div><div class="modalfooter"><button class="btn" data-close>إلغاء</button><button class="btn primary" id="saveScheduleSlotBtn">حفظ</button></div></div></dialog>

<dialog class="modal" id="supervisionModal"><div class="modalbox"><div class="modalhead"><div><p class="eyebrow">المناوبة والإشراف</p><h3 id="supervisionModalTitle">إضافة مناوبة</h3></div><button class="iconbtn" data-close>×</button></div><div class="modalbody form-grid"><div class="field"><label>اليوم</label><select id="supervisionDay"><option>الأحد</option><option>الاثنين</option><option>الثلاثاء</option><option>الأربعاء</option><option>الخميس</option></select></div><div class="field"><label>التاريخ</label><input id="supervisionDate" placeholder="مثال: 10/10"></div><div class="field"><label>من</label><input id="supervisionStart" type="time"></div><div class="field"><label>إلى</label><input id="supervisionEnd" type="time"></div><div class="field"><label>النوع</label><input id="supervisionType" placeholder="إشراف"></div><div class="field"><label>العنوان</label><input id="supervisionTitle" placeholder="إشراف جديد"></div><div class="field span2"><label>الموقع</label><input id="supervisionLocation" placeholder="البوابة الرئيسية، المقصف"></div></div><div class="modalfooter"><button class="btn danger" id="deleteSupervisionBtn" hidden>حذف</button><button class="btn" data-close>إلغاء</button><button class="btn primary" id="saveSupervisionBtn">حفظ</button></div></div></dialog>
'''
anchor_dialog='<dialog class="modal student-modal" id="studentModal">'
if 'id="scheduleSlotModal"' not in h:
    h=replace_once(h,anchor_dialog,schedule_dialog+'\n'+anchor_dialog,'schedule dialogs')

idx.write_text(h,encoding='utf-8')

# ---------- app.js ----------
app=Path('app.js')
s=app.read_text(encoding='utf-8')

make_schedule=r'''const SCHEDULE_DAYS=['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس'];
const PERIOD_TIMES={1:['07:00','07:45'],2:['07:45','08:30'],3:['08:45','09:30'],4:['09:45','10:30'],5:['10:30','11:15'],6:['11:15','12:00'],7:['12:00','12:30']};
const makeTeacherSchedule=()=>({
  teacherName:'ابراهيم بن حمود بن علي النعمي',school:'مدرسة ابو السلع الابتدائية والمتوسطة',title:'الجدول الأساسي 1',
  slots:{
    'الأحد-4':{kind:'class',className:'2م د',subject:'الرقمية'},'الأحد-5':{kind:'standby',note:'منتظر 3'},'الأحد-6':{kind:'class',className:'3م ب',subject:'الرقمية'},'الأحد-7':{kind:'class',className:'2م ب',subject:'الرقمية'},
    'الاثنين-3':{kind:'standby',note:'منتظر 4'},'الاثنين-4':{kind:'class',className:'2م أ',subject:'الرقمية'},'الاثنين-5':{kind:'class',className:'2م ج',subject:'الرقمية'},'الاثنين-6':{kind:'class',className:'3م أ',subject:'الرقمية'},'الاثنين-7':{kind:'class',className:'3م ج',subject:'الرقمية'},
    'الثلاثاء-5':{kind:'class',className:'3م ب',subject:'الرقمية'},'الثلاثاء-6':{kind:'class',className:'2م د',subject:'الرقمية'},'الثلاثاء-7':{kind:'class',className:'2م أ',subject:'الرقمية'},
    'الأربعاء-1':{kind:'class',className:'2م ب',subject:'الرقمية'},'الأربعاء-2':{kind:'class',className:'3م أ',subject:'الرقمية'},'الأربعاء-3':{kind:'standby',note:'منتظر 2'},
    'الخميس-1':{kind:'class',className:'3م ج',subject:'الرقمية'},'الخميس-2':{kind:'class',className:'2م ج',subject:'الرقمية'},'الخميس-3':{kind:'standby',note:'منتظر 1'}
  },
  supervision:[{id:uid(),day:'الثلاثاء',date:'10/10',start:'09:30',end:'09:55',title:'إشراف جديد',type:'إشراف',location:'البوابة الرئيسية، المقصف'}]
});
'''
anchor="const makeClass=(name='١ / أ',grade='الأول المتوسط',subject='المهارات الرقمية',students=[])=>({id:uid(),name,grade,subject,students,assessmentEvents:[],selectedAssessmentId:null});\n"
if 'const makeTeacherSchedule=' not in s:
    s=replace_once(s,anchor,anchor+make_schedule,'makeTeacherSchedule')

old="  ui:{activeView:'dashboard',dismissedInstall:false,assessmentMonth:'all',reportPeriod:'all'}\n};"
new="  ui:{activeView:'dashboard',dismissedInstall:false,assessmentMonth:'all',reportPeriod:'all'},\n  teacherSchedule:makeTeacherSchedule()\n};"
if 'teacherSchedule:makeTeacherSchedule()' not in s:
    s=replace_once(s,old,new,'initial teacher schedule')

migrate_anchor="  x.settings.gradeAlertThreshold=Number(x.settings.gradeAlertThreshold??60);x.settings.absenceAlertThreshold=Number(x.settings.absenceAlertThreshold??3);\n"
migrate_add="  x.teacherSchedule ||= makeTeacherSchedule();x.teacherSchedule.slots ||= {};x.teacherSchedule.supervision ||= [];x.teacherSchedule.teacherName ||= 'ابراهيم بن حمود بن علي النعمي';x.teacherSchedule.school ||= 'مدرسة ابو السلع الابتدائية والمتوسطة';x.teacherSchedule.title ||= 'الجدول الأساسي 1';if(!x.appMeta.teacher)x.appMeta.teacher=x.teacherSchedule.teacherName;if(!x.appMeta.school)x.appMeta.school=x.teacherSchedule.school;\n"
if 'x.teacherSchedule ||= makeTeacherSchedule()' not in s:
    s=replace_once(s,migrate_anchor,migrate_anchor+migrate_add,'schedule migration')

s=s.replace("['dashboard','assessments','attendance','reports'].includes(q)","['dashboard','assessments','attendance','schedule','reports'].includes(q)",1)
s=s.replace("function renderAll(){renderAppMeta();renderClassBars();renderDashboard();renderAssessments();renderAttendance();renderReports();renderInstallNote()}","function renderAll(){renderAppMeta();renderClassBars();renderDashboard();renderAssessments();renderAttendance();renderSchedule();renderReports();renderInstallNote()}",1)
s=s.replace("if(!['dashboard','assessments','attendance','reports'].includes(name))name='dashboard';","if(!['dashboard','assessments','attendance','schedule','reports'].includes(name))name='dashboard';",1)
s=s.replace("if(name==='attendance')renderAttendance();if(name==='reports')renderReports();","if(name==='attendance')renderAttendance();if(name==='schedule')renderSchedule();if(name==='reports')renderReports();",1)

schedule_js=r'''
let editingScheduleSlot=null,editingSupervisionId=null;
function scheduleKey(day,period){return `${day}-${period}`}
function scheduleTimeLabel(start,end){const fmt=t=>{if(!t)return'';let [h,m]=t.split(':').map(Number),ap=h>=12?'م':'ص';h=h%12||12;return `${h}:${String(m).padStart(2,'0')} ${ap}`};return start&&end?`${fmt(start)} - ${fmt(end)}`:''}
function scheduleSlot(day,period){const base=state.teacherSchedule.slots?.[scheduleKey(day,period)]||null;if(!base)return null;const pt=PERIOD_TIMES[period]||[];return {...base,start:base.start||pt[0]||'',end:base.end||pt[1]||''}}
function scheduleClassColor(name=''){const palette=['#dbeafe','#dcfce7','#fef3c7','#fce7f3','#ede9fe','#cffafe','#ffedd5','#e2e8f0','#d1fae5'];let h=0;for(const ch of name)h=(h*31+ch.charCodeAt(0))>>>0;return palette[h%palette.length]}
function scheduleCounts(){const slots=Object.values(state.teacherSchedule.slots||{}),teaching=slots.filter(x=>x.kind==='class'),classes=new Set(teaching.map(x=>x.className).filter(Boolean));return {teaching:teaching.length,classes:classes.size}}
function scheduleCellMarkup(day,period,mobile=false){const slot=scheduleSlot(day,period),time=PERIOD_TIMES[period]||['',''];if(!slot)return `<button class="schedule-cell empty" data-schedule-slot="${escapeHtml(day)}|${period}"><span class="period-mobile-label">الحصة ${arabicNum(period)}</span><small>${scheduleTimeLabel(time[0],time[1])}</small><em>＋</em></button>`;if(slot.kind==='standby')return `<button class="schedule-cell standby" data-schedule-slot="${escapeHtml(day)}|${period}"><span class="period-mobile-label">الحصة ${arabicNum(period)}</span><b>${escapeHtml(slot.note||'انتظار')}</b><small>${scheduleTimeLabel(slot.start,slot.end)}</small></button>`;const color=scheduleClassColor(slot.className);return `<button class="schedule-cell class-session" style="--session-color:${color}" data-schedule-slot="${escapeHtml(day)}|${period}"><span class="period-mobile-label">الحصة ${arabicNum(period)}</span><b>${escapeHtml(slot.className||'فصل')}</b><span>${escapeHtml(slot.subject||'')}</span><small>${scheduleTimeLabel(slot.start,slot.end)}</small></button>`}
function renderSchedule(){
  const t=state.teacherSchedule||(state.teacherSchedule=makeTeacherSchedule()),counts=scheduleCounts();
  const teacher=$('#scheduleTeacherInput'),school=$('#scheduleSchoolInput'),title=$('#scheduleTitleInput');if(!teacher)return;
  if(document.activeElement!==teacher)teacher.value=t.teacherName||'';if(document.activeElement!==school)school.value=t.school||'';if(document.activeElement!==title)title.value=t.title||'';
  teacher.oninput=()=>{t.teacherName=teacher.value;state.appMeta.teacher=teacher.value;renderScheduleHeader();queueSave()};school.oninput=()=>{t.school=school.value;state.appMeta.school=school.value;renderScheduleHeader();queueSave()};title.oninput=()=>{t.title=title.value;renderScheduleHeader();queueSave()};
  $('#scheduleStats').innerHTML=`<div><b>${arabicNum(counts.teaching)}</b><span>عدد الحصص</span></div><div><b>${arabicNum(counts.classes)}</b><span>عدد الفصول</span></div>`;
  $('#teacherScheduleTable').innerHTML=`<thead><tr><th>اليوم / الحصة</th>${[1,2,3,4,5,6,7].map(p=>`<th><b>${arabicNum(p)}</b><small>${scheduleTimeLabel(...PERIOD_TIMES[p])}</small></th>`).join('')}</tr></thead><tbody>${SCHEDULE_DAYS.map(day=>`<tr><th>${day}</th>${[1,2,3,4,5,6,7].map(p=>`<td>${scheduleCellMarkup(day,p)}</td>`).join('')}</tr>`).join('')}</tbody>`;
  $('#scheduleMobile').innerHTML=SCHEDULE_DAYS.map(day=>`<article class="schedule-day-card"><h3>${day}</h3><div>${[1,2,3,4,5,6,7].map(p=>scheduleCellMarkup(day,p,true)).join('')}</div></article>`).join('');
  renderScheduleHeader();renderSupervisions();$$('[data-schedule-slot]').forEach(b=>b.onclick=()=>{const [day,p]=b.dataset.scheduleSlot.split('|');openScheduleSlot(day,Number(p))})
}
function renderScheduleHeader(){const t=state.teacherSchedule;if(!$('#schedulePrintHeader'))return;$('#schedulePrintHeader').innerHTML=`<div><b>المملكة العربية السعودية</b><span>وزارة التعليم</span><span>${escapeHtml(t.school||'')}</span></div><div><h1>${escapeHtml(t.title||'جدول المعلم')}</h1><b>${escapeHtml(t.teacherName||'')}</b></div><div><b>جدول المعلم</b><span>${escapeHtml(state.appMeta.year||'')}</span><span>${escapeHtml(state.appMeta.semester||'')}</span></div>`}
function openScheduleSlot(day,period){editingScheduleSlot={day,period};const raw=state.teacherSchedule.slots?.[scheduleKey(day,period)]||{},pt=PERIOD_TIMES[period]||['',''];$('#scheduleSlotTitle').textContent=`${day} — الحصة ${arabicNum(period)}`;$('#scheduleSlotKind').value=raw.kind||'empty';$('#scheduleSlotClass').value=raw.className||'';$('#scheduleSlotSubject').value=raw.subject||'';$('#scheduleSlotStart').value=raw.start||pt[0]||'';$('#scheduleSlotEnd').value=raw.end||pt[1]||'';$('#scheduleSlotNote').value=raw.note||'';$('#scheduleSlotModal').showModal()}
function saveScheduleSlot(){if(!editingScheduleSlot)return;const {day,period}=editingScheduleSlot,key=scheduleKey(day,period),kind=$('#scheduleSlotKind').value;if(kind==='empty')delete state.teacherSchedule.slots[key];else state.teacherSchedule.slots[key]={kind,className:$('#scheduleSlotClass').value.trim(),subject:$('#scheduleSlotSubject').value.trim(),start:$('#scheduleSlotStart').value,end:$('#scheduleSlotEnd').value,note:$('#scheduleSlotNote').value.trim()};$('#scheduleSlotModal').close();renderSchedule();queueSave();toast('تم تحديث الجدول')}
function renderSupervisions(){const list=$('#supervisionList');if(!list)return;const items=state.teacherSchedule.supervision||[];list.innerHTML=items.length?items.map(x=>`<article class="supervision-card"><div><b>${escapeHtml(x.day||'')} ${x.date?`<span class="supervision-date">(${escapeHtml(x.date)})</span>`:''}</b><span>${escapeHtml(x.start||'')} - ${escapeHtml(x.end||'')}</span></div><div class="supervision-main"><strong>👁️ ${escapeHtml(x.title||'إشراف')}</strong><span>${escapeHtml(x.type||'إشراف')} — ${escapeHtml(x.location||'')}</span></div><button class="btn tiny no-print" data-edit-supervision="${x.id}">تعديل</button></article>`).join(''):`<div class="empty-state"><b>لا توجد مناوبات مسجلة</b>أضف مناوبة أو إشرافًا جديدًا.</div>`;$$('[data-edit-supervision]').forEach(b=>b.onclick=()=>openSupervision(b.dataset.editSupervision))}
function openSupervision(id=null){editingSupervisionId=id;const x=id?(state.teacherSchedule.supervision||[]).find(v=>v.id===id):null;$('#supervisionModalTitle').textContent=x?'تعديل المناوبة':'إضافة مناوبة';$('#supervisionDay').value=x?.day||'الأحد';$('#supervisionDate').value=x?.date||'';$('#supervisionStart').value=x?.start||'';$('#supervisionEnd').value=x?.end||'';$('#supervisionType').value=x?.type||'إشراف';$('#supervisionTitle').value=x?.title||'';$('#supervisionLocation').value=x?.location||'';$('#deleteSupervisionBtn').hidden=!x;$('#supervisionModal').showModal()}
function saveSupervision(){const obj={day:$('#supervisionDay').value,date:$('#supervisionDate').value.trim(),start:$('#supervisionStart').value,end:$('#supervisionEnd').value,type:$('#supervisionType').value.trim(),title:$('#supervisionTitle').value.trim()||'إشراف',location:$('#supervisionLocation').value.trim()};if(editingSupervisionId){const x=state.teacherSchedule.supervision.find(v=>v.id===editingSupervisionId);if(x)Object.assign(x,obj)}else state.teacherSchedule.supervision.push({id:uid(),...obj});$('#supervisionModal').close();renderSchedule();queueSave();toast('تم حفظ المناوبة')}
function deleteSupervision(){if(!editingSupervisionId)return;if(!confirm('حذف هذه المناوبة؟'))return;state.teacherSchedule.supervision=state.teacherSchedule.supervision.filter(v=>v.id!==editingSupervisionId);$('#supervisionModal').close();renderSchedule();queueSave();toast('تم حذف المناوبة')}
function printTeacherSchedule(){document.body.classList.add('print-teacher-schedule');window.print()}
'''
anchor='function renderAttendance(){'
if 'function renderSchedule(){' not in s:
    s=replace_once(s,anchor,schedule_js+'\n'+anchor,'schedule js')

bindings="$('#addSupervisionBtn').onclick=()=>openSupervision();$('#printScheduleBtn').onclick=printTeacherSchedule;$('#saveScheduleSlotBtn').onclick=saveScheduleSlot;$('#saveSupervisionBtn').onclick=saveSupervision;$('#deleteSupervisionBtn').onclick=deleteSupervision;\n"
anchor_bind="$('#reportPeriod').onchange=e=>{state.ui.reportPeriod=e.target.value;renderReports();queueSave()};"
if "$('#addSupervisionBtn').onclick" not in s:
    s=replace_once(s,anchor_bind,bindings+anchor_bind,'schedule bindings')

s=s.replace("document.body.classList.remove('print-student','print-class-summary');","document.body.classList.remove('print-student','print-class-summary','print-teacher-schedule');",1)
app.write_text(s,encoding='utf-8')

# ---------- styles.css ----------
css=Path('styles.css')
c=css.read_text(encoding='utf-8')
marker='/* V3.4 teacher schedule */'
if marker not in c:
    c += r'''

/* V3.4 teacher schedule */
.schedule-meta{display:grid;grid-template-columns:2fr 2fr 1.2fr;gap:10px;margin-bottom:14px}.schedule-print-header{display:grid;grid-template-columns:1fr 1.5fr 1fr;gap:16px;align-items:center;text-align:center;border-bottom:2px solid #1f2937;padding:4px 4px 12px;margin-bottom:12px}.schedule-print-header>div{display:grid;gap:4px}.schedule-print-header>div:first-child{text-align:right}.schedule-print-header>div:last-child{text-align:left}.schedule-print-header h1{margin:0;font-size:22px}.schedule-print-header span{font-size:12px}.schedule-stats{display:flex;gap:8px;justify-content:center;margin:8px 0 12px}.schedule-stats>div{border:1px solid var(--line);border-radius:10px;padding:7px 16px;display:flex;gap:8px;align-items:center;background:#fff}.schedule-stats b{font-size:18px}.schedule-stats span{font-size:11px;color:var(--muted)}.schedule-table-wrap{overflow:auto;border:1px solid var(--line);border-radius:14px}.teacher-schedule-table{border-collapse:collapse;width:100%;min-width:920px;table-layout:fixed}.teacher-schedule-table th,.teacher-schedule-table td{border:1px solid var(--line);padding:5px;text-align:center;vertical-align:stretch}.teacher-schedule-table thead th{background:#eef3f8}.teacher-schedule-table thead th:first-child{width:92px}.teacher-schedule-table thead small{display:block;font-size:9px;color:var(--muted);margin-top:3px;font-weight:500}.schedule-cell{border:0;border-radius:10px;width:100%;min-height:88px;padding:8px 5px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;cursor:pointer;color:var(--ink);background:#f8fafc;overflow:hidden}.schedule-cell.class-session{background:var(--session-color);box-shadow:inset 0 0 0 1px rgba(15,23,42,.08)}.schedule-cell.standby{background:#fef3c7;border:1px dashed #d6a52f}.schedule-cell.empty{color:#94a3b8;background:#fafafa;border:1px dashed #e2e8f0}.schedule-cell b{font-size:15px}.schedule-cell span{font-size:11px}.schedule-cell small{font-size:9px;color:#475569;white-space:nowrap}.schedule-cell em{font-style:normal;font-size:20px}.period-mobile-label{display:none!important}.schedule-mobile{display:none}.supervision-section{margin-top:18px}.supervision-title{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;border-bottom:1px solid var(--line);padding-bottom:8px;margin-bottom:9px}.supervision-title h3{margin:0}.supervision-title small{color:var(--muted);max-width:620px;line-height:1.5}.supervision-list{display:grid;gap:7px}.supervision-card{display:grid;grid-template-columns:minmax(150px,.7fr) minmax(260px,2fr) auto;gap:10px;align-items:center;border:1px solid var(--line);border-radius:11px;padding:10px 12px}.supervision-card>div{display:grid;gap:3px}.supervision-card span{font-size:11px;color:var(--muted)}.supervision-main strong{font-size:14px}.supervision-date{display:inline!important;color:inherit!important}.bottom-nav{grid-template-columns:repeat(5,1fr)}

@media(max-width:680px){
  .schedule-meta{grid-template-columns:1fr}.schedule-head{align-items:flex-start}.schedule-head .view-actions{width:100%}.schedule-head .view-actions .btn{flex:1}.schedule-print-header{grid-template-columns:1fr;text-align:center}.schedule-print-header>div:first-child,.schedule-print-header>div:last-child{text-align:center}.schedule-table-wrap{display:none}.schedule-mobile{display:grid;gap:10px}.schedule-day-card{border:1px solid var(--line);border-radius:14px;padding:10px;background:#fff}.schedule-day-card h3{margin:0 0 8px}.schedule-day-card>div{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.schedule-day-card .schedule-cell{min-height:92px;max-width:100%;min-width:0}.schedule-day-card .schedule-cell b,.schedule-day-card .schedule-cell span,.schedule-day-card .schedule-cell small{white-space:normal;overflow-wrap:anywhere}.period-mobile-label{display:block!important;font-size:9px!important;font-weight:800;color:#64748b!important}.supervision-title{display:grid}.supervision-card{grid-template-columns:1fr}.supervision-card .btn{width:100%}.schedule-stats{justify-content:stretch}.schedule-stats>div{flex:1;justify-content:center;padding:7px}.bottom-nav button small{font-size:9px}}

@media print{
  body.print-teacher-schedule{background:#fff!important}.print-teacher-schedule .app-shell{max-width:none!important;padding:0!important}.print-teacher-schedule .view{display:none!important}.print-teacher-schedule #view-schedule{display:block!important}.print-teacher-schedule #view-schedule>.panel{border:0!important;box-shadow:none!important;padding:0!important;margin:0!important}.print-teacher-schedule .schedule-head,.print-teacher-schedule .schedule-meta,.print-teacher-schedule .schedule-mobile{display:none!important}.print-teacher-schedule .schedule-table-wrap{display:block!important;border:0!important;overflow:visible!important}.print-teacher-schedule .teacher-schedule-table{min-width:0!important;width:100%!important;table-layout:fixed!important}.print-teacher-schedule .teacher-schedule-table th,.print-teacher-schedule .teacher-schedule-table td{border:.7pt solid #444!important;padding:2.5pt!important}.print-teacher-schedule .teacher-schedule-table thead th:first-child{width:18mm}.print-teacher-schedule .schedule-cell{min-height:21mm!important;border-radius:3pt!important;padding:3pt!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}.print-teacher-schedule .schedule-cell b{font-size:9pt}.print-teacher-schedule .schedule-cell span{font-size:7.5pt}.print-teacher-schedule .schedule-cell small{font-size:6.5pt}.print-teacher-schedule .schedule-print-header{font-size:9pt}.print-teacher-schedule .schedule-print-header h1{font-size:15pt}.print-teacher-schedule .schedule-stats{margin:4pt 0 7pt}.print-teacher-schedule .schedule-stats>div{padding:3pt 8pt}.print-teacher-schedule .supervision-section{margin-top:9pt}.print-teacher-schedule .supervision-title small{display:none}.print-teacher-schedule .supervision-list{gap:0;border:.7pt solid #444}.print-teacher-schedule .supervision-card{grid-template-columns:35mm 1fr!important;border:0!important;border-bottom:.7pt solid #777!important;border-radius:0!important;padding:4pt 5pt!important;break-inside:avoid}.print-teacher-schedule .supervision-card:last-child{border-bottom:0!important}.print-teacher-schedule .supervision-card .btn{display:none!important}.print-teacher-schedule .supervision-card span{color:#222!important}@page{size:A4 landscape;margin:8mm}}
'''
    css.write_text(c,encoding='utf-8')

# ---------- service worker ----------
sw=Path('sw.js')
t=sw.read_text(encoding='utf-8').replace("student-roster-pwa-v3.3'","student-roster-pwa-v3.4'")
sw.write_text(t,encoding='utf-8')

# self cleanup
Path('.github/workflows/upgrade-v34.yml').unlink(missing_ok=True)
Path('scripts/upgrade-v34.py').unlink(missing_ok=True)
