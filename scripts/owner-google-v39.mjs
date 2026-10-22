import {createCipheriv,createDecipheriv,randomBytes} from 'node:crypto';
const TARGET='shawahed-school', CALLBACK='https://school-evidence-v39-api-preview.onrender.com/api/google/callback';
let ready;
function fail(message,status=400){const error=new Error(message);error.status=status;throw error}
const name=x=>typeof x==='string'?x.trim():'';
function key(){
 const encoded=name(process.env.SCHOOL_GOOGLE_OAUTH_VAULT_KEY);
 const bytes=Buffer.from(encoded,'base64');
 if(bytes.length!==32||encoded.length<43)fail('مفتاح التشفير الخاص بإعدادات Google غير مهيأ على Render.',503);
 return bytes;
}
async function table(pool){
 if(!ready)ready=pool.query(`CREATE TABLE IF NOT EXISTS platform_google_config (
 id text PRIMARY KEY, iv text NOT NULL, tag text NOT NULL, data text NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT NOW()
 )`).catch(error=>{ready=undefined;throw error});
 return ready;
}
export function parseGoogleFile(body){
 if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).length!==1||!body.web)fail('ارفع ملف OAuth JSON الأصلي من نوع Web application فقط.');
 const web=body.web;
 if(!web||typeof web!=='object'||Array.isArray(web))fail('ملف OAuth JSON غير صالح.');
 const projectId=name(web.project_id),clientId=name(web.client_id),secret=name(web.client_secret);
 if(projectId!==TARGET)fail('ملف OAuth يعود إلى مشروع آخر؛ المطلوب shawahed-school.');
 if(!/^[0-9]+-[a-z0-9]+\.apps\.googleusercontent\.com$/.test(clientId))fail('معرف OAuth Client غير صالح.');
 if(secret.length<8||secret.length>512)fail('ملف OAuth لا يحتوي Client Secret صالحًا.');
 if(!Array.isArray(web.redirect_uris||[]))fail('بيانات Redirect URIs غير صالحة.');
 const uris=(web.redirect_uris||[]).filter(x=>typeof x==='string');
 if(uris.length!==(web.redirect_uris||[]).length||uris.some(x=>!x.startsWith('https://')&&!x.startsWith('http://localhost')))fail('عنوان إعادة التوجيه غير آمن.');
 return {projectId,clientId,secret,redirectUris:uris};
}
function safeMeta(config){return {configured:true,projectId:config.projectId,clientIdSuffix:config.clientId.slice(-12),redirectConfigured:config.redirectUris.includes(CALLBACK),callbackUrl:CALLBACK}}
export async function saveGoogleConfig(pool,body){
 const config=parseGoogleFile(body);const secretKey=key();
 const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',secretKey,iv);
 const data=Buffer.concat([cipher.update(JSON.stringify(config),'utf8'),cipher.final()]);
 await table(pool);
 await pool.query(`INSERT INTO platform_google_config(id,iv,tag,data,updated_at)
 VALUES('drive', $1,$2,$3,NOW()) ON CONFLICT(id) DO UPDATE
 SET iv=excluded.iv,tag=excluded.tag,data=excluded.data,updated_at=NOW()`,
 [iv.toString('base64'),cipher.getAuthTag().toString('base64'),data.toString('base64')]);
 return safeMeta(config);
}
export async function googleConfigStatus(pool){
 await table(pool);
 const result=await pool.query("SELECT iv,tag,data,updated_at FROM platform_google_config WHERE id='drive'");
 if(!result.rows.length)return {configured:false,callbackUrl:CALLBACK,serverVaultReady:Boolean(process.env.SCHOOL_GOOGLE_OAUTH_VAULT_KEY)};
 const entry=result.rows[0],decipher=createDecipheriv('aes-256-gcm',key(),Buffer.from(entry.iv,'base64'));
 decipher.setAuthTag(Buffer.from(entry.tag,'base64'));
 const cfg=JSON.parse(Buffer.concat([decipher.update(Buffer.from(entry.data,'base64')),decipher.final()]).toString('utf8'));
 return {...safeMeta(cfg),updatedAt:entry.updated_at};
}
