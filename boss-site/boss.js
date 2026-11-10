/* BreedWise B.O.S.S. — shared behavior */
(function(){
  // year
  document.querySelectorAll('[data-yr]').forEach(function(el){el.textContent=new Date().getFullYear();});

  // mobile menu
  var burger=document.getElementById('burger'), menu=document.getElementById('mobilemenu');
  if(burger&&menu){
    var tog=function(open){burger.classList.toggle('open',open);menu.classList.toggle('open',open);document.body.style.overflow=open?'hidden':'';};
    burger.addEventListener('click',function(){tog(!menu.classList.contains('open'));});
    menu.querySelectorAll('a').forEach(function(a){a.addEventListener('click',function(){tog(false);});});
  }

  // reveal on scroll
  var rv=document.querySelectorAll('.rv');
  if('IntersectionObserver' in window && rv.length){
    var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('show');io.unobserve(e.target);}});},{threshold:.12,rootMargin:'0px 0px -6% 0px'});
    rv.forEach(function(el,i){el.style.transitionDelay=(Math.min(i%3,2)*0.08)+'s';io.observe(el);});
  }else{rv.forEach(function(el){el.classList.add('show');});}

  // count-up stats
  var counted=false;
  function runCounts(){
    if(counted)return; counted=true;
    document.querySelectorAll('[data-count]').forEach(function(el){
      var target=parseFloat(el.getAttribute('data-count')), dec=(target%1!==0)?1:0, dur=1400, t0=null;
      function step(ts){ if(!t0)t0=ts; var p=Math.min((ts-t0)/dur,1); var val=(target*(0.2+0.8*(p<.5?2*p*p:1-Math.pow(-2*p+2,2)/2)));
        el.textContent=val.toFixed(dec); if(p<1)requestAnimationFrame(step); else el.textContent=target.toFixed(dec); }
      requestAnimationFrame(step);
    });
  }
  var statsSec=document.getElementById('stats');
  if(statsSec&&'IntersectionObserver' in window){
    var so=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){runCounts();so.disconnect();}});},{threshold:.4});
    so.observe(statsSec);
  }else{runCounts();}

  // proof-wall tabs
  var tabs=document.querySelectorAll('.tab[data-filter]');
  if(tabs.length){
    tabs.forEach(function(tab){
      tab.addEventListener('click',function(){
        tabs.forEach(function(t){t.setAttribute('aria-selected','false');});
        tab.setAttribute('aria-selected','true');
        var f=tab.getAttribute('data-filter');
        document.querySelectorAll('.qcard').forEach(function(c){
          var cat=c.getAttribute('data-cat')||'';
          c.classList.toggle('hide', f!=='all' && cat!==f);
        });
      });
    });
  }

  // VSL placeholder
  document.querySelectorAll('.vsl .play').forEach(function(p){
    p.addEventListener('click',function(){
      var ph=p.parentElement.querySelector('.ph'); if(ph)ph.textContent='Paste your VSL embed here';
    });
  });

  // application form -> masterclass-optin (BOSS Application)
  var form=document.getElementById('applyForm');
  if(form){
    var OPTIN='https://xhjdowbnqcsvhtcccuqx.supabase.co/functions/v1/masterclass-optin';
    form.addEventListener('submit',function(e){
      e.preventDefault();
      if(form.company_url && form.company_url.value) return; // honeypot
      var out=document.getElementById('applyMsg');
      var g=function(id){var el=document.getElementById(id);return el?el.value.trim():'';};
      var name=g('a-name'), email=g('a-email'), phone=g('a-phone'),
          breed=g('a-breed'), rev=g('a-rev'), goal=g('a-goal');
      if(!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !phone){
        if(out){out.style.color='#e0896f';out.textContent='Add your name, a valid email, and a phone number.';}
        return;
      }
      var btn=document.getElementById('applyBtn'); btn.disabled=true; btn.textContent='Sending…';
      var message='[BOSS Application] Breed: '+breed+' | Monthly revenue: '+rev+' | Biggest goal: '+goal;
      fetch(OPTIN,{method:'POST',headers:{'Content-Type':'application/json','apikey':'public'},
        body:JSON.stringify({name:name,email:email,phone:phone,source:'BOSS Application',message:message,notes:message})})
      .then(function(r){return r.ok?r.json():Promise.reject(r);})
      .then(function(){
        var card=document.getElementById('formCard');
        if(card)card.innerHTML='<div class="done"><div class="ic">✦</div><h3>Application received, '+name.replace(/[<>&]/g,'')+'.</h3>'+
          '<p>If your program looks like a fit, Regina will reach out to book your call. Keep an eye on your email and phone.</p></div>';
      })
      .catch(function(){
        btn.disabled=false; btn.textContent='Submit Application →';
        if(out){out.style.color='#e0896f';out.textContent='Something went wrong. Please try again, or email support@breedwise.io.';}
      });
    });
  }
})();
