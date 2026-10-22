import fs from 'node:fs';
const owner='public/owner.html';
let page=fs.readFileSync(owner,'utf8');
if(!page.includes("window.SchoolBridge.request(path,opts)"))throw Error('Owner app must call authenticated preview API before adding settings');
if(!page.includes('ownerGoogleDriveSettings')){
 if(!page.includes('</head>')||!page.includes('</body>'))throw Error('Owner HTML markers missing');
 page=page.replace('</head>','<link rel="stylesheet" href="./assets/owner-google-ui-v39.css"></head>');
 page=page.replace('</body>','<script src="./assets/owner-google-ui-v39.js" defer></script></body>');
 fs.writeFileSync(owner,page);
}
fs.copyFileSync('scripts/owner-google-ui-v39.js','public/assets/owner-google-ui-v39.js');
fs.copyFileSync('scripts/owner-google-ui-v39.css','public/assets/owner-google-ui-v39.css');
const swPath='public/sw.js',sw=fs.readFileSync(swPath,'utf8');
if(!sw.includes("'./assets/owner-google-ui-v39.js'")){
 if(!sw.includes("'./assets/release-ui-v39.js'"))throw Error('Expected r9 assets in PWA shell');
 fs.writeFileSync(swPath,sw.replace("'./assets/release-ui-v39.js'","'./assets/release-ui-v39.js','./assets/owner-google-ui-v39.js','./assets/owner-google-ui-v39.css'"));
}
console.log('Owner console now has secure JSON file import panel and manual reconnect action');
