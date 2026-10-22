import fs from 'node:fs';
const p='scripts/browser-v39.mjs';let s=fs.readFileSync(p,'utf8');
const pairs=[
 ["if(p==='/api/platform/google-drive/config')","if(p==='/api/platform/google-drive')"],
 ["{configured:true,projectId:'shawahed-school',clientIdSuffix:'usercontent.com',redirectConfigured:false}","{configured:true,clientId:'839613940331-e1356j8bkt407nqndv7kpll0q9ll1s77.apps.googleusercontent.com',linkingEnabled:false}"],
 ["{configured:ownerGoogleStored,serverVaultReady:true,projectId:ownerGoogleStored?'shawahed-school':undefined}","{configured:ownerGoogleStored,clientId:ownerGoogleStored?'839613940331-e1356j8bkt407nqndv7kpll0q9ll1s77.apps.googleusercontent.com':null,linkingEnabled:false}"],
 ["textContent.includes('تم حفظ إعداد Google Drive')","textContent.includes('تم حفظ بيانات OAuth')"],
 ["ownerPosts[0].web.project_id","ownerPosts[0].googleClient.web.project_id"]
];
let changes=0;
for(const [old,replace] of pairs){if(s.includes(old)){s=s.replace(old,replace);changes++}else if(!s.includes(replace))throw Error('Owner test patch target not found: '+old.slice(0,45))}
if(!s.includes("if(p==='/api/platform/google-drive')")||!s.includes("ownerPosts[0].googleClient.web.project_id"))throw Error('Failed to align owner browser test');
fs.writeFileSync(p,s);
console.log('Patched '+changes+' owner UI fixture assertions to match actual protected Google API.');
