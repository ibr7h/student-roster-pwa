/* Institutional A4 cover, table of contents, and section dividers for Shawahed.
   Values are escaped; sections and totals always come from the generated report. */
(function(root){
'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const show=v=>esc(String(v??'').trim()||'—');
const tone=x=>/^#[\da-f]{6}$/i.test(String(x||''))?x:'#16877d';
const icons={
 leader:'<circle cx="12" cy="8" r="3.5"/><path d="M5 21v-2.5c0-5 14-5 14 0V21"/><path d="m18 8 2 2 3-3"/>',
 learning:'<path d="M12 6c-3-2-7-2-10-1v14c4-1 7-1 10 1 3-2 6-2 10-1V5c-3-1-7-1-10 1z"/><path d="M12 6v14"/>',
 people:'<circle cx="9" cy="8" r="3"/><path d="M2 20v-2c0-3 3-5 7-5s7 2 7 5v2"/><path d="M16 5c3 0 5 2 5 4s-1 3-3 4m1 2c2 0 3 2 3 5"/>',
 guidance:'<path d="M12 21 3.5 12.5a5.5 5.5 0 0 1 8-7.5l.5.7.5-.7a5.5 5.5 0 0 1 8 7.5z"/><path d="M7 13h3l1.5-3 2 6 1.5-3h2"/>',
 activity:'<path d="m12 2 2.7 6.9L22 12l-7.3 3.1L12 22l-2.7-6.9L2 12l7.3-3.1z"/>',
 health:'<path d="M3 12h4l2.5-4.5 4.5 9 2.5-4.5H21"/><path d="M12 21c-6-4-9-8-9-12a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 4-3 8-9 12"/>',
 safety:'<path d="M12 2 20 5v6c0 5-3 8.5-8 11-5-2.5-8-6-8-11V5z"/><path d="m8 12 2.8 2.8L16 9"/>',
 environment:'<path d="M4 21V5l8-3 8 3v16"/><path d="M2 21h20M8 9h1m6 0h1M8 13h1m6 0h1M10 21v-4h4v4"/>'
};
const descriptions={
 manager:{icon:'leader',description:'القيادة المدرسية والتخطيط والإشراف على سير العمل ومتابعة إجراءات التقويم.'},
 academic:{icon:'learning',description:'متابعة العمليات التعليمية والتطوير المهني ونتائج التعلم وجودة التدريس.'},
 students_affairs:{icon:'people',description:'تنظيم شؤون الطلاب ومتابعتهم وخدماتهم والسجلات المرتبطة بهم.'},
 counselor:{icon:'guidance',description:'المساندة التربوية والإرشادية وبرامج التوجيه والرعاية الطلابية.'},
 activity:{icon:'activity',description:'الأنشطة والمبادرات والمشاركات التي تدعم نمو مهارات الطلاب.'},
 health:{icon:'health',description:'التوعية الصحية والوقاية ومتابعة البرامج والممارسات الصحية المدرسية.'},
 safety:{icon:'safety',description:'إجراءات الوقاية والتجهيز والاستجابة للمخاطر وسلامة البيئة المدرسية.'},
 environment:{icon:'environment',description:'تجهيزات المدرسة ومرافقها وجوانب الملاحظة والتحسين في البيئة التعليمية.'}
};
function logo(school){
 const src=String(school.logoUrl||'');
 const valid=/^data:image\/(?:png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(src) && src.length<1500000 ||
   /^\/(?!\/)[\w./%-]+$/.test(src);
 return valid?'<img alt="شعار المدرسة" src="'+esc(src)+'">':'<span class="shd-logo-fallback">وزارة التعليم</span>';
}
function brand(school){
 return '<header class="shd-header"><div class="shd-authority"><strong>المملكة العربية السعودية</strong><strong>وزارة التعليم</strong><span>'+show(school.eduAdmin)+'</span><span>'+show(school.office)+'</span></div><div class="shd-logo-slot">'+logo(school)+'</div></header>';
}
function footer(school){
 return '<footer class="shd-footer"><span>'+show(school.name)+' — '+show(school.year)+'</span><span class="shd-page-no">سجل شواهد التقويم والاعتماد المدرسي</span></footer>';
}
function cover(school,sections){
 const fields=[['المرحلة الدراسية',school.stage],['العام الدراسي',school.year],['الرمز الوزاري / الإحصائي',school.code],['إدارة التعليم',school.eduAdmin],['مكتب التعليم',school.office],['تاريخ الإصدار',school.issued]];
 const req=sections.reduce((n,s)=>n+(Number(s.requirements)||0),0);
 return '<article class="a4-page shd-page shd-cover" data-report-page="cover" dir="rtl" lang="ar">'+
 '<div class="shd-top-accent"></div>'+brand(school)+
 '<section class="shd-cover-hero"><span class="shd-pill">ملف شواهد التقويم المدرسي</span><span class="shd-divider-line"></span>'+
 '<h1 class="shd-hero-title">سجل توثيق شواهد<br>التقويم والاعتماد المدرسي</h1>'+
 '<p class="shd-subtitle">توثيق أعمال الأقسام واللجان والفرق المدرسية في ملف منظم يسهل مراجعته.</p></section>'+
 '<section class="shd-school-box"><h2 class="shd-school-title">'+show(school.name)+'</h2><dl class="shd-meta-grid">'+
 fields.map(([name,value])=>'<div><dt class="shd-meta-label">'+esc(name)+'</dt><dd class="shd-meta-value">'+show(value)+'</dd></div>').join('')+
 '</dl></section><p class="shd-note">يُعدّ هذا السجل أداة تنظيمية لتجميع الشواهد وتسهيل الرجوع إليها، ولا يُعدّ إثباتًا بالاعتماد الرسمي بحد ذاته.</p>'+
 '<div class="shd-summary"><div><strong>'+sections.length+'</strong><span> أقسام مدرجة</span></div><div><strong>'+req+'</strong><span> متطلبًا مدرجًا</span></div></div>'+
 footer(school)+'</article>';
}
function toc(school,sections){
 return '<article class="a4-page shd-page shd-toc" data-report-page="toc" dir="rtl" lang="ar">'+
 '<div class="shd-top-accent"></div>'+brand(school)+
 '<section class="shd-toc-head"><span class="shd-kicker">دليل محتويات التقرير</span><h2 class="shd-toc-title">فهرس الأقسام</h2>'+
 '<p class="shd-toc-intro">يوضح الفهرس موضع بداية كل قسم في التقرير.</p></section>'+
 '<ol class="shd-toc-list">'+sections.map((s,i)=>'<li class="shd-toc-item"><span class="shd-toc-number">'+String(i+1).padStart(2,'0')+
 '</span><div><div class="shd-toc-name">'+show(s.name)+'</div><div class="shd-toc-meta">'+(Number(s.requirements)||0)+
 ' متطلبات</div></div><span class="shd-toc-page" data-toc-page="'+esc(s.id)+'">صفحة —</span></li>').join('')+
 '</ol>'+footer(school)+'</article>';
}
function divider(school,section,index,count){
 const color=tone(section.color),icon=icons[section.icon]||icons.learning;
 const e=Number.isFinite(section.evidenceCount)?section.evidenceCount:'—';
 const responsible=section.responsible?'<p class="shd-responsible">المسؤول: <strong>'+show(section.responsible)+'</strong></p>':'';
 return '<article class="a4-page shd-page shd-divider" data-report-page="section-divider" data-section-key="'+esc(section.id)+
 '" style="--shd-section-color:'+color+'" dir="rtl" lang="ar"><div class="shd-top-accent"></div>'+brand(school)+
 '<div class="shd-divider-body"><span class="shd-watermark" aria-hidden="true">'+String(index+1).padStart(2,'0')+
 '</span><p class="shd-section-counter">القسم '+(index+1)+' من '+count+'</p>'+
 '<div class="shd-icon-box" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+icon+'</svg></div>'+
 '<h2 class="shd-section-name">'+show(section.name)+'</h2><p class="shd-section-intro">'+show(section.description)+'</p>'+
 '<span class="shd-section-rule"></span><div class="shd-stat-card"><div class="shd-stat"><strong>'+Number(section.requirements||0)+'</strong><span>متطلبًا في هذا القسم</span></div>'+
 '<div class="shd-stat"><strong>'+e+'</strong><span>شواهد مرفقة</span></div></div>'+responsible+
 '</div>'+footer(school)+'</article>';
}
function updateIndexPageNumbers(container){
 const pages=[...container.querySelectorAll('.a4-page')],total=pages.length;
 for(const e of container.querySelectorAll('[data-toc-page]')){
  const key=e.getAttribute('data-toc-page');
  const first=pages.findIndex(p=>p.dataset.sectionKey===key);
  e.textContent=first===-1?'صفحة —':'صفحة '+(first+1);
 }
 pages.forEach((p,i)=>{const el=p.querySelector('.shd-page-no');if(el)el.textContent='صفحة '+(i+1)+' من '+total});
}
root.ShawahedReportDesign={cover,toc,divider,updateIndexPageNumbers,descriptions};
})(window);
