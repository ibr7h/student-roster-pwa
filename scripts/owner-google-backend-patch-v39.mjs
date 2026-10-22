import fs from 'node:fs';
const file='backend/server.mjs';
let source=fs.readFileSync(file,'utf8');
const routeMarker=" if(req.method==='GET'&&url.pathname==='/api/platform/schools'){";
const routeCode=`
 if(url.pathname==='/api/platform/google-drive/config'&&req.method==='GET'){
  requireOwner(user);return send(res,200,await googleConfigStatus(pool));
 }
 if(url.pathname==='/api/platform/google-drive/config'&&req.method==='POST'){
  requireOwner(user);
  throttle(req.socket.remoteAddress,'owner-google-config',5);
  const result=await saveGoogleConfig(pool,await readJson(req,16384));
  await audit(user,'platform_google_config_updated','drive');return send(res,200,result);
 }
`;
if(!source.includes('googleConfigStatus(pool)')){
 const marker="import {Pool} from 'pg';";
 if(!source.includes(marker)||!source.includes(routeMarker))throw Error('Backend markers missing; refusing unsafe OAuth route install');
 source=source.replace(marker,marker+"\nimport {googleConfigStatus,saveGoogleConfig} from './owner-google-v39.mjs';");
 source=source.replace(routeMarker,routeCode+routeMarker);
 fs.writeFileSync(file,source);
}
fs.copyFileSync('scripts/owner-google-v39.mjs','backend/owner-google-v39.mjs');
if(!source.includes("requireOwner(user);return send(res,200,await googleConfigStatus(pool))")||!source.includes("requireOwner(user);\n  throttle(req.socket.remoteAddress,'owner-google-config',5)"))throw Error('Owner-only Google route authorization missing');
console.log('Installed encrypted owner-only Drive JSON API, requiring a Render vault key.');
