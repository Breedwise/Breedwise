/* BOSS Content OS — deck engine. Needs deck.css. Inits after boss-gate reveals #app.
   Arrows / Space / PageDn: next · Left / PageUp: prev · N: speaker notes · F: fullscreen. */
(function(){
  var slides=[], idx=0, started=false;
  function $(s){return document.querySelector(s);}
  function render(){
    var total=0,acc=0;
    slides.forEach(function(s,j){
      s.classList.toggle('on',j===idx);
      var m=parseFloat(s.getAttribute('data-min')||'0.7'); total+=m; if(j<=idx)acc+=m;
    });
    var c=$('#count'); if(c)c.textContent=(idx+1)+' / '+slides.length;
    var f=$('.prog .fill'); if(f)f.style.width=(total?Math.round(acc/total*100):0)+'%';
    var np=$('#notesPanel'); var n=slides[idx]?slides[idx].querySelector('.notes'):null;
    if(np)np.innerHTML=n?n.innerHTML:'<span style="color:var(--faint)">No notes for this slide.</span>';
    try{history.replaceState(null,'','#'+(idx+1));}catch(e){}
  }
  function go(i){ idx=Math.max(0,Math.min(slides.length-1,i)); render(); }
  function fs(){ var el=document.documentElement;
    if(!document.fullscreenElement){(el.requestFullscreen||el.webkitRequestFullscreen||function(){}).call(el);}
    else{(document.exitFullscreen||document.webkitExitFullscreen||function(){}).call(document);} }
  function init(){
    if(started)return; started=true;
    slides=Array.prototype.slice.call(document.querySelectorAll('.slide'));
    if(!slides.length)return;
    var nb=$('#next'),pb=$('#prev'),notesBtn=$('#notesBtn'),fsBtn=$('#fsBtn');
    if(nb)nb.onclick=function(){go(idx+1);};
    if(pb)pb.onclick=function(){go(idx-1);};
    if(notesBtn)notesBtn.onclick=function(){document.body.classList.toggle('noteson');notesBtn.classList.toggle('on',document.body.classList.contains('noteson'));};
    if(fsBtn)fsBtn.onclick=fs;
    document.addEventListener('keydown',function(e){
      if(/^(INPUT|TEXTAREA)$/.test((e.target.tagName||'')))return;
      if(e.key==='ArrowRight'||e.key==='PageDown'||e.key===' '){e.preventDefault();go(idx+1);}
      else if(e.key==='ArrowLeft'||e.key==='PageUp'){e.preventDefault();go(idx-1);}
      else if(e.key==='Home'){go(0);} else if(e.key==='End'){go(slides.length-1);}
      else if(e.key==='n'||e.key==='N'){if(notesBtn)notesBtn.click();}
      else if(e.key==='f'||e.key==='F'){fs();}
    });
    // click right/left third of the slide to navigate
    var wrap=$('#wrap');
    if(wrap)wrap.addEventListener('click',function(e){
      var r=wrap.getBoundingClientRect(); var x=(e.clientX-r.left)/r.width;
      if(x>0.62)go(idx+1); else if(x<0.2)go(idx-1);
    });
    var h=parseInt((location.hash||'').replace('#',''),10);
    go(isNaN(h)?0:h-1);
  }
  document.documentElement.addEventListener('boss:unlocked',init);
  // if gate already removed (no gate element), start now
  if(!document.getElementById('gate')) { if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init); else init(); }
})();
