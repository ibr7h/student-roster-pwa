import {createHmac} from 'node:crypto';
import {fail} from './security.mjs';
function keyFor(ip,kind,secret){
 if(typeof secret!=='string'||secret.length<32)throw fail('تعذر التحقق من حدود الدخول الآمنة.',503);
 if(!/^[a-z][a-z0-9-]{1,45}$/.test(kind))throw Error('Invalid rate limit family');
 const address=typeof ip==='string'&&ip.length<=256?ip:'unknown';
 return createHmac('sha256',secret).update(kind+'\0'+address).digest('hex');
}
export function rateBucketId(ip,kind,secret){return kind+':'+keyFor(ip,kind,secret)}
export async function durableThrottle(pool,ip,kind,{limit=20,windowSeconds=900,secret=process.env.SCHOOL_OTP_HMAC_SECRET||process.env.PLATFORM_SETUP_TOKEN}={}){
 if(!Number.isSafeInteger(limit)||limit<1||limit>5000||!Number.isSafeInteger(windowSeconds)||windowSeconds<30||windowSeconds>86400)throw Error('Invalid limit settings');
 const key=rateBucketId(ip,kind,secret);
 const result=await pool.query(
 "INSERT INTO api_rate_buckets(bucket,hits,expires_at) VALUES($1,1,NOW()+($2::int*interval '1 second')) ON CONFLICT(bucket) DO UPDATE SET hits=CASE WHEN api_rate_buckets.expires_at<=NOW() THEN 1 ELSE api_rate_buckets.hits+1 END,expires_at=CASE WHEN api_rate_buckets.expires_at<=NOW() THEN NOW()+($2::int*interval '1 second') ELSE api_rate_buckets.expires_at END RETURNING hits,expires_at",
 [key,windowSeconds]);
 if(result.rows[0].hits>limit)throw fail('محاولات كثيرة؛ انتظر قبل إعادة المحاولة.',429);
 return {ok:true};
}
