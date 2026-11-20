/* オフライン対応（Service Worker）の元ファイル。build.js が下の VER の部分を書きかえて 公開用/sw.js を作る。
   - アプリ本体（poker.html など）：まずネットから最新を取りにいき、4秒待ってもだめなら保存してある分を出す
   - 字体（Google Fonts）と通信部品（unpkg）：一度読んだら保存して、次からは保存分を使う */
const V='holdem-0eca5b8919';
const CORE=['./','index.html','poker.html','manifest.webmanifest','icon-180.png','icon-192.png','icon-512.png'];
const EXT=['fonts.googleapis.com','fonts.gstatic.com','unpkg.com'];

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(V).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('holdem-')&&k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});

function netFirst(e){
  return caches.open(V).then(c=>{
    const net=fetch(e.request).then(r=>{if(r&&r.ok)e.waitUntil(c.put(e.request,r.clone()).catch(()=>{}));return r});
    const cached=c.match(e.request,{ignoreSearch:true});
    const slow=new Promise(res=>setTimeout(res,4000)).then(()=>cached);
    return Promise.race([net.catch(()=>null),slow]).then(r=>r||cached).then(r=>r||net);
  });
}
function cacheFirst(e){
  return caches.open(V).then(c=>c.match(e.request).then(hit=>{
    if(hit)return hit;
    return fetch(e.request).then(r=>{if(r&&(r.ok||r.type==='opaque'))e.waitUntil(c.put(e.request,r.clone()).catch(()=>{}));return r});
  }));
}
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const u=new URL(e.request.url);
  if(u.origin===self.location.origin&&u.pathname.startsWith(new URL('./',self.location).pathname))e.respondWith(netFirst(e));
  else if(EXT.includes(u.hostname))e.respondWith(cacheFirst(e));
});
