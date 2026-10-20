/* Applied after the v3.7 static build; transforms remaining phone popups into pages. */
import fs from 'node:fs';
const htmlPath='public/index.html';
let html=fs.readFileSync(htmlPath,'utf8');
if(html.includes('mobile-native-v38.js')){console.log('Mobile v3.8 already installed');process.exit(0);}
function replace(before,after){
 if(!html.includes(before))throw Error('Mobile v3.8 source marker missing: '+before.slice(0,95));
 html=html.replace(before,after);
}
replace('function deleteTeamGroup(button){','async function deleteTeamGroup(button){');
replace('importJSONBackup=function(event){','importJSONBackup=async function(event){');
replace('function openLicenseRenewal(){','async function openLicenseRenewal(){');
let confirms=0;
html=html.replace(/(?<![\w.])confirm\(/g,()=>{confirms++;return 'await window.schoolMobileConfirm('});
if(confirms!==5)throw Error('Expected five native confirm calls, found '+confirms);
replace("const token=prompt('أدخل الرقم التسلسلي السنوي الجديد للتجديد:');","const token=await window.schoolMobilePrompt('أدخل الرقم التسلسلي السنوي الجديد للتجديد:');");
html=html.replaceAll("window.prompt('انسخ الرابط',fullUrl)","window.schoolMobileCopyFallback(fullUrl)");
if(html.includes('window.prompt(')||html.includes('=prompt('))throw Error('An unhandled native prompt remains');
if(!html.includes('</head>')||!html.includes('</body>'))throw Error('Document structure not found');
html=html.replace('</head>','<link rel="stylesheet" href="./assets/mobile-native-v38.css"></head>');
html=html.replace('</body>','<script src="./assets/mobile-native-v38.js"></script></body>');
fs.copyFileSync('scripts/mobile-native-v38.js','public/assets/mobile-native-v38.js');
fs.copyFileSync('scripts/mobile-native-v38.css','public/assets/mobile-native-v38.css');
fs.writeFileSync(htmlPath,html);
let sw=fs.readFileSync('public/sw.js','utf8');
if(!sw.includes('static-api-v37.js'))throw Error('Static API not initialized before mobile patch');
sw=sw.replace(/school-evidence-pwa-cloud-v3\.\d+\.\d+/g,'school-evidence-pwa-cloud-v3.8.0');
if(!sw.includes("'./assets/mobile.js'"))throw Error('Service worker mobile asset marker missing');
sw=sw.replace("'./assets/mobile.js'","'./assets/mobile.js','./assets/mobile-native-v38.js','./assets/mobile-native-v38.css'");
fs.writeFileSync('public/sw.js',sw);
const manifestPath='public/manifest.webmanifest';
const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
manifest.display='standalone';manifest.orientation='portrait';manifest.display_override=['standalone'];
fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2));
if(!html.includes('window.schoolMobileConfirm(')||!html.includes('mobile-native-v38.css')||!sw.includes('mobile-native-v38.js'))throw Error('Mobile patch verification failed');
console.log('v3.8 mobile pages and in-app bottom sheet confirmations applied; native confirms replaced:',confirms);
