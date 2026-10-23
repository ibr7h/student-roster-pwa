(()=>{'use strict';
const API_ORIGIN='https://school-evidence-v33-cloud-preview.onrender.com';
const KEY='school_evidence_session_v37';
const token=()=>{try{return sessionStorage.getItem(KEY)||''}catch{return ''}};
const clear=()=>{try{sessionStorage.removeItem(KEY)}catch{}};
function headers(extra={}){const h=new Headers(extra);const t=token();if(t)h.set('Authorization','Bearer '+t);return h;}
// A sleeping preview API may transiently return 502/503 or reset connections.
// Retry reads only: retrying a registration, login or owner configuration write
// could accidentally repeat a state-changing operation.
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function fetchWithWakeRetry(url,options){
 const method=String(options.method||'GET').toUpperCase();
 const safe=method==='GET'||method==='HEAD';
 const attempts=safe?4:1;
 let lastError;
 for(let attempt=0;attempt<attempts;attempt++){
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),22000);
  try{
   const response=await fetch(url,{...options,signal:options.signal||controller.signal});
   if(safe && [502,503,504].includes(response.status) && attempt<attempts-1){
    await pause(1400*(attempt+1));continue;
   }
   return response;
  }catch(error){
   lastError=error;
   if(!safe||options.signal?.aborted||attempt===attempts-1)break;
   await pause(1400*(attempt+1));
  }finally{clearTimeout(timeout)}
 }
 throw lastError||new Error('API request failed');
}
async function request(path,options={}){
 const opts={...options,credentials:'omit',cache:'no-store'};
 // Content-Type on bodyless GETs causes unnecessary CORS preflights.
 opts.headers=headers({...(options.body===undefined||options.body===null?{}:{'Content-Type':'application/json'}),...(options.headers||{})});
 let response;
 try{response=await fetchWithWakeRetry(API_ORIGIN+'/api'+path,opts)}
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