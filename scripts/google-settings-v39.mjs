import {createCipheriv,createDecipheriv,randomBytes} from 'node:crypto';

const GOOGLE_ID=/^\d+-[a-z0-9-]{12,}\.apps\.googleusercontent\.com$/;
function key(){
 const value=process.env.SCHOOL_GOOGLE_CONFIG_KEY||'';
 if(!/^[0-9a-fA-F]{64}$/.test(value))throw Object.assign(new Error('مفتاح تشفير Google غير مهيأ في بيئة الخادم.'),{status:503});
 return Buffer.from(value,'hex');
}
function bad(message='ملف بيانات OAuth غير صالح.'){throw Object.assign(new Error(message),{status:400})}
export function parseWebClient(source){
 const b=source?.web;
 if(!b||typeof b!=='object'||Array.isArray(b)||Object.keys(source||{}).length!==1||source.installed||source.type==='service_account')bad('يجب رفع ملف JSON من OAuth Client بنوع Web application، وليس Service Account.');
 if(b.project_id!=='shawahed-school')bad('ملف OAuth يعود إلى مشروع مختلف؛ المطلوب shawahed-school.');
 if(typeof b.client_id!=='string'||!GOOGLE_ID.test(b.client_id)||typeof b.client_secret!=='string'||b.client_secret.length<8||b.client_secret.length>512)bad();
 if(b.auth_uri&&b.auth_uri!=='https://accounts.google.com/o/oauth2/auth')bad('عنوان Google OAuth غير متوقع.');
 if(b.token_uri&&b.token_uri!=='https://oauth2.googleapis.com/token')bad('عنوان Google Token غير متوقع.');
 return {clientId:b.client_id,clientSecret:b.client_secret};
}
export function encryptSecret(secret){
 const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key(),iv);
 const encrypted=Buffer.concat([cipher.update(secret,'utf8'),cipher.final()]);
 return Buffer.concat([iv,cipher.getAuthTag(),encrypted]).toString('base64');
}
export function decryptSecret(ciphertext){
 const payload=Buffer.from(ciphertext,'base64');
 if(payload.length<29)throw new Error('Invalid encrypted configuration');
 const decipher=createDecipheriv('aes-256-gcm',key(),payload.subarray(0,12));
 decipher.setAuthTag(payload.subarray(12,28));
 return Buffer.concat([decipher.update(payload.subarray(28)),decipher.final()]).toString('utf8');
}
export async function getGoogleStatus(pool){
 const row=(await pool.query("SELECT client_id,updated_at FROM platform_google_oauth WHERE id=1")).rows[0];
 return {configured:!!row,clientId:row?.client_id||null,updatedAt:row?.updated_at||null,linkingEnabled:false,comment:'بيانات OAuth محفوظة. ربط حسابات المدارس غير مفعل حتى اكتمال callback والتحقق الأمني.'};
}
export async function saveGoogleConfig(pool,source,ownerId){
 const {clientId,clientSecret}=parseWebClient(source);
 const ciphertext=encryptSecret(clientSecret);
 const c=await pool.connect();
 try{
  await c.query('BEGIN');
  await c.query("INSERT INTO platform_google_oauth(id,client_id,secret_enc,updated_by,updated_at) VALUES(1,$1,$2,$3,NOW()) ON CONFLICT(id) DO UPDATE SET client_id=excluded.client_id,secret_enc=excluded.secret_enc,updated_by=excluded.updated_by,updated_at=NOW()",[clientId,ciphertext,ownerId]);
  await c.query("INSERT INTO activity_log(owner_id,action,target) VALUES($1,'platform_google_oauth_updated','google_drive')",[ownerId]);
  await c.query('COMMIT');
 }catch(e){await c.query('ROLLBACK').catch(()=>{});throw e}finally{c.release()}
 return {configured:true,clientId,linkingEnabled:false};
}
