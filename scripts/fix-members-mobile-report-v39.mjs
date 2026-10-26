// Build-time repairs on the isolated school v3.9 preview. No database writes.
import fs from 'node:fs';
const file='public/index.html';
let html=fs.readFileSync(file,'utf8');
const password=html.match(/<input\b[^>]*\bid="memberPinCodeInput"[^>]*>/);
if(!password)throw Error('Member password input missing');
html=html.replace(password[0],password[0].replace(/\s+type="[^"]*"/g,'').replace('<input','<input type="password"'));
function memberSave(){
 if(!state.currentUser?.isAdmin){showToast('إضافة المستخدمين متاحة لمدير المدرسة فقط','fa-lock');return;}
 if(window.schoolMemberSaving)return;
 const name=document.getElementById('memberNameInput')?.value.trim()||'';
 const username=(document.getElementById('memberIdNumInput')?.value||'').trim().toLowerCase();
 const pwd=document.getElementById('memberPinCodeInput')?.value||'';
 const teamGroup=document.getElementById('memberTeamGroupInput')?.value||'';
 const editId=state.editingMemberId||null;
 const isAdmin=!!document.getElementById('memberFullAdminCheckbox')?.checked;
 const sections=Array.from(document.querySelectorAll('input[name="memberAllowedSec"]:checked')).map(x=>x.value);
 if(!name||!/^[a-z0-9._-]{3,64}$/.test(username)){showToast('أدخل اسم العضو ومعرف دخول إنجليزيًا صحيحًا','fa-circle-exclamation');return;}
 if((!editId||pwd.length>0)&&pwd.length<12){showToast('كلمة المرور يجب أن تتكون من 12 حرفًا على الأقل','fa-circle-exclamation');return;}
 if(!teamGroup||(Array.isArray(state.school?.teamGroups)&&!state.school.teamGroups.includes(teamGroup))){showToast('اختر فريقًا أو لجنة موجودة','fa-circle-exclamation');return;}
 if(!isAdmin&&!sections.length){showToast('حدد قسمًا واحدًا على الأقل للعضو','fa-circle-exclamation');return;}
 const btn=document.querySelector('#teamModal button[onclick="saveMemberEntry()"]');
 const label=document.getElementById('memberSaveBtnText'),oldLabel=label?.textContent||'حفظ المستخدم';
 window.schoolMemberSaving=true;
 if(btn)btn.disabled=true;
 if(label)label.textContent='جارٍ حفظ الحساب...';
 (async()=>{
  try{
   const current=state.team.find(m=>m.id===editId);
   const result=await cloudRequest('/members',{method:'POST',body:JSON.stringify({
    id:editId||undefined,name,username,password:pwd||undefined,teamGroup,
    role:document.getElementById('memberRoleInput')?.value.trim()||'عضو فريق',
    isAdmin,allowedSections:sections,
    signatureSvg:exportSignatureAsSVG()||current?.signatureSvg||null
   })});
   await cloudReload();
   if(!state.team.some(m=>m.id===result.id))throw Error('حُفظ الحساب لكن لم تظهر بياناته. أعد فتح الأعضاء للتحقق.');
   resetMemberForm();renderModalTeamList();
   showToast(editId?'تم تحديث حساب العضو وصلاحياته':'تم إنشاء حساب العضو وصلاحياته','fa-circle-check');
  }catch(error){cloudError(error);}
  finally{
   window.schoolMemberSaving=false;
   if(btn)btn.disabled=false;
   if(label&&label.textContent==='جارٍ حفظ الحساب...')label.textContent=oldLabel;
  }
 })();
}
function permissionSave(){
 if(!state.currentUser?.isAdmin){showToast('تعديل الصلاحيات متاح للمدير فقط','fa-lock');return;}
 if(window.schoolPermissionsSaving)return;
 const sectionId=state.activeSectionForPerms;
 if(!sectionId)return;
 const ids=Array.from(document.querySelectorAll('input[name="secAssignMemberCb"]:checked')).map(x=>x.value);
 const btn=document.querySelector('#sectionMembersModal button[onclick="saveSectionMembersAssignment()"]');
 window.schoolPermissionsSaving=true;if(btn)btn.disabled=true;
 (async()=>{
  try{
   await cloudRequest('/permissions',{method:'POST',body:JSON.stringify({sectionId,memberIds:ids})});
   await cloudReload();
   if(state.team.some(m=>!m.isAdmin&&!!m.allowedSections?.includes(sectionId)!==ids.includes(m.id)))
    throw Error('الصلاحيات المعروضة لا تطابق ما حُفظ. أعد المحاولة.');
   closeSectionMembersModal();renderModalTeamList();render();
   showToast('تم تحديث صلاحيات القسم على الخادم','fa-circle-check');
  }catch(error){cloudError(error);}
  finally{window.schoolPermissionsSaving=false;if(btn)btn.disabled=false;}
 })();
}
function swap(start,end,fn){
 const first=html.indexOf(start),last=html.indexOf(end,first+start.length);
 if(first<0||last<0||html.indexOf(start,first+start.length)>=0)throw Error('Missing or duplicated team handler: '+start);
 html=html.slice(0,first)+start.replace('async function(){',fn.toString().replace(/^function\s+\w+\(/,'function(')) + '\n    '+html.slice(last);
}
// Replace only the handler function body between stable generated bundle markers.
function replaceHandler(marker,nextMarker,name,fn){
 const a=html.indexOf(marker),b=html.indexOf(nextMarker,a+marker.length);
 if(a<0||b<a||html.indexOf(marker,a+marker.length)>=0)throw Error('Expected unique '+name+' marker');
 html=html.slice(0,a)+name+'='+fn.toString()+';\n    '+html.slice(b);
}
replaceHandler('saveMemberEntry=async function(){','deleteMember=async function(id){','saveMemberEntry',memberSave);
replaceHandler('saveSectionMembersAssignment=async function(){','saveEvidenceEntry=async function(){','saveSectionMembersAssignment',permissionSave);
const cssPath='public/assets/mobile-report-fix-v39.css';
fs.copyFileSync('scripts/mobile-report-fix-v39.css',cssPath);
if(!html.includes('</head>'))throw Error('PWA head marker missing');
html=html.replace('</head>','<link rel="stylesheet" href="./assets/mobile-report-fix-v39.css"></head>');
const modalFix='<script id="school-permissions-modal-fix">document.addEventListener("DOMContentLoaded",function(){var m=document.getElementById("sectionMembersModal");if(m&&m.parentElement!==document.body)document.body.appendChild(m);});</script>';
if(!html.includes('</body>'))throw Error('Mobile modal footer missing');
html=html.replace('</body>',modalFix+'</body>');
fs.writeFileSync(file,html);
const swPath='public/sw.js';
let sw=fs.readFileSync(swPath,'utf8');
if(!sw.includes("'./assets/mobile.js'"))throw Error('Service worker asset marker missing');
sw=sw.replace("'./assets/mobile.js'","'./assets/mobile.js','./assets/mobile-report-fix-v39.css'");
fs.writeFileSync(swPath,sw);
if(!html.includes('window.schoolMemberSaving')||!html.includes('window.schoolPermissionsSaving')||!html.includes('mobile-report-fix-v39.css')||!sw.includes('mobile-report-fix-v39.css'))throw Error('Member/report preview patch incomplete');
console.log('PASS team member and permission handlers; mobile report uses separate screen styling');
