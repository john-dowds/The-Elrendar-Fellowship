const TRACK = document.getElementById('memberTrack');
const DOTS = document.getElementById('memberDots');
const BTN_PREV = document.querySelector('.carousel-nav.prev');
const BTN_NEXT = document.querySelector('.carousel-nav.next');
const VIEWPORT = document.querySelector('.carousel-viewport');

const DATA_URL = 'members.json';
const CLONES = 2; 

let cards = [];
let baseCount = 0;
let index = 0;

let cardInnerW = 0; 
let stepW = 0;  
let centerOffset = 0;
let baseX = 0;

let isAnimating = false;

// gesture state
let isDragging = false;
let dragStartX = 0;
let dragDX = 0;
let pointerId = null;
let wheelAcc = 0;

async function loadData(){
  const res = await fetch(DATA_URL);
  const list = await res.json();
  baseCount = list.length;

  const buildCard = (m) => {
    const li = document.createElement('li');
    li.className = 'member-card';
    li.innerHTML = `
      <figure class="photo-wrap">
        <img class="photo" src="${m.photo || 'assets/members/placeholder.jpg'}" alt="${m.name}" loading="lazy">
      </figure>
      <div class="text-wrap">
        <h3 class="name"><span class="char-name">${m.name}</span> <span class="title">— ${m.title}</span></h3>
        <p class="history">${m.history}</p>
      </div>
    `;
    return li;
  };

  const realEls   = list.map(buildCard);
  const headClone = list.slice(-CLONES).map(buildCard);
  const tailClone = list.slice(0,  CLONES).map(buildCard);

  TRACK.append(...headClone, ...realEls, ...tailClone);
  cards = Array.from(TRACK.children);

  list.forEach((_, i) => {
    const d = document.createElement('button');
    d.className = 'carousel-dot';
    d.type = 'button';
    d.setAttribute('aria-label', `Go to member ${i+1}`);
    d.addEventListener('click', () => goTo(CLONES + i));
    DOTS.appendChild(d);
  });

  index = CLONES;
  measure();
  position(false);
  updateClassesAndDots();

  BTN_PREV.addEventListener('click', () => step(-1));
  BTN_NEXT.addEventListener('click', () => step(1));
  window.addEventListener('keydown', (e)=>{
    if(e.key === 'ArrowLeft') step(-1);
    if(e.key === 'ArrowRight') step(1);
  });

  window.addEventListener('resize', () => { measure(); position(false); });
  TRACK.addEventListener('transitionend', handleLoopJump);
  VIEWPORT.addEventListener('pointerdown', onPointerDown);
  VIEWPORT.addEventListener('pointermove', onPointerMove);
  VIEWPORT.addEventListener('pointerup', onPointerUpCancel);
  VIEWPORT.addEventListener('pointercancel', onPointerUpCancel);
  VIEWPORT.addEventListener('wheel', onWheel, { passive: false });
}

function measure(){
  const first = cards[CLONES];
  const second = cards[CLONES + 1] || first;

  const left0 = first.offsetLeft;
  const left1 = second.offsetLeft;
  stepW = left1 > left0 ? (left1 - left0) : first.offsetWidth;

  cardInnerW = first.offsetWidth;

  const vpW = VIEWPORT.clientWidth;
  centerOffset = (vpW - cardInnerW) / 2;
}

function position(animate = true){
  const x = centerOffset - index * stepW;
  baseX = x;
  TRACK.style.transition = animate ? '' : 'none';
  TRACK.style.transform = `translateX(${x}px)`;
  if(!animate){ void TRACK.offsetHeight; TRACK.style.transition = ''; }
}

function step(dir){
  if(isAnimating) return;
  isAnimating = true;
  index += dir;
  position(true);
  updateClassesAndDots();
}

function handleLoopJump(){
  if(index >= CLONES + baseCount){
    index = CLONES;
    position(false);
  } else if(index < CLONES){
    index = CLONES + baseCount - 1;
    position(false);
  }
  isAnimating = false;
}

function goTo(targetIndex){
  if(isAnimating) return;
  isAnimating = true;
  index = targetIndex;
  position(true);
  updateClassesAndDots();
}

function updateClassesAndDots(){
  cards.forEach((el, i)=>{
    el.classList.toggle('is-center', i === index);
    el.classList.remove('is-near'); 
  });

  const activeBase = ((index - CLONES) % baseCount + baseCount) % baseCount;
  DOTS.querySelectorAll('.carousel-dot').forEach((d, i)=>{
    d.classList.toggle('is-active', i === activeBase);
  });
}

function onPointerDown(e){
  if(isAnimating) return;
  pointerId = e.pointerId;
  isDragging = true;
  dragStartX = e.clientX;
  dragDX = 0;
  VIEWPORT.classList.add('dragging');
  VIEWPORT.setPointerCapture(pointerId);
  TRACK.style.transition = 'none';
}
function onPointerMove(e){
  if(!isDragging) return;
  dragDX = e.clientX - dragStartX;
  TRACK.style.transform = `translateX(${baseX + dragDX}px)`;
}
function onPointerUpCancel(){
  if(!isDragging) return;
  VIEWPORT.classList.remove('dragging');
  TRACK.style.transition = '';
  const THRESH = 60;
  if (Math.abs(dragDX) > THRESH){
    step(dragDX < 0 ? 1 : -1);
  } else {
    position(true);
  }
  isDragging = false;
  dragDX = 0;
  if (pointerId){
    try { VIEWPORT.releasePointerCapture(pointerId); } catch(_) {}
    pointerId = null;
  }
}

function onWheel(e){
  const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
  if (Math.abs(delta) < 1) return;
  e.preventDefault();
  const THRESH = 50;
  wheelAcc += delta;
  if (Math.abs(wheelAcc) > THRESH){
    step(wheelAcc > 0 ? 1 : -1);
    wheelAcc = 0;
  }
}

loadData().catch(err => console.error('Failed to load members.json', err));

