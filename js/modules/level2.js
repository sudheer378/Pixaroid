/**
 * Pixaroid Level 2 — Shared Enhancement Module
 * Adds: touch support, confetti, comparison slider, back-to-top, share, mobile nav
 */
(function(){
'use strict';

/* ── CONFETTI ──────────────────────────────────────── */
window.pxConfetti = function(opts){
  var canvas=document.createElement('canvas');
  canvas.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999;';
  document.body.appendChild(canvas);
  var ctx=canvas.getContext('2d');
  canvas.width=innerWidth;canvas.height=innerHeight;
  var colors=['#7C6FFF','#FF3CAC','#22D67A','#FFB02E','#14D9C4','#F87171','#60A5FA'];
  var particles=[];
  var count=opts&&opts.count||80;
  for(var i=0;i<count;i++){
    particles.push({x:Math.random()*canvas.width,y:-10,w:Math.random()*10+4,h:Math.random()*6+3,color:colors[Math.floor(Math.random()*colors.length)],rotation:Math.random()*360,speed:Math.random()*3+1.5,drift:(Math.random()-0.5)*2,rotSpeed:(Math.random()-0.5)*8,opacity:1});
  }
  var frame=0,maxFrames=120;
  function draw(){
    ctx.clearRect(0,0,canvas.width,canvas.height); frame++;
    particles.forEach(function(p){
      p.y+=p.speed;p.x+=p.drift;p.rotation+=p.rotSpeed;
      if(frame>maxFrames*0.6)p.opacity=Math.max(0,p.opacity-(1/(maxFrames*0.4)));
      ctx.save();ctx.globalAlpha=p.opacity;ctx.translate(p.x,p.y);ctx.rotate(p.rotation*Math.PI/180);
      ctx.fillStyle=p.color;ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h);ctx.restore();
    });
    if(frame<maxFrames)requestAnimationFrame(draw);else canvas.remove();
  }
  draw();
};

/* ── TOUCH → DRAG-DROP ─────────────────────────────── */
window.pxAddTouch = function(dropzone,onFile){
  if(!dropzone)return;
  dropzone.addEventListener('touchstart',function(){dropzone.style.background='rgba(124,111,255,.12)';},false);
  dropzone.addEventListener('touchend',function(){dropzone.style.background='';},false);
  var hint=dropzone.querySelector('.dh,.dz-hint');
  if(hint&&!/touch/i.test(hint.textContent))hint.textContent='Tap to browse or long-press to paste';
};

/* ── BACK TO TOP ───────────────────────────────────── */
(function(){
  var btn=document.createElement('button');
  btn.id='btt';btn.setAttribute('aria-label','Back to top');
  btn.innerHTML='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"/></svg>';
  btn.style.cssText='position:fixed;bottom:5rem;right:1.25rem;width:40px;height:40px;border-radius:50%;background:rgba(124,111,255,.85);backdrop-filter:blur(8px);border:1px solid rgba(124,111,255,.4);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;opacity:0;transform:translateY(8px);transition:opacity .25s,transform .25s;z-index:90;box-shadow:0 4px 16px rgba(124,111,255,.35);';
  document.body.appendChild(btn);
  window.addEventListener('scroll',function(){
    var show=window.scrollY>400;btn.style.opacity=show?'1':'0';btn.style.transform=show?'translateY(0)':'translateY(8px)';btn.style.pointerEvents=show?'all':'none';
  },{passive:true});
  btn.addEventListener('click',function(){window.scrollTo({top:0,behavior:'smooth'});});
})();

/* ── MOBILE NAV TOGGLE / SAFE INTERNAL NAVIGATION ─── */
(function(){
  var nav=document.querySelector('header.nav,.nav,header.navbar,.navbar');
  if(!nav)return;
  var links=nav.querySelector('.nl,.nav-links');
  if(!links)return;
  if(document.getElementById('mob-menu-btn'))return;

  var btn=document.createElement('button');
  btn.id='mob-menu-btn';btn.type='button';btn.setAttribute('aria-label','Open navigation');btn.setAttribute('aria-expanded','false');
  btn.innerHTML='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>';
  btn.style.cssText='display:none;width:36px;height:36px;border-radius:8px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.06);color:currentColor;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;';

  var inner=nav.querySelector('.ni,.nav-inner,.navbar-inner,.gni');
  if(inner)inner.insertBefore(btn,inner.lastElementChild);

  var drawer=document.createElement('div');
  drawer.id='pixaroid-mobile-nav';
  drawer.setAttribute('aria-label','Mobile navigation');
  drawer.style.cssText='display:none;position:fixed;top:58px;left:0;right:0;max-height:calc(100dvh - 58px);overflow-y:auto;-webkit-overflow-scrolling:touch;background:rgba(7,7,17,.98);backdrop-filter:blur(20px);border-bottom:1px solid rgba(255,255,255,.1);padding:.75rem 1rem 1rem;z-index:1000;box-shadow:0 14px 32px rgba(0,0,0,.28);';

  Array.from(links.querySelectorAll('a')).forEach(function(a){
    var clone=a.cloneNode(true);
    var href=a.getAttribute('href')||'#';
    if(href.charAt(0)==='/')clone.setAttribute('href',href);
    clone.removeAttribute('target');
    clone.style.cssText='display:block;width:100%;padding:.75rem .65rem;font-size:.9375rem;line-height:1.4;color:rgba(255,255,255,.88);border-bottom:1px solid rgba(255,255,255,.06);';
    drawer.appendChild(clone);
  });
  nav.appendChild(drawer);

  var open=false;
  function setOpen(next){
    open=!!next;
    var mobile=window.innerWidth<=768;
    drawer.style.display=open&&mobile?'block':'none';
    btn.setAttribute('aria-expanded',open?'true':'false');
    btn.setAttribute('aria-label',open?'Close navigation':'Open navigation');
    btn.innerHTML=open
      ?'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="6" y2="18"/></svg>'
      :'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>';
  }
  function updateVisibility(){
    var mobile=window.innerWidth<=768;
    btn.style.display=mobile?'flex':'none';
    links.style.display=mobile?'none':'';
    if(!mobile)setOpen(false);
    if(mobile&&open)drawer.style.display='block';
  }
  updateVisibility();
  window.addEventListener('resize',updateVisibility,{passive:true});
  btn.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();setOpen(!open);});
  drawer.addEventListener('click',function(e){
    var link=e.target.closest('a');
    if(link)setOpen(false);
  });
  document.addEventListener('click',function(e){
    if(open&&!nav.contains(e.target))setOpen(false);
  });
})();

/* ── LAZY LOAD IMAGES ──────────────────────────────── */
if('IntersectionObserver' in window){
  var io=new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(e.isIntersecting){
        var img=e.target;
        if(img.dataset.src){img.src=img.dataset.src;delete img.dataset.src;}
        io.unobserve(img);
      }
    });
  },{rootMargin:'200px'});
  document.querySelectorAll('img[data-src]').forEach(function(img){io.observe(img);});
}

/* ── SMOOTH SCROLL REVEAL ──────────────────────────── */
if('IntersectionObserver' in window){
  var revealIO=new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(e.isIntersecting){e.target.style.opacity='1';e.target.style.transform='translateY(0)';revealIO.unobserve(e.target);}
    });
  },{threshold:0.1,rootMargin:'0px 0px -40px 0px'});
  document.querySelectorAll('.hst,.feat,.sec,.card').forEach(function(el,i){
    el.style.opacity='0';el.style.transform='translateY(20px)';
    el.style.transition='opacity .5s ease '+(i*0.06)+'s, transform .5s ease '+(i*0.06)+'s';
    revealIO.observe(el);
  });
}

/* ── COPY TO CLIPBOARD ─────────────────────────────── */
window.pxCopy=function(text,btn){
  navigator.clipboard.writeText(text).then(function(){
    var orig=btn.innerHTML;btn.innerHTML='✓ Copied!';setTimeout(function(){btn.innerHTML=orig;},2000);
  }).catch(function(){});
};

})();
