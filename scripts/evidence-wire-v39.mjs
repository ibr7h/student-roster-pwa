import http from 'node:http';
import assert from 'node:assert/strict';
export async function openTestStorage(){
 const files=new Map();
 const server=http.createServer(async(req,res)=>{
  const p=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if(!p.startsWith('/uploads/')){res.writeHead(404);return res.end()}
  const key=p.slice('/uploads/'.length);
  if(req.method==='PUT'){
   const chunks=[];for await(const chunk of req)chunks.push(chunk);
   files.set(key,Buffer.concat(chunks));res.writeHead(200,{'ETag':'"ci-test"'});return res.end();
  }
  if(req.method==='GET'){const file=files.get(key);if(!file){res.writeHead(404);return res.end()}
   res.writeHead(200,{'Content-Type':'application/pdf','Content-Length':file.length});return res.end(file);
  }
  if(req.method==='DELETE'){files.delete(key);res.writeHead(204);return res.end()}
  res.writeHead(405);res.end();
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 process.env.AWS_REGION='us-east-1';
 process.env.AWS_ENDPOINT_URL_S3='http://127.0.0.1:'+server.address().port;
 process.env.AWS_ACCESS_KEY_ID='ci-only-identifier';
 process.env.AWS_SECRET_ACCESS_KEY='ci-only-dummy-password';
 process.env.STORAGE_BUCKET='uploads';
 return {files,close:()=>new Promise(resolve=>server.close(resolve))};
}
export async function exerciseEvidence({req,base,token,itemId,fileBytes,expectCompressed=false}){
 const pdf=Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog /Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n');
 const input=fileBytes||pdf;
 const body={itemId,title:'Private test PDF',type:'file',fileName:'test.pdf',mimeType:'application/pdf',fileData:'data:application/pdf;base64,'+input.toString('base64')};
 const out=await req('/api/evidences',{method:'POST',token,body});
 assert.equal(out.status,201,'Upload failed: '+JSON.stringify(out.data));
 if(expectCompressed)assert.equal(out.data.compression?.compressed,true,'Large PDF must be compressed before S3');
 const id=out.data.id;assert.match(id,/^[0-9a-f-]{36}$/);
 assert.equal((await req('/api/evidences/'+id+'/view',{token})).status,200);
 const file=await fetch(base+'/api/files/'+id,{headers:{Authorization:'Bearer '+token}});
 assert.equal(file.status,200);
 const received=Buffer.from(await file.arrayBuffer());
 if(expectCompressed){assert.ok(received.length<input.length*.95,'PDF payload must be significantly smaller');assert.equal(received.subarray(0,5).toString(),'%PDF-')}else assert.deepEqual(received,input);
 const share=await req('/api/evidences/'+id+'/shares',{method:'POST',token,body:{hours:1}});
 assert.equal(share.status,201,'Share failed: '+JSON.stringify(share.data));
 assert.match(share.data.url,/^\/share\/[A-Za-z0-9_-]{43}$/);
 assert.equal((await req(share.data.url)).status,200);
 assert.equal((await req(share.data.url+'/file')).status,200);
 const revoke=await req('/api/evidences/'+id+'/shares/'+share.data.id,{method:'DELETE',token});
 assert.equal(revoke.status,200);
 assert.equal((await req(share.data.url)).status,404);
 return {id,shareId:share.data.id};
}

export function makeCompressiblePdf(){
 const objects=[
  '<< /Type /Catalog /Pages 2 0 R >>',
  '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
  '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
  '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  '<< /Length 53 >>\nstream\nBT /F1 18 Tf 50 750 Td (School Evidence PDF Test) Tj ET\nendstream'
 ];
 let text='%PDF-1.4\n';const offsets=[];
 for(let i=0;i<objects.length;i++){offsets.push(Buffer.byteLength(text));text+=(i+1)+' 0 obj\n'+objects[i]+'\nendobj\n'}
 const start=Buffer.byteLength(text);text+='xref\n0 '+(objects.length+1)+'\n0000000000 65535 f \n';
 for(const offset of offsets)text+=String(offset).padStart(10,'0')+' 00000 n \n';
 text+='trailer\n<< /Size '+(objects.length+1)+' /Root 1 0 R >>\nstartxref\n'+start+'\n%%EOF\n';
 return Buffer.concat([Buffer.from(text),Buffer.from('\n%'+ 'A'.repeat(6*1024*1024+100))]);
}
