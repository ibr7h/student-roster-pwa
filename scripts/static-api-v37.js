(()=>{'use strict';
const API_ORIGIN='https://school-evidence-v33-cloud-preview.onrender.com';
const KEY='school_evidence_session_v37';
const token=()=>{try{return sessionStorage.getItem(KEY)||''}catch{return ''}};
const clear=()=>{try{sessionStorage.removeItem(KEY)}catch{}};
function headers(extra={}){const h=new Headers(extra);const t=token();if(t)h.set('Authorization','Bearer '+t);return h;}
async function request(path,options={}){
 const opts={...options,credentials:'omit',cache:'no-store'};
 opts.headers=headers({'Content-Type':'application/json',...(options.headers||{})});
 let response;
 try{response=await fetch(API_ORIGIN+'/api'+path,opts)}
 catch(e){throw new Error('الخادم يستيقظ أو الاتصال غير متاح. حاول مجددًا بعد لحظات.')}
 const data=await response.json().catch(()=>({}));
 if(!response.ok){if(response.status===401 && !path.endsWith('/login'))clear();throw new Error(data.error||'خطأ الخادم: '+response.status)}
 if(typeof data.sessionToken==='string' && /^[A-Za-z0-9_-]{43}$/.test(data.sessionToken)){
   try{sessionStorage.setItem(KEY,data.sessionToken)}catch{throw new Error('لا يمكن حفظ جلسة الدخول في هذا المتصفح.')}
   delete data.sessionToken;
 }
 if(path==='/logout')clear();
 return data;
}
async function file(path){
 const t=token();
 if(!t)throw new Error('سجّل الدخول أولًا من هذا الجهاز.');
 const response=await fetch(API_ORIGIN+'/api'+path,{headers:{Authorization:'Bearer '+t},credentials:'omit',cache:'no-store'});
 if(!response.ok)throw new Error('لا توجد صلاحية لعرض الملف، أو انتهت الجلسة.');
 return response.blob();
}
window.SCHOOL_API_ORIGIN=API_ORIGIN;
window.SchoolBridge=Object.freeze({request,file,token,clear});
})();