from pathlib import Path
import re

app=Path('app.js')
s=app.read_text(encoding='utf-8')

if 'function classOfficialSheet(' not in s:
    anchor="function clearPrintPage(){document.getElementById('dynamicPrintPage')?.remove()}\n\n"
    helper=r'''function assessmentTypeScore(s,c,period,type){
  const events=eventsForPeriod(c,period).filter(a=>a.type===type);let earned=0,max=0,count=0;
  for(const a of events){const raw=s.grades?.[a.id];if(raw!==undefined&&raw!==null&&raw!==''&&!Number.isNaN(Number(raw))){earned+=Number(raw);max+=Number(a.maxScore)||0;count++}}
  return count?`${arabicNum(earned)} / ${arabicNum(max)}`:'—'
}
function classOfficialSheet(c,period='all'){
  const periodText=period==='all'?state.appMeta.semester:monthLabel(period);
  const rows=c.students.map((s,i)=>{const sc=scoreSummary(s,c,period),at=attendanceCounts(s,period);return `<tr><td class="sheet-num">${arabicNum(i+1)}</td><td class="sheet-name">${escapeHtml(s.name)}</td><td>${assessmentTypeScore(s,c,period,'homework')}</td><td>${assessmentTypeScore(s,c,period,'participation')}</td><td>${assessmentTypeScore(s,c,period,'project')}</td><td>${assessmentTypeScore(s,c,period,'practical')}</td><td>${assessmentTypeScore(s,c,period,'quiz')}</td><td>${assessmentTypeScore(s,c,period,'exam')}</td><td>${sc.gradedMax?`${arabicNum(sc.earned)} / ${arabicNum(sc.gradedMax)}`:'—'}</td><td>${pct(sc.performance)}</td><td>${arabicNum(at.absent)}</td></tr>`}).join('')||'<tr><td colspan="11">لا يوجد طلاب في الفصل</td></tr>';
  return `<div class="official-class-print"><table class="official-class-sheet"><thead><tr class="sheet-header-row"><th colspan="11">${officialReportHeader('كشف متابعة الفصل',c,periodText)}</th></tr><tr class="sheet-columns"><th>م</th><th>اسم الطالب</th><th>الواجبات</th><th>المشاركة والتفاعل</th><th>المشاريع والبحوث</th><th>التطبيقات العملية</th><th>الاختبارات القصيرة</th><th>الاختبارات</th><th>المجموع المرصود</th><th>النسبة</th><th>الغياب</th></tr></thead><tbody>${rows}</tbody></table>${officialReportSignatures()}</div>`
}

'''
    if anchor not in s:
        raise SystemExit('print helper anchor not found')
    s=s.replace(anchor,anchor+helper,1)

old="$('#reportPrintHeader').innerHTML=officialReportHeader('تقرير متابعة الفصل',c,period==='all'?state.appMeta.semester:monthLabel(period));"
new="$('#reportPrintHeader').innerHTML=classOfficialSheet(c,period);"
if old in s:
    s=s.replace(old,new,1)
elif new not in s:
    raise SystemExit('report header assignment not found')

move_re=r"function moveStudentClass\(id\)\{.*?toast\('تم نقل الطالب'\)\}"
move_new=r'''function moveStudentClass(id){const from=findStudentClass(id),s=findStudent(id);if(!from||!s)return;if(state.classes.length<2){toast('أضف فصلًا آخر أولًا');return}const targets=state.classes.filter(c=>c.id!==from.id),choices=targets.map((c,i)=>`${i+1}) ${c.grade} · ${c.name}`).join('\n'),n=Number(prompt(`انقل «${s.name}» إلى:\n${choices}`));if(!n||!targets[n-1])return;const target=targets[n-1];from.students=from.students.filter(x=>x.id!==id);target.students.push(s);target.students.sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'ar',{sensitivity:'base',ignorePunctuation:true,numeric:true}));renderAll();renderStudentsModal();queueSave();toast('تم نقل الطالب وترتيبه أبجديًا')}'''
if 'تم نقل الطالب وترتيبه أبجديًا' not in s:
    s2,n=re.subn(move_re,move_new,s,count=1,flags=re.S)
    if n!=1:
        raise SystemExit('moveStudentClass target not found')
    s=s2

app.write_text(s,encoding='utf-8')

css=Path('styles.css')
c=css.read_text(encoding='utf-8')
marker='/* V3.3 mobile width + formal class sheet */'
if marker not in c:
    c += r'''

/* V3.3 mobile width + formal class sheet */
.print-report-header{display:none}
.official-class-print{width:100%}.official-class-sheet{width:100%;border-collapse:collapse;table-layout:fixed}.official-class-sheet th,.official-class-sheet td{border:1px solid #4b5563;padding:5px 4px;text-align:center;vertical-align:middle}.official-class-sheet .sheet-header-row>th{border:0;padding:0 0 8px}.official-class-sheet .sheet-header-row .official-report-header{margin:0}.official-class-sheet .sheet-columns th{background:#eef2f5;font-size:11px;line-height:1.35}.official-class-sheet .sheet-num{width:34px}.official-class-sheet .sheet-name{text-align:right;font-weight:700;width:18%;overflow-wrap:anywhere}.official-class-sheet td{font-size:11px;line-height:1.35}

@media(max-width:680px){
  #view-assessments,.assessment-layout,.assessment-gradebook,.assessment-selected-head,.assessment-selected-head>div{min-width:0;max-width:100%}
  .assessment-layout{width:100%;overflow:hidden}
  .assessment-timeline{width:100%;min-width:0;max-width:100%;overflow:hidden}
  .assessment-timeline #assessmentList{width:100%;max-width:100%;overflow-x:auto;overflow-y:hidden;display:flex;gap:7px;padding-bottom:5px}
  .assessment-card{flex:0 0 min(76vw,268px);width:min(76vw,268px);min-width:0!important;max-width:calc(100vw - 42px);overflow:hidden}
  .assessment-card b,.assessment-card small,.assessment-card .assessment-progress,.assessment-selected-head h3,.assessment-selected-head .subtle{display:block;max-width:100%;white-space:normal;overflow-wrap:anywhere;word-break:break-word}
  .assessment-selected-head{width:100%;overflow:hidden}
  .assessment-gradebook{width:100%;overflow:hidden}
  .assessment-gradebook .table-wrap{width:100%;max-width:100%;overflow-x:auto}
}

@media print{
  body.print-class-summary #reportPrintHeader{display:block!important}
  body.print-class-summary #reportKpis,body.print-class-summary #riskBanner,body.print-class-summary #studentReportList,body.print-class-summary .reports-head{display:none!important}
  body.print-class-summary #view-reports>.panel{padding:0!important;margin:0!important}
  .official-class-sheet{font-size:7.5pt;table-layout:fixed}
  .official-class-sheet thead{display:table-header-group}
  .official-class-sheet tfoot{display:table-footer-group}
  .official-class-sheet tr{break-inside:avoid;page-break-inside:avoid}
  .official-class-sheet th,.official-class-sheet td{border:0.8pt solid #333!important;padding:3.2pt 2.5pt;font-size:7.3pt;line-height:1.25}
  .official-class-sheet .sheet-header-row>th{border:0!important;padding:0 0 6pt!important;background:#fff!important}
  .official-class-sheet .sheet-columns th{font-size:7pt;background:#e9e9e9!important;font-weight:700}
  .official-class-sheet .sheet-name{width:22%;font-size:7.6pt;text-align:right!important}
  .official-class-sheet .sheet-num{width:22pt}
  .official-class-print .official-signatures{margin-top:10pt}
}
'''
    css.write_text(c,encoding='utf-8')

sw=Path('sw.js')
t=sw.read_text(encoding='utf-8').replace("student-roster-pwa-v3.2'","student-roster-pwa-v3.3'")
sw.write_text(t,encoding='utf-8')

Path('.github/workflows/upgrade-v33.yml').unlink(missing_ok=True)
Path('scripts/upgrade-v33.py').unlink(missing_ok=True)
