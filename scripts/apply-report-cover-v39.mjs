import fs from 'node:fs';
// Exact-marker integration applied only to the emitted preview PWA, never the source ZIP.
const file='public/index.html',swFile='public/sw.js',tick=String.fromCharCode(96);
let h=fs.readFileSync(file,'utf8');
const start=h.indexOf('function renderFormalReportPreview() {');
const end=h.indexOf("const qrNodes=[...docContainer.querySelectorAll('[data-report-qr]')]",start);
if(start<0||end<start)throw Error('Report source changed; refusing unsafe changes');
let renderer=h.slice(start,end);
function replaceOnce(from,to,label){
 if(renderer.indexOf(from)<0||renderer.indexOf(from)!==renderer.lastIndexOf(from))throw Error('Report marker '+label+' missing or ambiguous');
 renderer=renderer.replace(from,to);
}
replaceOnce("      const includeQrs = document.getElementById('repOptIncludeQrs')?.checked ?? true;",
 [
 "      const includeQrs = document.getElementById('repOptIncludeQrs')?.checked ?? true;",
 "      const includeMainCover=document.getElementById('repOptMainCover')?.checked ?? true;",
 "      const includeIndex=document.getElementById('repOptIncludeIndex')?.checked ?? true;"
 ].join('\n'),'cover options');
const prelude=[
 "      const template=window.ShawahedReportDesign;",
 "      if(!template)throw new Error('تعذر تحميل قوالب التقرير. حدّث التطبيق وأعد المحاولة.');",
 "      const schoolForPrint={",
 "       name:safeSchool.name,stage:safeSchool.stage,year:safeSchool.year,eduAdmin:safeSchool.eduAdmin,",
 "       office:safeSchool.office,code:safeSchool.code,logoUrl:safeSchool.logo,",
 "       issued:new Intl.DateTimeFormat('ar-SA-u-ca-gregory',{dateStyle:'medium'}).format(new Date())",
 "      };",
 "      const sectionModels=SECTIONS_CONFIG.map(sec=>{",
 "       const descriptions=template.descriptions[sec.id]||{};",
 "       const members=safeTeam.filter(m=>!m.isAdmin&&Array.isArray(m.allowedSections)&&m.allowedSections.includes(sec.id));",
 "       const items=Array.isArray(sec.items)?sec.items:[];",
 "       return {id:sec.id,name:schoolWording(sec.title),description:descriptions.description||'متطلبات القسم والشواهد المرتبطة بها',",
 "        icon:descriptions.icon||'learning',color:sec.color,requirements:items.length,",
 "        evidenceCount:items.reduce((n,item)=>n+(Array.isArray(state.evidences?.[item.id])?state.evidences[item.id].length:0),0),",
 "        responsible:members.length===1?members[0].name:null",
 "       };",
 "      });",
 "      let pagesHtml=(includeMainCover?template.cover(schoolForPrint,sectionModels):'')+",
 "                    (includeIndex?template.toc(schoolForPrint,sectionModels):'');"
].join('\n');
replaceOnce("      let pagesHtml = '';",prelude,'opening');
replaceOnce('      SECTIONS_CONFIG.forEach(sec => {','      SECTIONS_CONFIG.forEach((sec,sectionIndex) => {','section loop');
const coverStart=renderer.indexOf('        if (includeCovers) {');
const tableStart=renderer.indexOf('        pagesHtml += '+tick+'\n          <div class="a4-page">',coverStart);
if(coverStart<0||tableStart<0)throw Error('Existing divider/table structure changed');
const oldCover=renderer.slice(coverStart,tableStart);
if(!oldCover.includes('وثيقة رسمية معتمدة')||!oldCover.includes('sharedMembers'))throw Error('Divider replacement scope invalid');
renderer=renderer.slice(0,coverStart)+
 "        if(includeCovers)pagesHtml+=template.divider(schoolForPrint,sectionModels[sectionIndex],sectionIndex,sectionModels.length);\n\n"+
 renderer.slice(tableStart);
const tableOld='        pagesHtml += '+tick+'\n          <div class="a4-page">\n            <div>\n              '+ '$'+'{headerHtml}';
const tableNew='        pagesHtml += '+tick+'\n          <div class="a4-page" data-report-page="section-table" data-section-key="'+ '$'+'{escapeHtml(sec.id)}">\n            <div>\n              '+ '$'+'{headerHtml}';
replaceOnce(tableOld,tableNew,'table section id');
replaceOnce('      docContainer.innerHTML = pagesHtml;',
'      docContainer.innerHTML = pagesHtml;\n      template.updateIndexPageNumbers(docContainer);','numbered index');
h=h.slice(0,start)+renderer+h.slice(end);
const reportAt=h.indexOf('id="officialReportModal"'),toolbarText='        <div class="flex items-center gap-2 text-xs">';
const toolbarAt=h.indexOf(toolbarText,reportAt);
if(reportAt<0||toolbarAt<0||toolbarAt-reportAt>3500)throw Error('Official report toolbar missing');
const options=[
 '        <div class="flex items-center gap-2 text-xs report-options-bar">',
 '          <label class="flex items-center gap-1.5 cursor-pointer bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 text-[11px]">',
 '            <input type="checkbox" id="repOptMainCover" checked onchange="renderFormalReportPreview()" class="accent-indigo-500"><span>الغلاف الرئيسي</span>',
 '          </label>',
 '          <label class="flex items-center gap-1.5 cursor-pointer bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 text-[11px]">',
 '            <input type="checkbox" id="repOptIncludeIndex" checked onchange="renderFormalReportPreview()" class="accent-indigo-500"><span>الفهرس</span>',
 '          </label>'
].join('\n');
h=h.slice(0,toolbarAt)+options+h.slice(toolbarAt+toolbarText.length);
if(h.includes('school-report-cover-v39.js')||!h.includes('</head>')||!h.includes('</body>'))throw Error('New report assets already present or shell invalid');
h=h.replace('</head>','<link rel="stylesheet" href="./assets/school-report-cover-v39.css"></head>');
h=h.replace('</body>','<script src="./assets/school-report-cover-v39.js"></script></body>');
fs.copyFileSync('scripts/report-components-v39.js','public/assets/school-report-cover-v39.js');
fs.copyFileSync('scripts/report-design-v39.css','public/assets/school-report-cover-v39.css');
fs.writeFileSync(file,h);
let sw=fs.readFileSync(swFile,'utf8');
const asset="'./assets/mobile.js'";
if(!sw.includes(asset))throw Error('Service worker assets marker missing');
sw=sw.replace(asset,asset+",'./assets/school-report-cover-v39.js','./assets/school-report-cover-v39.css'");
fs.writeFileSync(swFile,sw);
if(!h.includes('template.updateIndexPageNumbers(docContainer)')||!h.includes('data-report-page="section-table"')||!sw.includes('school-report-cover-v39.css'))
 throw Error('Report integration incomplete');
console.log('PASS institution cover, contents, section dividers wired; original QR, tables and signatures untouched.');
