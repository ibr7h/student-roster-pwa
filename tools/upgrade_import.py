from pathlib import Path
p=Path('app.js')
s=p.read_text(encoding='utf-8')
if 'function importSchoolCSV(rows,headers)' not in s:
    old_chip="function classChipMarkup(c){return `<button class=\"chip ${c.id===state.activeClassId?'active':''}\" data-class-switch=\"${c.id}\">${escapeHtml(c.name)}</button>`}"
    new_chip="function classChipMarkup(c){return `<button class=\"chip ${c.id===state.activeClassId?'active':''}\" data-class-switch=\"${c.id}\">${escapeHtml(c.grade)} · ${escapeHtml(c.name)}</button>`}"
    if old_chip not in s:
        raise SystemExit('classChipMarkup target not found')
    s=s.replace(old_chip,new_chip,1)
    start=s.index('function parseCSV')
    end=s.index('function csvCell', start)
    new_block=r'''function parseCSV(text){const rows=[];let row=[],cell='',q=false;for(let i=0;i<text.length;i++){const ch=text[i],n=text[i+1];if(ch==='"'&&q&&n==='"'){cell+='"';i++}else if(ch==='"'){q=!q}else if(ch===','&&!q){row.push(cell);cell=''}else if((ch==='\n'||ch==='\r')&&!q){if(ch==='\r'&&n==='\n')i++;row.push(cell);if(row.some(x=>x.trim()))rows.push(row);row=[];cell=''}else cell+=ch}row.push(cell);if(row.some(x=>x.trim()))rows.push(row);return rows}
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
'''
    s=s[:start]+new_block+s[end:]
    p.write_text(s,encoding='utf-8')
sw=Path('sw.js')
t=sw.read_text(encoding='utf-8').replace("student-roster-pwa-v3'","student-roster-pwa-v3.1'")
sw.write_text(t,encoding='utf-8')
