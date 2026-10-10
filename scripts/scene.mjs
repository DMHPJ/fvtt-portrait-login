import {assetURL,paintArt,DEFAULT_LAYOUT} from './model.mjs';

export const ITEM_LABELS={eyebrow:'上方标语',name:'角色姓名',tag:'称号 / 职业',hero:'角色立绘',description:'角色介绍',detail:'底部特征文字',login:'登录卡片',roster:'角色选择器'};
export const TEXT_LIMITS={eyebrow:80,name:80,tag:80,description:1500,detail:160};
export function element(tag,cls,content){
  const node=document.createElement(tag);if(cls)node.className=cls;if(content)node.textContent=content;return node;
}
export function applyLayout(node,layout){
  node.style.left=`${layout.x}%`;node.style.top=`${layout.y}%`;node.style.transform=`scale(${layout.scale})`;
  for(const dimension of ['width','height']){
    if(layout[dimension])node.style.setProperty(dimension,`${layout[dimension]}px`,'important');
    else node.style.removeProperty(dimension);
  }
  node.toggleAttribute('data-pl-height',Boolean(layout.height));
}
export function createScene(root,config,{onSelect,editing=false}={}){
  root.classList.add('pl-stage');
  mountCursorHighlight(root);
  const backdrop=element('div','pl-backdrop');
  const head=element('header','pl-header');
  const brand=element('div','pl-brand');brand.append(element('span','pl-sigil','✧'),element('span','pl-title',config.title));const headingGroup=element('div','pl-heading-group');headingGroup.append(brand);head.append(headingGroup);
  const eyebrow=element('p','pl-eyebrow',config.eyebrow);headingGroup.append(eyebrow);
  const name=element('h1','pl-name'),tag=element('p','pl-tag'),description=element('p','pl-description'),detail=element('p','pl-detail');
  const notebook=element('section','pl-notebook');notebook.setAttribute('aria-label','冒险笔记本');
  const loginPage=element('div','pl-notebook-login');
  const characterPage=element('section','pl-notebook-character');characterPage.id=editing?'pl-editor-character-page':'pl-character-page';characterPage.setAttribute('aria-label','角色档案');
  const pageHeading=element('div','pl-notebook-heading');pageHeading.append(element('span','','角色档案'));
  if(!editing){const close=element('button','pl-notebook-close','×');close.type='button';close.setAttribute('aria-label','收起角色页');close.addEventListener('click',()=>{const selected=root.querySelector('.pl-card[aria-pressed="true"]');onSelect?.(null);selected?.focus({preventScroll:true});});pageHeading.append(close);}
  const body=element('div','pl-notebook-copy');body.append(name,tag,description,detail);characterPage.append(pageHeading,body);
  const rings=element('div','pl-notebook-rings');rings.setAttribute('aria-hidden','true');for(let i=0;i<6;i++)rings.append(element('i'));
  notebook.append(loginPage,characterPage,rings);
  const hero=element('div','pl-hero');hero.setAttribute('aria-hidden','true');
  const roster=element('section','pl-roster');roster.setAttribute('aria-label','选择角色');
  const heading=element('div','pl-roster-heading');heading.append(element('span','pl-subtitle',config.subtitle));
  const cards=element('div','pl-cards');roster.append(heading,cards);
  for(const [key,node] of Object.entries({eyebrow,name,tag,hero,description,detail,roster}))node.dataset.plItem=key;
  for(const node of [backdrop,head,hero,notebook,roster]){node.dataset.plOwned='';root.append(node);}
  for(const c of config.characters.filter(c=>editing||c.enabled)){
    const button=element('button','pl-card');button.type='button';button.dataset.character=c.id;button.setAttribute('aria-controls',characterPage.id);button.setAttribute('aria-expanded','false');button.setAttribute('aria-label',`选择${c.name}`);
    const art=element('span','pl-card-art');paintArt(art,c);const label=element('span','pl-card-label');label.append(element('strong','',c.name),element('small','',c.tag));
    button.classList.toggle('pl-hidden-character',!c.enabled);
    button.append(art,label);button.addEventListener('click',()=>onSelect?.(c.id));cards.append(button);
  }
  if(!cards.children.length)cards.append(element('p','pl-empty',editing?'添加角色，开始编辑登录页。':'还没有配置角色，请使用账户列表登录。'));
  cards.addEventListener('keydown',event=>{
    const buttons=[...cards.querySelectorAll('button')];const i=buttons.indexOf(document.activeElement);if(i<0)return;
    let next=null;if(event.key==='ArrowRight')next=(i+1)%buttons.length;if(event.key==='ArrowLeft')next=(i-1+buttons.length)%buttons.length;
    if(next!==null){event.preventDefault();buttons[next].focus();buttons[next].click();}
  });
}
export function updateScene(root,config,character){
  root.style.setProperty('--pl-accent',config.accent);root.style.setProperty('--pl-character',character?.color||config.accent);root.style.setProperty('--pl-card-height',`${config.cardHeight}px`);
  root.querySelector('.pl-title').textContent=config.title;root.querySelector('.pl-subtitle').textContent=config.subtitle;
  const values={...(character??{name:config.title,tag:'冒险即将开始',description:config.subtitle,detail:''}),eyebrow:config.eyebrow};
  for(const key of Object.keys(TEXT_LIMITS))root.querySelector(`[data-pl-item="${key}"]`).textContent=values[key];
  const artwork=character??{portrait:config.idleHero,hero:config.idleHero,strip:null,position:50};
  const hero=root.querySelector('.pl-hero');hero.hidden=!character&&!assetURL(config.idleHero);paintArt(hero,artwork,{hero:true});
  const background=assetURL(character?.background||config.background);
  const nativeNode=document.querySelector('#main-background');
  const nativeImage=nativeNode?getComputedStyle(nativeNode).backgroundImage:null;
  const worldImage=assetURL(globalThis.game?.world?.background||'ui/backgrounds/setup.webp');
  root.querySelector('.pl-backdrop').style.backgroundImage=background?`url(${JSON.stringify(background)})`:(nativeImage&&nativeImage!=='none'?nativeImage:`url(${JSON.stringify(worldImage)})`);
  const notebook=root.querySelector('.pl-notebook'),page=notebook.querySelector('.pl-notebook-character');
  const previous=notebook.dataset.selectedCharacter,next=character?.id??'';notebook.dataset.selectedCharacter=next;
  if(!next)page.__plTurnAnimation?.cancel();
  if(previous&&next&&previous!==next&&root.isConnected)animateCharacterPage(root);
  notebook.classList.toggle('pl-notebook-open',Boolean(character));page.inert=!character;page.setAttribute('aria-hidden',String(!character));
  for(const node of root.querySelectorAll('[data-pl-item]')){
    if(node.closest('.pl-notebook,.pl-heading-group')){for(const property of ['left','top','transform','width','height'])node.style.removeProperty(property);node.removeAttribute('data-pl-height');continue;}
    const key=node.dataset.plItem;if(key==='hero'&&!character){applyLayout(node,config.idleHeroLayout??DEFAULT_LAYOUT.hero);continue;}applyLayout(node,character?.layout?.[key]??config.layout[key]??DEFAULT_LAYOUT[key]);
  }
  for(const button of root.querySelectorAll('.pl-card')){
    const c=config.characters.find(c=>c.id===button.dataset.character);if(!c)continue;
    button.setAttribute('aria-pressed',String(c.id===character?.id));button.setAttribute('aria-expanded',String(c.id===character?.id));button.setAttribute('aria-label',`选择${c.name}`);
    button.querySelector('strong').textContent=c.name;button.querySelector('small').textContent=c.tag;
    button.classList.toggle('pl-hidden-character',!c.enabled);paintArt(button.querySelector('.pl-card-art'),c);
  }
}

function mountCursorHighlight(root){
  root.__plCursorAbort?.abort();root.querySelector('.pl-cursor-highlight')?.remove();
  const controller=new AbortController();root.__plCursorAbort=controller;
  const cursor=element('div','pl-cursor-highlight');cursor.dataset.plOwned='';cursor.setAttribute('aria-hidden','true');root.append(cursor);
  const listen=(type,handler)=>root.addEventListener(type,handler,{passive:true,signal:controller.signal});
  listen('pointermove',event=>{
    if(event.pointerType==='touch'){cursor.classList.remove('pl-cursor-visible');return;}
    cursor.style.transform=`translate3d(${event.clientX-18}px,${event.clientY-18}px,0)`;cursor.classList.add('pl-cursor-visible');
  });
  listen('pointerleave',()=>cursor.classList.remove('pl-cursor-visible','pl-cursor-pressed'));
  listen('pointerdown',event=>{if(event.pointerType!=='touch')cursor.classList.add('pl-cursor-pressed');});
  for(const type of ['pointerup','pointercancel'])listen(type,()=>cursor.classList.remove('pl-cursor-pressed'));
}

export function animateCharacterPage(root){
  const page=root.querySelector('.pl-notebook-character');
  page?.__plTurnAnimation?.cancel();
  if(!page||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const animation=page.animate([
    {transform:'rotateY(-42deg)',opacity:.55,filter:'brightness(.9)'},
    {transform:'rotateY(-12deg)',opacity:1,filter:'brightness(1)',offset:.65},
    {transform:'rotateY(0deg)',opacity:1,filter:'brightness(1)'}
  ],{duration:340,easing:'cubic-bezier(.2,.7,.2,1)'});
  animation.id='pl-character-switch';page.__plTurnAnimation=animation;
}
