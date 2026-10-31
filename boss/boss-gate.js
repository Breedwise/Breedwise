/* BOSS shared access gate. Reused by the hub and every module piece.
   Expects: #gate (cover) with #boss-pw, #boss-unlock, #boss-gate-err inside; and #app (content, hidden until unlocked).
   Unlock persists for the session across all BOSS pages via sessionStorage 'boss_ok'. Code: BOSS2026. */
(function(){
  var OK=['d9d2b67dcc9ce4c718b0c6a11096cafc66edc71c77f0db0c1a0a7ddfde876ebe']; // BOSS2026
  function sha(s){return crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)).then(function(b){
    return Array.prototype.map.call(new Uint8Array(b),function(x){return x.toString(16).padStart(2,'0');}).join('');});}
  function reveal(){
    var g=document.getElementById('gate'); if(g)g.remove();
    var app=document.getElementById('app'); if(app){app.hidden=false; app.style.display='';}
    document.documentElement.dispatchEvent(new CustomEvent('boss:unlocked'));
  }
  function fail(){
    var e=document.getElementById('boss-gate-err'); if(e)e.textContent='Incorrect code.';
    var pw=document.getElementById('boss-pw'); if(pw)pw.select();
  }
  function tryUnlock(){
    var pw=document.getElementById('boss-pw'); if(!pw)return;
    var v=(pw.value||'').trim().toUpperCase();
    sha(v).then(function(hex){
      if(OK.indexOf(hex)>=0){try{sessionStorage.setItem('boss_ok','1');}catch(e){}reveal();}
      else fail();
    });
  }
  function init(){
    var ok=false; try{ok=sessionStorage.getItem('boss_ok')==='1';}catch(e){}
    if(ok){reveal();return;}
    var b=document.getElementById('boss-unlock'); if(b)b.addEventListener('click',tryUnlock);
    var pw=document.getElementById('boss-pw'); if(pw)pw.addEventListener('keydown',function(e){if(e.key==='Enter')tryUnlock();});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
