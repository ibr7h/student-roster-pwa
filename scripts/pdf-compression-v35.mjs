import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp,readFile,writeFile,rm,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fail,MAX_FILE_BYTES,MAX_INCOMING_PDF_BYTES} from './security.mjs';
const run=promisify(execFile);
export const PDF_COMPRESSION_THRESHOLD=5*1024*1024;
const gsPath=process.env.GHOSTSCRIPT_PATH||'gs';
let running=0;
export function hasPdfSignature(bytes){
 return /\/(?:ByteRange|DocMDP|FieldMDP)\b|\/FT\s*\/Sig\b|\/Type\s*\/Sig\b|\/SubFilter\s*\/(?:adbe\.pkcs7|ETSI\.CAdES|ETSI\.RFC3161)/i.test(Buffer.from(bytes).toString('latin1'));
}
export function isUnsafePdfForRewrite(bytes){
 return hasPdfSignature(bytes)||/\/(?:Encrypt|XFA|Collection|EmbeddedFiles|JavaScript)\b/i.test(Buffer.from(bytes).toString('latin1'));
}
async function pageCount(file){
 const expression='('+file.replaceAll('\\','\\\\').replaceAll('(','\\(').replaceAll(')','\\)')+') (r) file runpdfbegin pdfpagecount = quit';
 const {stdout}=await run(gsPath,['-dSAFER','-dNODISPLAY','-q','-c',expression],{timeout:10000,maxBuffer:8192});
 const n=Number(stdout.trim());return Number.isInteger(n)&&n>0?n:null;
}
function enforce(bytes,meta){
 if(bytes.length>MAX_FILE_BYTES){
  const message=meta.reason==='digital_signature'?'الملف يحمل توقيعًا رقميًا ولا يجوز ضغطه دون إبطال التوقيع.':meta.reason==='protected_or_interactive'?'الملف محمي أو تفاعلي ولا يمكن ضغطه بأمان.':'تعذر تصغير PDF إلى 6 ميجابايت أو أقل؛ يرجى تقليل حجمه يدويًا.';
  throw fail(message,413);
 }
 return {bytes,originalBytes:meta.originalBytes,storedBytes:bytes.length,compressed:meta.compressed,reason:meta.reason};
}
export async function preparePdfForStorage(bytes,mime){
 if(!Buffer.isBuffer(bytes))bytes=Buffer.from(bytes);
 const originalBytes=bytes.length;
 const result=(compressed,reason,output=bytes)=>enforce(output,{originalBytes,compressed,reason});
 if(mime!=='application/pdf')return result(false,'not_pdf');
 if(originalBytes>MAX_INCOMING_PDF_BYTES)throw fail('ملف PDF يتجاوز الحد الأعلى للاستقبال (24 ميجابايت).',413);
 if(originalBytes<PDF_COMPRESSION_THRESHOLD)return result(false,'below_threshold');
 if(isUnsafePdfForRewrite(bytes))return result(false,hasPdfSignature(bytes)?'digital_signature':'protected_or_interactive');
 if(running>=1)throw fail('ضغط PDF قيد المعالجة؛ يرجى المحاولة بعد لحظات.',503);
 running++;
 let dir;
 try{
  dir=await mkdtemp(join(tmpdir(),'school-evidence-pdf-'));
  const source=join(dir,'original.pdf'),target=join(dir,'optimized.pdf');
  await writeFile(source,bytes,{mode:0o600});
  const pages=await pageCount(source);if(!pages)throw Error('Invalid source page count');
  await run(gsPath,['-dSAFER','-dBATCH','-dNOPAUSE','-q','-sDEVICE=pdfwrite','-dCompatibilityLevel=1.7','-dPDFSETTINGS=/ebook','-dDetectDuplicateImages=true','-dCompressFonts=true','-dSubsetFonts=true','-dDownsampleColorImages=true','-dDownsampleGrayImages=true','-dColorImageResolution=150','-dGrayImageResolution=150','-dMonoImageResolution=300','-sOutputFile='+target,source],{timeout:45000,maxBuffer:1024*1024,windowsHide:true});
  const size=(await stat(target)).size;
  if(size>=originalBytes||size<100)return result(false,'no_saving');
  const optimized=await readFile(target);
  if(optimized.subarray(0,5).toString()!=='%PDF-'||(await pageCount(target))!==pages)throw Error('PDF output verification failed');
  if(optimized.length>originalBytes*.95)return result(false,'minimal_saving');
  return result(true,'compressed',optimized);
 }catch(err){console.warn('PDF compression failed',err.code||err.message);return result(false,'compression_unavailable');}
 finally{running--;if(dir)await rm(dir,{recursive:true,force:true}).catch(()=>{});}
}
