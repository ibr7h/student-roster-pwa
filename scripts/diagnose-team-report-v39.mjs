import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const html=read('public/index.html');
const backend=read('backend/server.mjs');
function contexts(tag,src,re,max=12,padBefore=350,padAfter=1300){
  let m,n=0;
  while((m=re.exec(src))!==null && n<max){ n++;
    const start=Math.max(0,m.index-padBefore),end=Math.min(src.length,m.index+padAfter);
    console.log('DIAG',tag,n,m.index,JSON.stringify(src.slice(start,end)));
  }
  console.log('COUNT',tag,n);
}
for(const [tag,re] of [
 ['TEAM_FN',/function\\s+(?:openTeamModal|saveTeam|addMember|addTeamMember|saveMember|renderTeam|openSectionMembersModal|saveSectionMembers)[\\s\\S]?/g],
 ['TEAM_API',/\\/api\\/(?:members|team|sections)\\b/g],
 ['TEAM_IDS',/id=["'][^"']*(?:team|Team|member|Member|sectionMembers)[^"']*["']/g],
 ['TEAM_TEXT',/إضافة (?:مستخدم|عضو)|صلاحيات|إنشاء مستخدم/g],
 ['REPORT_HTML',/id=["'](?:officialReportModal|formalPrintableDocument|reportOptions|reportScroll)[^"']*["']/g],
 ['REPORT_CSS',/#(?:officialReportModal|formalPrintableDocument)[^,{]{0,100}\\{/g]
])contexts(tag,html,re,tag==='TEAM_IDS'?25:tag==='REPORT_CSS'?22:12,180,tag==='TEAM_FN'?3500:tag==='REPORT_CSS'?850:tag==='REPORT_HTML'?1900:1100);
for(const [tag,re] of [
 ['SERVER_MEMBER',/url\\.pathname[^\\n]{0,180}(?:members|team|permissions|sections)/g],
 ['SERVER_MEMBER_SQL',/(?:INSERT INTO members|UPDATE members|allowed_sections)/g]
])contexts(tag,backend,re,16,400,2600);
