import fs from 'node:fs';
const file='public/index.html';
let page=fs.readFileSync(file,'utf8');
function patch(oldValue,newValue){
 if(!page.includes(oldValue))throw Error('PDF upload patch marker missing: '+oldValue.slice(0,65));
 page=page.replace(oldValue,newValue);
}
patch('const CLOUD_MAX_FILE = 6 * 1024 * 1024;', 'const CLOUD_MAX_FILE = 6 * 1024 * 1024;\n    const CLOUD_MAX_INCOMING_PDF = 24 * 1024 * 1024;');
patch('      tempSelectedFileObj = file;\n      document.getElementById(\'selectedFileName\')',
 '      if(file.size>(file.type===\'application/pdf\'?CLOUD_MAX_INCOMING_PDF:CLOUD_MAX_FILE)){\n        tempSelectedFileObj=null;tempSelectedFileDataUrl=null;\n        showToast(file.type===\'application/pdf\'?\'الحد الأقصى لملف PDF قبل الضغط 24 ميجابايت\':\'الحد الأقصى للملف 6 ميجابايت\',\'fa-triangle-exclamation\');return;\n      }\n      tempSelectedFileDataUrl=null;\n      tempSelectedFileObj = file;\n      document.getElementById(\'selectedFileName\')');
patch('      const titleInput = document.getElementById(\'evidenceTitleInput\');',
 '      if(file.type===\'application/pdf\'&&file.size>=5*1024*1024)document.getElementById(\'selectedFileMeta\').textContent+=\' • سيُجرّب الضغط المتوازن عند الرفع، مع حماية التوقيعات الرقمية\';\n      const titleInput = document.getElementById(\'evidenceTitleInput\');');
patch('        tempSelectedFileDataUrl = evt.target.result;',
 '        if(tempSelectedFileObj!==file)return;\n        tempSelectedFileDataUrl = evt.target.result;');
patch("        if(tempSelectedFileObj.size>CLOUD_MAX_FILE){showToast('الحد الأقصى للملف الواحد 6 ميغابايت','fa-triangle-exclamation');return;}",
 "        if(tempSelectedFileObj.size>(tempSelectedFileObj.type==='application/pdf'?CLOUD_MAX_INCOMING_PDF:CLOUD_MAX_FILE)){showToast('حجم الملف يتجاوز الحد المسموح','fa-triangle-exclamation');return;}");
patch("        await cloudRequest('/evidences',{method:'POST',body:JSON.stringify(payload)});\n        resetEvidenceForm();await cloudReload();\n        showToast('تم حفظ الشاهد على الخادم','fa-circle-check');",
 "        const result=await cloudRequest('/evidences',{method:'POST',body:JSON.stringify(payload)});\n        const summary=result.compression;\n        resetEvidenceForm();await cloudReload();\n        if(summary?.compressed){const mb=n=>(n/1048576).toFixed(2);showToast('حُفظ PDF بعد الضغط: '+mb(summary.originalBytes)+' ← '+mb(summary.storedBytes)+' ميجابايت','fa-file-circle-check');}\n        else if(summary?.reason==='digital_signature')showToast('حُفظ PDF الأصلي دون تعديل لحماية توقيعه الرقمي','fa-shield-halved');\n        else showToast('تم حفظ الشاهد على الخادم'+(summary?.reason==='compression_unavailable'?' دون ضغط':''),'fa-circle-check');");
fs.writeFileSync(file,page);
const sw='public/sw.js';
const cache=fs.readFileSync(sw,'utf8');
if(!cache.includes('school-evidence-pwa-cloud-v3.4.0'))throw Error('PWA cache version patch marker missing');
fs.writeFileSync(sw,cache.replace('school-evidence-pwa-cloud-v3.4.0','school-evidence-pwa-cloud-v3.5.0'));
console.log('PWA PDF compression UI and cache updated');
