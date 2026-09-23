const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const fail=message=>{console.error('VALIDATION ERROR:',message);process.exitCode=1};
const info=message=>console.log('✓',message);
const index=read('index.html'),app=read('app.js'),styles=read('styles.css'),printCss=read('print.css'),sw=read('sw.js'),versionFile=read('version.js'),manifestText=read('manifest.webmanifest');
try{new vm.Script(app,{filename:'app.js'});info('app.js syntax')}catch(e){fail(e.message)}
try{new vm.Script(sw,{filename:'sw.js'});info('sw.js syntax')}catch(e){fail(e.message)}
try{JSON.parse(manifestText);info('manifest JSON')}catch(e){fail('manifest.webmanifest: '+e.message)}
const ids=[...index.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
const duplicateIds=[...new Set(ids.filter((id,i)=>ids.indexOf(id)!==i))];
duplicateIds.length?fail('Duplicate HTML ids: '+duplicateIds.join(', ')):info('HTML ids are unique');
const version=versionFile.match(/APP_VERSION=['"]([^'"]+)/)?.[1];
if(!version)fail('APP_VERSION missing from version.js');else{
  const checks=[['index.html',index.includes('v'+version)],['app.js',app.includes("||'"+version+"'")||app.includes('||"'+version+'"')],['sw.js',sw.includes("||'"+version+"'")||sw.includes('||"'+version+'"')]];
  for(const [file,ok] of checks)ok?info(file+' version '+version):fail(file+' does not match version '+version);
}
if(/(^|[^$])\$\([^\n;]*\)\.forEach\s*\(/m.test(app))fail('Found $().forEach; use $() for querySelectorAll iteration');else info('querySelector iteration guard');
const fnNames=[...app.matchAll(/\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/g)].map(m=>m[1]);
const fnDup=[...new Set(fnNames.filter((n,i)=>fnNames.indexOf(n)!==i))];
fnDup.length?fail('Duplicate function declarations: '+fnDup.join(', ')):info('No duplicate function declarations');
if(/\/\*\s*V\d+(?:\.\d+)*/i.test(styles))fail('Historical version CSS blocks found in styles.css');else info('No historical version CSS blocks');
const referenced=[...index.matchAll(/(?:src|href)="([^"]+)"/g)].map(m=>m[1]).filter(x=>!x.startsWith('http')&&!x.startsWith('data:')&&!x.startsWith('#'));
for(const rel of referenced){const clean=rel.split(/[?#]/)[0].replace(/^\.\//,'');if(clean&&!fs.existsSync(path.join(root,clean)))fail('Missing local asset: '+clean)}
info('Local HTML assets checked');
const swAssetsMatch=sw.match(/const ASSETS=\[([^\]]+)\]/s);
if(swAssetsMatch){const assets=[...swAssetsMatch[1].matchAll(/['"]([^'"]+)['"]/g)].map(m=>m[1]);for(const rel of assets){const clean=rel.replace(/^\.\//,'');if(clean&&!fs.existsSync(path.join(root,clean)))fail('Service worker asset missing: '+clean)}info('Service worker asset list checked')}
function balancedBraces(text){let n=0,q=null;for(let i=0;i<text.length;i++){const ch=text[i];if(q){if(ch===q&&text[i-1]!=='\\')q=null;continue}if(ch==="'"||ch==='"'){q=ch;continue}if(ch==='{')n++;else if(ch==='}')n--;if(n<0)return false}return n===0}
balancedBraces(styles)?info('styles.css braces'):fail('styles.css braces are unbalanced');
balancedBraces(printCss)?info('print.css braces'):fail('print.css braces are unbalanced');
if(process.exitCode)process.exit(process.exitCode);
console.log('Validation complete.');
