/* A public Render web service terminates TLS behind Cloudflare.
 * Never trust X-Forwarded-For's leftmost value as it may be client supplied.
 * Only read CF-Connecting-IP when running on Render's public service edge;
 * otherwise use the socket peer as a safe, fail-closed fallback.
 * The returned address is HMACed by rate-limit-v39; it is not persisted raw.
 */
import {isIP} from 'node:net';
export function clientAddress(req,{onRender=process.env.RENDER==='true'}={}){
 const raw=req?.headers?.['cf-connecting-ip'];
 const candidate=typeof raw==='string'?raw.trim():'';
 if(onRender&&candidate.length<=45&&isIP(candidate))return candidate;
 const remote=req?.socket?.remoteAddress;
 return typeof remote==='string'&&remote.length<=256?remote:'unknown';
}
