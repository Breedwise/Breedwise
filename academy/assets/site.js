/* Breedwise Academy, shared behavior + content binding.
   Pulls copy from window.BW (content.js). Keeps [bracket] placeholders
   visible so nothing is silently invented. */
(function(){
  "use strict";
  var BW = window.BW || {};

  /* ---------- helpers ---------- */
  function isPlaceholder(v){ return typeof v === "string" && /^\s*\[.*\]\s*$/.test(v); }
  function esc(s){ return String(s==null?"":s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];}); }
  // Render a value: wrap bare [placeholders] in a visible .ph span.
  function val(v){
    if(v==null || v==="") return "";
    return isPlaceholder(v) ? '<span class="ph">'+esc(v)+'</span>' : esc(v);
  }
  function $(s,r){ return (r||document).querySelector(s); }
  function $all(s,r){ return Array.prototype.slice.call((r||document).querySelectorAll(s)); }

  /* ---------- mobile nav ---------- */
  function initNav(){
    var toggle = $(".nav-toggle"), links = $(".nav-links");
    if(!toggle || !links) return;
    toggle.addEventListener("click", function(){
      var open = links.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    $all("a", links).forEach(function(a){
      a.addEventListener("click", function(){ links.classList.remove("open"); toggle.setAttribute("aria-expanded","false"); });
    });
  }

  /* ---------- FAQ accordion ---------- */
  function initFaq(){
    $all(".faq-item").forEach(function(item){
      var q = $(".faq-q", item), a = $(".faq-a", item);
      if(!q || !a) return;
      q.addEventListener("click", function(){
        var open = item.classList.toggle("open");
        q.setAttribute("aria-expanded", open ? "true" : "false");
        a.style.maxHeight = open ? (a.scrollHeight + "px") : "0px";
      });
    });
  }

  /* ---------- operational slot fill ---------- */
  // Any element with data-bw="path.to.value" gets its text/href filled.
  function fillSlots(){
    $all("[data-bw]").forEach(function(el){
      var path = el.getAttribute("data-bw"), v = BW;
      path.split(".").forEach(function(k){ v = (v==null?v:v[k]); });
      if(v==null) return;
      if(el.hasAttribute("data-bw-html")) el.innerHTML = val(v);
      else el.textContent = v; // raw (brackets show literally in plain text slots)
    });
    // Apply link: every [data-apply] anchor
    var apply = BW.applyUrl;
    $all("[data-apply]").forEach(function(a){
      if(apply){ a.setAttribute("href", apply); }
      else {
        a.setAttribute("href", "#apply");
        a.setAttribute("data-ph","1");
        a.title = "Apply link not set yet";
      }
    });
  }

  /* ---------- video slot ----------
     <div class="vslot" data-video="BW.faculty.0.intro_video" data-cap="Intro"></div>
     Filled with an iframe when a URL exists; otherwise shows the play placeholder. */
  function fillVideos(){
    $all("[data-video]").forEach(function(slot){
      var path = slot.getAttribute("data-video"), v = BW;
      path.replace(/^BW\./,"").split(".").forEach(function(k){ v = (v==null?v:v[k]); });
      var cap = slot.getAttribute("data-cap") || "";
      if(v && !isPlaceholder(v) && v!==""){
        if(/\.(mp4|webm)(\?.*)?$/i.test(v)){
          var poster = slot.getAttribute("data-poster");
          if(!poster && /\.video$/.test(path)){ var pp=BW; path.replace(/\.video$/,".poster").replace(/^BW\./,"").split(".").forEach(function(k){ pp=(pp==null?pp:pp[k]); }); if(pp && typeof pp==="string" && !isPlaceholder(pp) && pp!=="") poster=pp; }
          slot.innerHTML = '<video src="'+esc(v)+'" title="'+esc(cap||"Video")+'"'+(poster?' poster="'+esc(poster)+'"':'')+' controls playsinline preload="metadata"></video>';
        } else {
          slot.innerHTML = '<iframe src="'+esc(v)+'" title="'+esc(cap||"Video")+'" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen loading="lazy"></iframe>';
        }
      } else {
        slot.innerHTML = '<div class="play" aria-hidden="true"></div>'+(cap?'<div class="vcap">'+val(cap)+', <span class="ph">video coming soon</span></div>':'<div class="vcap"><span class="ph">video coming soon</span></div>');
      }
    });
  }

  /* ---------- sample-pack form -> CRM ----------
     Posts to the masterclass-optin edge fn (name+email capture -> tool_submissions + CC360).
     Honeypot: hp_field (payload key stays `company` so server trap still catches bots). */
  var OPTIN_FN = "https://xhjdowbnqcsvhtcccuqx.supabase.co/functions/v1/masterclass-optin";
  function initForm(){
    var form = $("#sample-form");
    if(!form) return;
    var msg = $(".msg", form);
    form.addEventListener("submit", function(e){
      e.preventDefault();
      var name = (form.name && form.name.value || "").trim();
      var email = (form.email && form.email.value || "").trim();
      var hp = (form.hp_field && form.hp_field.value || "").trim();
      if(!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){
        msg.style.color = "#E3A14A"; msg.textContent = "Please enter a valid email."; return;
      }
      msg.style.color = ""; msg.textContent = "Sending…";
      var btn = $("button[type=submit]", form); if(btn) btn.disabled = true;
      fetch(OPTIN_FN, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ name:name, email:email, company:hp, source:"academy-sample-pack", tag:"academy-sample-pack" })
      }).then(function(r){ return r.json().catch(function(){return {};}); })
        .then(function(){
          form.reset();
          msg.style.color = "var(--gold)";
          msg.textContent = "Done, check your inbox for the sample lessons.";
        }).catch(function(){
          msg.style.color = "#E3A14A";
          msg.textContent = "Something went wrong. Please email support@breedwise.io and we'll send them over.";
        }).finally(function(){ if(btn) btn.disabled = false; });
    });
  }

  /* ---------- year in footer ---------- */
  function initYear(){ $all("[data-year]").forEach(function(el){ el.textContent = "" + (new Date().getFullYear()); }); }

  document.addEventListener("DOMContentLoaded", function(){
    fillSlots(); fillVideos(); initNav(); initFaq(); initForm(); initYear();
  });
})();

/* ---------- motion: count-up numbers + scroll reveal ---------- */
(function(){
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* count-up on pure-number stats (e.g. 100+, 50+) */
  if(!reduce && 'IntersectionObserver' in window){
    function countUp(el){
      var m=el.textContent.trim().match(/^(\d[\d,]*)(\D*)$/); if(!m) return;
      var target=parseInt(m[1].replace(/,/g,''),10), suf=m[2]||''; if(isNaN(target)) return;
      var dur=1100, t0=null;
      function step(ts){ if(!t0)t0=ts; var p=Math.min((ts-t0)/dur,1), e=1-Math.pow(1-p,3);
        el.textContent=Math.round(target*e).toLocaleString('en-US')+suf; if(p<1) requestAnimationFrame(step); }
      requestAnimationFrame(step);
    }
    var io1=new IntersectionObserver(function(es){ es.forEach(function(e){ if(e.isIntersecting){ countUp(e.target); io1.unobserve(e.target); } }); },{threshold:.5});
    [].forEach.call(document.querySelectorAll('.statbar .num, .statrow .st b, .result .big'),function(el){
      if(/^\d[\d,]*\D*$/.test(el.textContent.trim())) io1.observe(el);
    });
  }

  /* scroll reveal (fade + rise) */
  if(!reduce && 'IntersectionObserver' in window){
    document.body.classList.add('anim');
    var els=[].slice.call(document.querySelectorAll('.card, .result, .fac-big, .phase, .guarantee, .ex, .statrow, .reelwall .vslot, .certbox, .journey li'));
    els.forEach(function(el){ el.classList.add('reveal'); });
    var io2=new IntersectionObserver(function(es){ es.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('in'); io2.unobserve(e.target); } }); },{threshold:.12, rootMargin:'0px 0px -40px 0px'});
    els.forEach(function(el){ io2.observe(el); });
    setTimeout(function(){ els.forEach(function(el){ el.classList.add('in'); }); }, 3500); /* safety */
  }
})();

/* ---------- dropdown nav toggle (click + hover) ---------- */
(function(){
  var tops=document.querySelectorAll('.navtop'); if(!tops.length) return;
  tops.forEach(function(btn){ btn.addEventListener('click',function(e){ e.preventDefault(); var d=btn.closest('.navdrop'), was=d.classList.contains('open');
    document.querySelectorAll('.navdrop').forEach(function(x){x.classList.remove('open')}); if(!was) d.classList.add('open'); }); });
  document.addEventListener('click',function(e){ if(!e.target.closest('.navdrop')) document.querySelectorAll('.navdrop').forEach(function(x){x.classList.remove('open')}); });
})();
