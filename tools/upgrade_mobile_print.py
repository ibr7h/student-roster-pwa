from pathlib import Path

app = Path('app.js')
s = app.read_text(encoding='utf-8')

if 'function officialReportHeader(' not in s:
    anchor = 'function renderReports(){'
    helper = r'''function officialReportHeader(title,c,periodText,studentName=''){
  const m=state.appMeta||{},school=m.school||'اسم المدرسة',region=m.region||'إدارة التعليم',teacher=m.teacher||'—',principal=m.principal||'—';
  return `<header class="official-report-header" dir="rtl"><div class="official-gov"><b>المملكة العربية السعودية</b><span>وزارة التعليم</span><span>${escapeHtml(region)}</span><span>${escapeHtml(school)}</span></div><div class="official-center"><div class="official-emblem" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div><b class="official-ministry-name">وزارة التعليم</b><h1>${escapeHtml(title)}</h1>${studentName?`<div class="official-student">الطالب: <strong>${escapeHtml(studentName)}</strong></div>`:''}</div><div class="official-meta"><div><b>المادة:</b><span>${escapeHtml(c.subject||'—')}</span></div><div><b>العام الدراسي:</b><span>${escapeHtml(m.year||'—')}</span></div><div><b>الفصل الدراسي:</b><span>${escapeHtml(periodText||m.semester||'—')}</span></div><div><b>الصف:</b><span>${escapeHtml(c.grade||'—')}</span></div><div><b>الفصل:</b><span>${escapeHtml(c.name||'—')}</span></div><div><b>معلم المادة:</b><span>${escapeHtml(teacher)}</span></div></div></header>`
}
function officialReportSignatures(){return `<footer class="official-signatures"><div><span>معلم المادة</span><b>${escapeHtml(state.appMeta.teacher||'—')}</b><em>التوقيع: __________________</em></div><div><span>مدير المدرسة</span><b>${escapeHtml(state.appMeta.principal||'—')}</b><em>التوقيع: __________________</em></div></footer>`}
function setPrintPage(orientation='portrait'){let el=document.getElementById('dynamicPrintPage');if(!el){el=document.createElement('style');el.id='dynamicPrintPage';document.head.appendChild(el)}el.textContent=`@page{size:A4 ${orientation};margin:10mm}`}
function clearPrintPage(){document.getElementById('dynamicPrintPage')?.remove()}

'''
    if anchor not in s:
        raise SystemExit('renderReports anchor not found')
    s = s.replace(anchor, helper + anchor, 1)

old = "$('#reportPrintHeader').innerHTML=`<div class=\"student-report-header print-only-header\"><div class=\"eyebrow\">${escapeHtml(state.appMeta.school||'سجل الطلاب')}</div><h2>${escapeHtml(c.subject)} — ${escapeHtml(c.grade)} / ${escapeHtml(c.name)}</h2><p>${escapeHtml(state.appMeta.year)} · ${escapeHtml(period==='all'?state.appMeta.semester:monthLabel(period))}</p><p>معلم المادة: ${escapeHtml(state.appMeta.teacher||'—')} &nbsp; | &nbsp; مدير المدرسة: ${escapeHtml(state.appMeta.principal||'—')}</p></div>`;"
new = "$('#reportPrintHeader').innerHTML=officialReportHeader('تقرير متابعة الفصل',c,period==='all'?state.appMeta.semester:monthLabel(period));"
if old in s:
    s = s.replace(old, new, 1)

old_start = "$('#studentReportPrint').innerHTML=`<div class=\"student-report-header\"><div class=\"eyebrow\">${escapeHtml(state.appMeta.school||'سجل الطالب')}</div><h2>${escapeHtml(s.name)}</h2><p>${escapeHtml(c.grade)} · الفصل ${escapeHtml(c.name)} · ${escapeHtml(c.subject)}</p><p>${escapeHtml(state.appMeta.year)} · ${escapeHtml(periodText)}</p></div>"
new_start = "$('#studentReportPrint').innerHTML=`${officialReportHeader('تقرير متابعة الطالب',c,periodText,s.name)}"
if old_start in s:
    s = s.replace(old_start, new_start, 1)

old_footer = "<div class=\"student-report-header\"><p>معلم المادة: ${escapeHtml(state.appMeta.teacher||'—')} &nbsp;&nbsp; | &nbsp;&nbsp; مدير المدرسة: ${escapeHtml(state.appMeta.principal||'—')}</p></div>`;"
new_footer = "${officialReportSignatures()}`;"
if old_footer in s:
    s = s.replace(old_footer, new_footer, 1)

old_print = "function printStudent(){document.body.classList.add('print-student');window.print();setTimeout(()=>document.body.classList.remove('print-student'),500)}\nfunction printClassReport(){document.body.classList.add('print-class-summary');showView('reports',false);window.print();setTimeout(()=>document.body.classList.remove('print-class-summary'),500)}"
new_print = "function printStudent(){setPrintPage('portrait');document.body.classList.add('print-student');requestAnimationFrame(()=>window.print())}\nfunction printClassReport(){setPrintPage('landscape');document.body.classList.add('print-class-summary');showView('reports',false);requestAnimationFrame(()=>window.print())}"
if old_print not in s:
    raise SystemExit('print functions target not found')
s = s.replace(old_print, new_print, 1)

old_after = "window.addEventListener('afterprint',()=>document.body.classList.remove('print-student','print-class-summary'));"
new_after = "window.addEventListener('afterprint',()=>{document.body.classList.remove('print-student','print-class-summary');clearPrintPage()});"
if old_after in s:
    s = s.replace(old_after, new_after, 1)

app.write_text(s, encoding='utf-8')

css = Path('styles.css')
c = css.read_text(encoding='utf-8')
marker = '/* V3.2 mobile assessment + official A4 reports */'
if marker not in c:
    c += r'''

/* V3.2 mobile assessment + official A4 reports */
.official-report-header{display:grid;grid-template-columns:1fr 1.15fr 1fr;gap:12px;align-items:stretch;border:2px solid #1f2937;border-radius:12px;padding:10px 12px;margin-bottom:12px;background:#fff;color:#111}.official-gov,.official-meta{display:grid;align-content:center;gap:3px;font-size:12px;line-height:1.45}.official-gov b{font-size:13px}.official-center{text-align:center;display:grid;place-items:center;align-content:center;gap:3px;border-inline:1px dashed #7b8794;padding-inline:10px}.official-center h1{margin:3px 0 0;font-size:20px}.official-ministry-name{font-size:12px}.official-student{margin-top:5px;font-size:13px}.official-meta>div{display:grid;grid-template-columns:auto 1fr;gap:5px;border-bottom:1px dotted #9ca3af;padding-bottom:2px}.official-meta b{white-space:nowrap}.official-emblem{height:26px;display:flex;align-items:flex-end;justify-content:center;gap:3px}.official-emblem i{display:block;width:4px;border-radius:999px;background:#334155;transform-origin:center bottom}.official-emblem i:nth-child(1),.official-emblem i:nth-child(7){height:8px}.official-emblem i:nth-child(2),.official-emblem i:nth-child(6){height:14px}.official-emblem i:nth-child(3),.official-emblem i:nth-child(5){height:21px}.official-emblem i:nth-child(4){height:26px}.official-signatures{display:grid;grid-template-columns:1fr 1fr;gap:36px;margin-top:18px;padding-top:10px;border-top:1px solid #555;break-inside:avoid}.official-signatures>div{display:grid;gap:6px;text-align:center}.official-signatures span{font-size:11px}.official-signatures b{font-size:13px}.official-signatures em{font-style:normal;font-size:10px;color:#333}.print-only-header .official-report-header{display:grid}

@media(max-width:680px){
  #assessmentModal.modal{width:100vw;max-width:none;height:100dvh;max-height:none;margin:0;border-radius:0;padding:0;inset:0;background:#fff}
  #assessmentModal .modalbox{height:100dvh;max-height:none;overflow:hidden;padding:max(10px,env(safe-area-inset-top)) max(12px,env(safe-area-inset-right)) max(10px,env(safe-area-inset-bottom)) max(12px,env(safe-area-inset-left));display:flex;flex-direction:column}
  #assessmentModal .modalhead{position:relative;top:auto;flex:0 0 auto;padding:8px 0 12px;border-bottom:1px solid var(--line)}
  #assessmentModal .modalhead h3{font-size:20px}
  #assessmentModal .modalbody{flex:1;display:grid;grid-template-columns:1fr;align-content:start;gap:14px;margin:0;padding:14px 0 18px;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch}
  #assessmentModal .field,#assessmentModal .span2{grid-column:1/-1}
  #assessmentModal .field label{font-size:13px;font-weight:750;color:var(--ink);margin-bottom:6px}
  #assessmentModal input,#assessmentModal select{font-size:16px;min-height:50px;border-radius:12px;padding:11px 12px}
  #assessmentModal .modalfooter{flex:0 0 auto;display:grid;grid-template-columns:1fr 1.35fr;gap:8px;margin:0;padding:10px 0 max(2px,env(safe-area-inset-bottom));background:#fff;border-top:1px solid var(--line)}
  #assessmentModal .modalfooter .btn{width:100%;min-height:50px;font-size:15px}
}

@media print{
  html,body{color:#000!important;font-family:Arial,Tahoma,sans-serif!important;font-size:10pt;background:#fff!important}
  .official-report-header{border:1.4pt solid #000!important;border-radius:8pt;padding:7pt 9pt;margin:0 0 8pt;grid-template-columns:1fr 1.15fr 1fr;gap:8pt;break-inside:avoid;page-break-inside:avoid;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .official-center{border-inline:1pt dashed #555;padding-inline:7pt}.official-center h1{font-size:15pt}.official-gov,.official-meta{font-size:8.5pt}.official-gov b{font-size:9pt}.official-ministry-name{font-size:8pt}.official-student{font-size:9.5pt}.official-emblem{height:21pt}.official-emblem i{background:#111!important}
  .student-report-print{gap:7pt}.student-report-grid{gap:5pt}.report-box{border:1pt solid #777!important;border-radius:4pt;padding:6pt;background:#fff!important}.report-box b{font-size:14pt}.report-box span{font-size:8pt;color:#111!important}
  .detail-table{font-size:8.5pt}.detail-table th,.detail-table td{border:1pt solid #555!important;padding:4pt}.detail-table th{background:#eee!important;color:#000!important}
  .report-section{margin-top:8pt}.report-section h3{font-size:10.5pt;margin-bottom:4pt;border-bottom:1pt solid #444;padding-bottom:3pt}.trend-wrap{border:1pt solid #777!important;border-radius:4pt;padding:4pt}.risk-box.report-risk{border:1pt solid #777!important;background:#fff!important;color:#000!important}
  .official-signatures{gap:28pt;margin-top:12pt;padding-top:7pt;border-top:1pt solid #444}.official-signatures span{font-size:8pt}.official-signatures b{font-size:9pt}.official-signatures em{font-size:7.5pt}
  body.print-student #studentReportPrint{width:100%;max-width:190mm;margin:0 auto}
  body.print-class-summary #view-reports>.panel{width:100%}body.print-class-summary .report-kpis{grid-template-columns:repeat(4,1fr);gap:5pt;margin:5pt 0 7pt}body.print-class-summary .student-report-list{display:grid;gap:0;border:1pt solid #555}body.print-class-summary .student-report-row{border:0;border-bottom:1pt solid #777;border-radius:0;padding:4pt 5pt;grid-template-columns:28pt minmax(150pt,1.5fr) 65pt 65pt 50pt 72pt;font-size:8pt;break-inside:avoid}body.print-class-summary .student-report-row:last-child{border-bottom:0}body.print-class-summary .student-report-row .subtle{font-size:7pt;color:#222!important}body.print-class-summary .student-report-row .btn{display:none!important}body.print-class-summary .student-report-row .metric{display:block!important}
}
'''

css.write_text(c, encoding='utf-8')

sw = Path('sw.js')
t = sw.read_text(encoding='utf-8').replace("student-roster-pwa-v3.1'", "student-roster-pwa-v3.2'")
sw.write_text(t, encoding='utf-8')
