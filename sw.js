// release 4.9.0 multi-schedules
importScripts('./version.js');
const CACHE='student-roster-pwa-v'+(self.APP_VERSION||'4.9.0');
const ASSETS=['./','./index.html','./styles.css','./print.css','./app.js','./version.js','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png','./assets/moe-logo.png'];

async function broadcastUpdate(payload){
  try{
    const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    for(const client of clients)client.postMessage({type:'UPDATE_PROGRESS',version:self.APP_VERSION,...payload});
  }catch{}
}
function overallProgress(index,total,fraction=0){
  return Math.max(0,Math.min(100,Math.round(((index+fraction)/Math.max(1,total))*100)));
}
async function cacheAssetWithProgress(cache,asset,index,total){
  const url=new URL(asset,self.registration.scope).href;
  await broadcastUpdate({phase:'downloading',asset,completed:index,total,progress:overallProgress(index,total,0)});
  const response=await fetch(new Request(url,{cache:'reload'}));
  if(!response.ok)throw new Error('HTTP '+response.status+' '+asset);
  const length=Number(response.headers.get('content-length'))||0;
  if(response.body&&length>0){
    const reader=response.body.getReader(),chunks=[];let received=0,last=-1;
    while(true){
      const {done,value}=await reader.read();if(done)break;
      chunks.push(value);received+=value.byteLength;
      const fileFraction=Math.min(1,received/length),progress=overallProgress(index,total,fileFraction);
      if(progress!==last){last=progress;await broadcastUpdate({phase:'downloading',asset,completed:index,total,progress,assetReceived:received,assetTotal:length})}
    }
    const headers=new Headers(response.headers);headers.delete('content-encoding');headers.delete('content-length');
    const cached=new Response(new Blob(chunks),{status:response.status,statusText:response.statusText,headers});
    await cache.put(url,cached);
  }else{
    await cache.put(url,response.clone());
  }
  await broadcastUpdate({phase:'downloading',asset,completed:index+1,total,progress:overallProgress(index+1,total,0)});
}

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    await broadcastUpdate({phase:'start',completed:0,total:ASSETS.length,progress:0});
    try{
      for(let i=0;i<ASSETS.length;i++)await cacheAssetWithProgress(cache,ASSETS[i],i,ASSETS.length);
      await broadcastUpdate({phase:'installed',completed:ASSETS.length,total:ASSETS.length,progress:100});
      await self.skipWaiting();
    }catch(error){
      await broadcastUpdate({phase:'error',asset:String(error?.message||''),completed:0,total:ASSETS.length,progress:0});
      throw error;
    }
  })())
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    await broadcastUpdate({phase:'activating',progress:100});
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)));
    await self.clients.claim();
    await broadcastUpdate({phase:'activated',progress:100});
  })())
});

self.addEventListener('message',event=>{
  if(event.data?.type==='SKIP_WAITING')self.skipWaiting()
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);

  if(url.pathname.endsWith('/version.js')){
    event.respondWith(fetch(event.request,{cache:'no-store'}).catch(()=>caches.match(new URL('./version.js',self.registration.scope).href)));
    return;
  }

  if(event.request.mode==='navigate'){
    event.respondWith(
      fetch(event.request,{cache:'no-store'})
        .then(response=>{const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(new URL('./index.html',self.registration.scope).href,copy));return response})
        .catch(()=>caches.match(new URL('./index.html',self.registration.scope).href))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{
      if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy))}
      return response
    }))
  )
});
