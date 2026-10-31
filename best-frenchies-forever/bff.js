/* Best Frenchies Forever — shared behaviour */
(function(){
  // year
  document.querySelectorAll('[data-year]').forEach(function(e){e.textContent=new Date().getFullYear();});

  // mobile nav
  var burger=document.getElementById('burger'), nav=document.getElementById('nav');
  if(burger&&nav){
    burger.addEventListener('click',function(){nav.classList.toggle('open');});
    nav.querySelectorAll('a').forEach(function(a){a.addEventListener('click',function(){nav.classList.remove('open');});});
  }

  // scroll reveal (re-scannable)
  var io=('IntersectionObserver' in window)?new IntersectionObserver(function(es){
    es.forEach(function(en){if(en.isIntersecting){en.target.classList.add('in');io.unobserve(en.target);}});
  },{threshold:.12,rootMargin:'0px 0px -40px 0px'}):null;
  window.bffReveal=function(root){
    (root||document).querySelectorAll('.rev:not(.in)').forEach(function(el){
      if(io)io.observe(el); else el.classList.add('in');
    });
  };
  window.bffReveal();

  // lightbox
  var lb,lbImg,imgs=[],idx=0;
  function ensure(){
    if(lb)return;
    lb=document.createElement('div');lb.className='lb';
    lb.innerHTML='<span class="x">&times;</span><span class="nav prev">&#8249;</span><img alt=""><span class="nav next">&#8250;</span>';
    document.body.appendChild(lb);
    lbImg=lb.querySelector('img');
    lb.querySelector('.x').onclick=close;
    lb.querySelector('.prev').onclick=function(e){e.stopPropagation();go(-1);};
    lb.querySelector('.next').onclick=function(e){e.stopPropagation();go(1);};
    lb.addEventListener('click',function(e){if(e.target===lb)close();});
    document.addEventListener('keydown',function(e){
      if(!lb.classList.contains('on'))return;
      if(e.key==='Escape')close();else if(e.key==='ArrowLeft')go(-1);else if(e.key==='ArrowRight')go(1);
    });
  }
  function show(){lbImg.src=imgs[idx];}
  function go(d){idx=(idx+d+imgs.length)%imgs.length;show();}
  function close(){lb.classList.remove('on');}
  window.bffLightbox=function(list,start){ensure();imgs=list;idx=start||0;show();lb.classList.add('on');};

  // delegate static galleries: any .gal — clicking an img opens that gallery
  document.addEventListener('click',function(e){
    var im=e.target.closest('.gal img, .hero .shot img, [data-lb]');
    if(!im)return;
    var scope=im.closest('.gal');
    if(scope){
      var all=[].slice.call(scope.querySelectorAll('img')).map(function(x){return x.dataset.full||x.src;});
      window.bffLightbox(all, all.indexOf(im.dataset.full||im.src));
    }else{
      window.bffLightbox([im.dataset.full||im.src],0);
    }
  });
})();
