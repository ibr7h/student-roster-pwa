from pathlib import Path
import re, base64, urllib.request

root=Path('.')
app=root/'app.js'
css=root/'styles.css'
idx=root/'index.html'
sw=root/'sw.js'
assets=root/'assets'
assets.mkdir(exist_ok=True)

src=urllib.request.urlopen('https://raw.githubusercontent.com/ibr7h/-1-/main/operational-plan-pwa/index.html', timeout=30).read().decode('utf-8','ignore')
m=re.search(r'data:image/png;base64,([A-Za-z0-9+/=]+)', src)
if not m:
    raise SystemExit('embedded Ministry logo not found')
logo=base64.b64decode(m.group(1))
if not logo.startswith(b'\\x89PNG') or len(logo)<100000:
    raise SystemExit('unexpected first embedded image; refusing to use wrong asset')
(assets/'moe-logo.png').write_bytes(logo)

h=idx.read_text(encoding='utf-8')
old='<span class="brand-mark">س</span>'
new='<span class="brand-mark brand-logo-wrap"><img class="app-brand-logo" src="assets/moe-logo.png" alt="شعار وزارة التعليم"></span>'
if old in h:
    h=h.replace(old,new,1)
elif 'app-brand-logo' not in h:
    raise SystemExit('brand mark target not found')
idx.write_text(h,encoding='utf-8')

s=app.read_text(encoding='utf-8')
old_emblem='<div class="official-emblem" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div><b class="official-ministry-name">وزارة التعليم</b>'
new_emblem='<img class="official-logo" src="./assets/moe-logo.png" alt="شعار وزارة التعليم"><b class="official-ministry-name">وزارة التعليم</b>'
if old_emblem in s:
    s=s.replace(old_emblem,new_emblem,1)
elif 'class="official-logo"' not in s:
    raise SystemExit('official report emblem target not found')

old_sched="""function renderScheduleHeader(){const t=state.teacherSchedule;if(!$('#schedulePrintHeader'))return;$('#schedulePrintHeader').innerHTML=`<div><b>المملكة العربية السعودية</b><span>وزارة التعليم</span><span>${escapeHtml(t.school||'')}</span></div><div><h1>${escapeHtml(t.title||'جدول المعلم')}</h1><b>${escapeHtml(t.teacherName||'')}</b></div><div><b>جدول المعلم</b><span>${escapeHtml(state.appMeta.year||'')}</span><span>${escapeHtml(state.appMeta.semester||'')}</span></div>`}"""
new_sched="""function renderScheduleHeader(){const t=state.teacherSchedule;if(!$('#schedulePrintHeader'))return;$('#schedulePrintHeader').innerHTML=`<div><b>المملكة العربية السعودية</b><span>وزارة التعليم</span><span>${escapeHtml(t.school||'')}</span></div><div class="schedule-logo-center"><img class="schedule-official-logo" src="./assets/moe-logo.png" alt="شعار وزارة التعليم"><h1>${escapeHtml(t.title||'جدول المعلم')}</h1><b>${escapeHtml(t.teacherName||'')}</b></div><div><b>جدول المعلم</b><span>${escapeHtml(state.appMeta.year||'')}</span><span>${escapeHtml(state.appMeta.semester||'')}</span></div>`}"""
if old_sched in s:
    s=s.replace(old_sched,new_sched,1)
elif 'schedule-official-logo' not in s:
    raise SystemExit('schedule header target not found')

old_print="function printTeacherSchedule(){document.body.classList.add('print-teacher-schedule');window.print()}"
new_print="function printTeacherSchedule(){setPrintPage('landscape');document.body.classList.add('print-teacher-schedule');requestAnimationFrame(()=>window.print())}"
if old_print in s:
    s=s.replace(old_print,new_print,1)
elif new_print not in s:
    raise SystemExit('teacher schedule print function target not found')
app.write_text(s,encoding='utf-8')

c=css.read_text(encoding='utf-8')
marker='/* V3.5 official logo + strict A4 reports */'
if marker not in c:
    c += r'''
/* V3.5 official logo + strict A4 reports */
.brand-logo-wrap{background:#fff!important;overflow:hidden;padding:3px;border:1px solid var(--line)}
.app-brand-logo{display:block;width:100%;height:100%;object-fit:contain}
.official-logo{display:block;width:74px;max-width:100%;height:62px;object-fit:contain;margin:0 auto 2px}
.schedule-logo-center{display:grid!important;place-items:center;align-content:center}
.schedule-official-logo{display:block;width:86px;height:70px;object-fit:contain;margin:0 auto 2px}

@media print{
  body.print-student #studentReportPrint{width:190mm!important;max-width:190mm!important;margin:0 auto!important}
  body.print-class-summary #reportPrintHeader,
  body.print-class-summary #view-reports>.panel{width:277mm!important;max-width:277mm!important;margin-inline:auto!important}
  body.print-teacher-schedule #schedulePrintArea{width:277mm!important;max-width:277mm!important;margin:0 auto!important}
  .official-logo{width:28mm!important;height:23mm!important;object-fit:contain!important}
  .schedule-official-logo{width:30mm!important;height:24mm!important;object-fit:contain!important}
  .app-brand-logo{display:none!important}
}
'''
css.write_text(c,encoding='utf-8')

t=sw.read_text(encoding='utf-8')
t=re.sub(r"const CACHE='student-roster-pwa-v[^']+';", "const CACHE='student-roster-pwa-v3.5';", t)
if "'./assets/moe-logo.png'" not in t:
    t=t.replace("'./icons/icon-512.png'", "'./icons/icon-512.png','./assets/moe-logo.png'")
sw.write_text(t,encoding='utf-8')
