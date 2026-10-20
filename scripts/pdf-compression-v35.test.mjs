import {test} from 'node:test';
import assert from 'node:assert/strict';
import {hasPdfSignature,isUnsafePdfForRewrite,preparePdfForStorage} from './pdf-compression.mjs';
function pdf(){
 const objects=[
 '<< /Type /Catalog /Pages 2 0 R >>',
 '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
 '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
 '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
 '<< /Length 53 >>\nstream\nBT /F1 18 Tf 50 750 Td (School Evidence PDF Test) Tj ET\nendstream'
 ];
 let s='%PDF-1.4\n';const offsets=[];
 for(let i=0;i<objects.length;i++){offsets.push(Buffer.byteLength(s));s+=(i+1)+' 0 obj\n'+objects[i]+'\nendobj\n';}
 const start=Buffer.byteLength(s);s+='xref\n0 '+(objects.length+1)+'\n0000000000 65535 f \n';
 for(const x of offsets)s+=String(x).padStart(10,'0')+' 00000 n \n';
 s+='trailer\n<< /Size '+(objects.length+1)+' /Root 1 0 R >>\nstartxref\n'+start+'\n%%EOF\n';
 return Buffer.from(s);
}
const minimal=pdf();
const large=Buffer.concat([minimal,Buffer.from('\n%'+ 'A'.repeat(6*1024*1024+100))]);
test('small original kept verbatim',async()=>{const r=await preparePdfForStorage(minimal,'application/pdf');assert.equal(r.compressed,false);assert.deepEqual(r.bytes,minimal)});
test('compressible oversized PDF becomes a valid smaller file',async()=>{
 const r=await preparePdfForStorage(large,'application/pdf');assert.equal(r.compressed,true);assert.equal(r.originalBytes,large.length);
 assert.ok(r.storedBytes<r.originalBytes*.95);assert.ok(r.storedBytes<=6*1024*1024);assert.ok(r.bytes.subarray(0,5).equals(Buffer.from('%PDF-')));
});
test('signed PDF remains byte-for-byte unchanged',async()=>{
 const s=Buffer.concat([minimal,Buffer.from('\n/ByteRange [0 10 20 30]')]);
 assert.equal(hasPdfSignature(s),true);const r=await preparePdfForStorage(s,'application/pdf');assert.deepEqual(r.bytes,s);assert.equal(r.reason,'below_threshold');
});
test('signed PDF beyond stored limit rejects rather than invalidates signature',async()=>{
 const s=Buffer.concat([large,Buffer.from('\n/FT /Sig /ByteRange [0 10 20 30]')]);
 await assert.rejects(preparePdfForStorage(s,'application/pdf'),e=>e.status===413&&e.message.includes('توقيع'));
});
test('PDF with interactive features is excluded from rewrite',()=>{
 for(const field of ['/Encrypt','/XFA','/Collection','/EmbeddedFiles','/JavaScript'])assert.equal(isUnsafePdfForRewrite(Buffer.from('%PDF-1.7 '+field)),true);
});
test('24 MiB upload cap enforced',async()=>{const x=Buffer.alloc(24*1024*1024+1,0);await assert.rejects(preparePdfForStorage(x,'application/pdf'),e=>e.status===413)});
test('other MIME types bypass the PDF compressor',async()=>{const r=await preparePdfForStorage(minimal,'image/png');assert.equal(r.compressed,false)});
