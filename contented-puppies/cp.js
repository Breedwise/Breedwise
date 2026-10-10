/* Contented Puppies Paradise — shared behaviors */
(function(){
  // mobile menu
  var b=document.getElementById('burger'), m=document.getElementById('mnav');
  if(b&&m){b.addEventListener('click',function(){m.classList.toggle('on');});
    m.addEventListener('click',function(e){if(e.target.tagName==='A')m.classList.remove('on');});}

  // header shadow on scroll
  var hdr=document.querySelector('header.site');
  if(hdr){var onScroll=function(){hdr.classList.toggle('scrolled',window.scrollY>12);};onScroll();window.addEventListener('scroll',onScroll,{passive:true});}

  // lightbox
  var lb=document.getElementById('lb');
  if(lb){var lbimg=lb.querySelector('img');
    document.querySelectorAll('[data-full]').forEach(function(el){
      el.addEventListener('click',function(){lbimg.src=el.getAttribute('data-full');lb.classList.add('on');});
    });
    lb.addEventListener('click',function(){lb.classList.remove('on');lbimg.src='';});
    document.addEventListener('keydown',function(e){if(e.key==='Escape'){lb.classList.remove('on');lbimg.src='';}});
  }

  // scroll reveal
  try{
    var io=new IntersectionObserver(function(es){es.forEach(function(en){if(en.isIntersecting){en.target.classList.add('show');io.unobserve(en.target);}});},{threshold:.12,rootMargin:'0px 0px -40px 0px'});
    document.querySelectorAll('.rev').forEach(function(el){io.observe(el);});
  }catch(e){document.querySelectorAll('.rev').forEach(function(el){el.classList.add('show');});}
})();
