/* Kennel OS — service worker: installable app shell + push delivery.
   Network-first so a breeder always gets fresh records when they have
   signal, cache-fallback so the app still opens in a barn with none. */
var CACHE='kennel-os-v1';
var SHELL='kennel-os.html';

self.addEventListener('install',function(){self.skipWaiting();});
self.addEventListener('activate',function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.map(function(k){return k===CACHE?null:caches.delete(k);}));
  }).then(function(){return self.clients.claim();}));
});

self.addEventListener('fetch',function(e){
  var req=e.request;
  if(req.method!=='GET')return;
  var url=new URL(req.url);
  if(url.origin!==self.location.origin)return;      // Supabase + fonts pass through
  e.respondWith(
    fetch(req).then(function(res){
      if(res&&res.status===200){
        var copy=res.clone();
        caches.open(CACHE).then(function(c){c.put(req,copy);});
      }
      return res;
    }).catch(function(){
      return caches.match(req).then(function(m){return m||caches.match(SHELL);});
    })
  );
});

self.addEventListener('push',function(e){
  var d={};
  try{d=e.data?e.data.json():{};}catch(err){d={title:'Kennel OS',body:e.data?e.data.text():''};}
  e.waitUntil(self.registration.showNotification(d.title||'Kennel OS',{
    body:d.body||'',
    icon:d.icon||'breedwise-logo.png',
    badge:d.icon||'breedwise-logo.png',
    data:{url:d.url||SHELL},
    tag:'kos-daily'
  }));
});

self.addEventListener('notificationclick',function(e){
  e.notification.close();
  var target=(e.notification.data&&e.notification.data.url)||SHELL;
  e.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(function(ws){
    for(var i=0;i<ws.length;i++){
      if(ws[i].url.indexOf('kennel-os')>=0&&'focus' in ws[i])return ws[i].focus();
    }
    return self.clients.openWindow(target);
  }));
});
