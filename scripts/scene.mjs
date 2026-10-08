import {assetURL,paintArt,DEFAULT_LAYOUT} from './model.mjs';

export const ITEM_LABELS={name:'角色姓名',tag:'称号 / 职业',hero:'角色立绘',description:'角色介绍',detail:'底部特征文字',login:'登录卡片',roster:'角色选择器'};
export const TEXT_LIMITS={name:80,tag:80,description:1500,detail:160};
export function element(tag,cls,content){
  const node=document.createElement(tag);if(cls)node.className=cls;if(content)node.textContent=content;return node;
}
export function applyLayout(node,layout){
  node.style.left=`${layout.x}%`;node.style.top=`${layout.y}%`;node.style.transform=`scale(${layout.scale})`;
}
export function createScene(root,config,{onSelect,editing=false}={}){
  root.classList.add('pl-stage');
  const backdrop=element('div','pl-backdrop');
  const head=element('header','pl-header');
  const brand=element('div','pl-brand');brand.append(element('span','pl-sigil','✧'),element('span','pl-title',config.title));head.append(brand);
  const eyebrow=element('p','pl-eyebrow',config.eyebrow);
  const name=element('h1','pl-name'),tag=element('p','pl-tag'),description=element('p','pl-description'),detail=element('p','pl-detail');
  const hero=element('div','pl-hero');hero.setAttribute('aria-hidden','true');
  const roster=element('section','pl-roster');roster.setAttribute('aria-label','选择角色');
  const heading=element('div','pl-roster-heading');heading.append(element('span','','选择你的冒险者'),element('span','pl-subtitle',config.subtitle));
  const cards=element('div','pl-cards');roster.append(heading,cards);
  const foot=element('p','pl-footer','同赴未知 · 共写传奇');
  for(const [key,node] of Object.entries({name,tag,hero,description,detail,roster}))node.dataset.plItem=key;
  for(const node of [backdrop,head,eyebrow,name,tag,hero,description,detail,roster,foot]){node.dataset.plOwned='';root.append(node);}
  for(const c of config.characters.filter(c=>editing||c.enabled)){
    const button=element('button','pl-card');button.type='button';button.dataset.character=c.id;button.setAttribute('aria-label',`选择${c.name}`);
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
  root.querySelector('.pl-title').textContent=config.title;root.querySelector('.pl-eyebrow').textContent=config.eyebrow;root.querySelector('.pl-subtitle').textContent=config.subtitle;
  const values=character??{name:config.title,tag:'冒险即将开始',description:config.subtitle,detail:''};
  for(const key of Object.keys(TEXT_LIMITS))root.querySelector(`[data-pl-item="${key}"]`).textContent=values[key];
  paintArt(root.querySelector('.pl-hero'),character??{portrait:'',strip:null,position:50},{hero:true});
  const background=assetURL(character?.background||config.background);root.querySelector('.pl-backdrop').style.backgroundImage=background?`url(${JSON.stringify(background)})`:'none';
  for(const node of root.querySelectorAll('[data-pl-item]')){
    const key=node.dataset.plItem;applyLayout(node,character?.layout?.[key]??config.layout[key]??DEFAULT_LAYOUT[key]);
  }
  for(const button of root.querySelectorAll('.pl-card')){
    const c=config.characters.find(c=>c.id===button.dataset.character);if(!c)continue;
    button.setAttribute('aria-pressed',String(c.id===character?.id));button.setAttribute('aria-label',`选择${c.name}`);
    button.querySelector('strong').textContent=c.name;button.querySelector('small').textContent=c.tag;
    button.classList.toggle('pl-hidden-character',!c.enabled);paintArt(button.querySelector('.pl-card-art'),c);
  }
}
