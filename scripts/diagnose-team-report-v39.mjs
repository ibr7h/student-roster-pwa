import fs from 'node:fs';
const html=fs.readFileSync('public/index.html','utf8');
const backend=fs.readFileSync('backend/server.mjs','utf8');
function contexts(tag,src,re,max=12,padBefore=220,padAfter=1450){
  let m,n=0;
  while((m=re.exec(src))!==null && n<max){ n++;
    console.log('DIAG',tag,n,m.index,JSON.stringify(src.slice(Math.max(0,m.index-padBefore),Math.min(src.length,m.index+padAfter))));
  }
  console.log('COUNT',tag,n);
}
for(const [tag,re] of [
 ['TEAM_FN',/function\s+(?:openTeamModal|saveTeam|addMember|addTeamMember|saveMember|renderTeam|openSectionMembersModal|saveSectionMembers)/g],
 ['TEAM_API',/\/api\/(?:members|team|sections)\b/g],
 ['TEAM_IDS',/id=["'][^"']*(?:team|Team|member|Member|sectionMembers)[^"']*["']/g],
 ['TEAM_TEXT',/إضافة (?:مستخدم|عضو)|صلاحيات|إنشاء مستخدم/g],
 ['REPORT_HTML',/id=["'](?:officialReportModal|formalPrintableDocument|reportOptions|reportScroll)[^"']*["']/g],
 ['REPORT_CSS',/#(?:officialReportModal|formalPrintableDocument)[^,{]{0,100}\{/g]
])contexts(tag,html,re,tag==='TEAM_IDS'?25:tag==='REPORT_CSS'?22:12,180,tag==='TEAM_FN'?3500:tag==='REPORT_CSS'?850:tag==='REPORT_HTML'?1900:1100);
for(const [tag,re] of [
 ['SERVER_MEMBER',/url\.pathname[^\n]{0,180}(?:members|team|permissions|sections)/g],
 ['SERVER_MEMBER_SQL',/(?:INSERT INTO members|UPDATE members|allowed_sections)/g]
])contexts(tag,backend,re,16,400,2600);

console.log('DIAG_SECOND_PASS');
for(const [tag,source,re,before,after] of [
 ['SAVE_MEMBER_ASSIGN',html,/saveMemberEntry\s*=\s*(?:async\s*)?(?:function|\()/g,300,4000],
 ['SAVE_MEMBER_OTHER',html,/saveMemberEntry/g,200,1500],
 ['MEMBERS_REQUEST',html,/cloudRequest\(['"]\/members/g,350,3800],
 ['PERM_REQUEST',html,/cloudRequest\(['"]\/permissions/g,350,2800],
 ['SAVE_SECTIONS_ASSIGN',html,/saveSectionMembersAssignment\s*=/g,240,2600],
 ['BACKEND_MEMBER_FULL',backend,/if\(req\.method==='POST'&&url\.pathname==='\/api\/members'\)/g,0,3300],
 ['REPORT_PAGE_CLASSES',html,/report-a4|report-page|print-page|page-break|a4-page/gi,100,800],
 ['REPORT_TOOLBAR',html,/id="officialReportModal"/g,100,3100],
 ['REPORT_RENDER',html,/function renderFormalReportPreview\(\)/g,100,4200]
])contexts(tag,source,re,tag==='SAVE_MEMBER_OTHER'?12:tag==='REPORT_PAGE_CLASSES'?14:4,before,after);
