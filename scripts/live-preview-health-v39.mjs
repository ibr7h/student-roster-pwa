import assert from 'node:assert/strict';
const base='https://school-evidence-v39-api-preview.onrender.com';
async function check(path){
 let error;
 for(let attempt=1;attempt<=6;attempt++){
  try{
   const response=await fetch(base+path,{method:'GET',headers:{Accept:'application/json'},signal:AbortSignal.timeout(20000)});
   const payload=await response.json();
   assert.equal(response.status,200,path+' HTTP status');
   assert.equal(typeof payload,'object');
   return payload;
  }catch(e){error=e;await new Promise(r=>setTimeout(r,4000))}
 }
 throw new Error(path+' failed after cold-start retries: '+String(error));
}
const health=await check('/api/health');
assert.equal(health.ok,true,'API health must report ok');
const status=await check('/api/register/status');
assert.equal(typeof status.emailReady,'boolean','OTP configuration indicator must be boolean');
console.log('PASS public API health; email configured:',status.emailReady);
if(status.emailReady)console.log('NOTE configured does not prove OTP mail delivery');
