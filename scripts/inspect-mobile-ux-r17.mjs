import fs from 'node:fs';
const s=fs.readFileSync('public/index.html','utf8');
const patterns=[
 ['HEADER',/id=["']appHeader["']/gi,900,2400],
 ['SUCCESS',/تم تحميل بيانات المدرسة من الخادم/gi,900,1400],
 ['LICENSE',/الترخيص نشط حتى/gi,1000,1600],
 ['SCHOOL_LOADED',/بيانات المدرسة من الخادم/gi,900,1700],
 ['LICENSE_RENEW',/تجديد الترخيص/gi,650,1300],
 ['BLUR',/backdrop-filter|backdrop-blur|blur\(/gi,180,500],
 ['CLOUD_LOAD',/async function (?:loadCloudData|loadCloud|refreshCloud|initCloud|syncCloud|saveEvidenceEntry|loadData|saveData)\b/gi,150,1800],
 ['CLOUD_REQ',/cloudRequest\(['"]\/(?:data|evidences|school|members|permissions|team)/gi,230,380],
 ['SAVE_EVIDENCE',/function saveEvidenceEntry|saveEvidenceEntry\s*=/gi,250,2600],
 ['UPDATE_SCHOOL',/function saveSchool|saveSchoolProfile|cloudRequest\(['"]\/school/gi,260,1050],
 ['MORE_MENU',/id=["']mobileMenuToggle["']|id=["']mobileTools|mobile-bottom-nav|المزيد/gi,300,800],
 ['LOGIN_STATE',/loginScreenOverlay|SchoolBridge\.token|loadCloudData/gi,260,600]
];
for(const [label,re,left,right] of patterns){let matches=[],m;while((m=re.exec(s))&&matches.length<18){matches.push({at:m.index,excerpt:s.slice(Math.max(0,m.index-left),Math.min(s.length,m.index+right))})}console.log('FIND',label,JSON.stringify(matches))}
console.log('INDEX_LENGTH',s.length);
