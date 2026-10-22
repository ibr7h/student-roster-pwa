import fs from 'node:fs';
const owner=fs.readFileSync('public/owner.html','utf8');
const server=fs.readFileSync('backend/server.mjs','utf8');
const rows=owner.split('\n');
console.log('OWNER_TITLE',owner.match(/<title[^>]*>([^<]+)/)?.[1]);
console.log('OWNER_BODY_TOP',owner.slice(owner.indexOf('<body'),owner.indexOf('<body')+5700).replace(/\s+/g,' ').slice(0,5700));
for(const word of ['async function api(', 'async function init()', 'async function login(', '/platform/login','/platform/me','/api/platform/me','ownerLogin','type="file"','cloudError','تعذر الاتصال','تعذّر الاتصال']){
 const at=owner.indexOf(word);console.log('OWNER_SEARCH',word,at,at>=0?owner.slice(Math.max(0,at-1000),at+2400):'');
}
console.log('OWNER_END',owner.slice(-6000));
console.log('BACKEND_HEAD',server.split('\n').slice(0,75).join('\n'));
const patterns=['/api/platform/login','/api/platform/me','/api/platform/schools','/api/health','function checkOrigin','function send(', 'function auth(', 'function readJson(','function handleApi(','async function api(','async function routeApi(','/api/platform/'];
for(const word of patterns){const at=server.indexOf(word);console.log('BACKEND_SEARCH',word,at,at>=0?server.slice(Math.max(0,at-1550),at+2200):'')}
console.log('BACKEND_LENGTH',server.length);

const p=server.indexOf("if(req.method==='GET'&&url.pathname==='/api/platform/me')");console.log('OWNER_AUTH_ROUTES',server.slice(p,p+7200));
const fpos=server.indexOf("res._staticAccessToken");console.log('SEND_AND_CORS',server.slice(Math.max(0,fpos-4400),fpos+3400));
console.log('OWNER_INLINE_LAST',owner.slice(-2000));
