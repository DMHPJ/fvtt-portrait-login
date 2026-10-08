import {MODULE_URL,SERVER_URL,defaults,normalize,assetURL,paintArt} from './model.mjs';
if (!new URL(location.href).searchParams.has('portraitLoginOff')) {
  let currentRoot=null,currentForm=null,config=null,selectedId=null,signature='',scheduled=false;
  let unregister=null;
  const el=(tag,cls,content)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(content)n.textContent=content;return n;};
  async function loadConfig(){
    const world=globalThis.game?.world?.id;
    const urls=[...(world?[new URL(`storage/${encodeURIComponent(world)}.json`,MODULE_URL)]:[]),new URL('config.json',MODULE_URL)];
    for(const url of urls){try{const response=await fetch(url,{cache:'no-store',credentials:'same-origin'});if(response.ok)return normalize(await response.json());}catch{}}
    return normalize(defaults);
  }
  function restore(){
    unregister?.();observer.disconnect();document.body.classList.remove('pl-active','pl-admin');
    currentRoot?.querySelectorAll('[data-pl-owned]').forEach(n=>n.remove());
    document.querySelector('#pl-backdrop')?.remove();
  }
  function mount(root){
    currentRoot=root;root.querySelectorAll('[data-pl-owned]').forEach(n=>n.remove());
    document.body.classList.add('pl-active');
    document.body.style.setProperty('--pl-accent',config.accent);
    document.body.style.setProperty('--pl-card-height',`${config.cardHeight}px`);
    let backdrop=document.querySelector('#pl-backdrop');if(!backdrop){backdrop=el('div');backdrop.id='pl-backdrop';document.body.prepend(backdrop);}
    const head=el('header','pl-header');
    const brand=el('div','pl-brand');brand.append(el('span','pl-sigil','✧'),el('span','',config.title));head.append(brand);
    const tools=el('nav','pl-tools');
    const admin=el('button','','服务器管理');admin.type='button';admin.addEventListener('click',()=>document.body.classList.toggle('pl-admin'));
    const fallback=el('a','','原始界面');const u=new URL(location.href);u.searchParams.set('portraitLoginOff','1');fallback.href=u.href;
    tools.append(admin,fallback);head.append(tools);
    const story=el('section','pl-story');story.append(el('p','pl-eyebrow',config.eyebrow),el('h1','pl-name'),el('p','pl-tag'),el('p','pl-description'),el('p','pl-detail'));
    const hero=el('div','pl-hero');hero.setAttribute('aria-hidden','true');
    const roster=el('section','pl-roster');roster.setAttribute('aria-label','选择角色');
    const heading=el('div','pl-roster-heading');heading.append(el('span','','选择你的冒险者'),el('span','pl-subtitle',config.subtitle));
    const cards=el('div','pl-cards');roster.append(heading,cards);
    const foot=el('p','pl-footer','同赴未知 · 共写传奇');
    for(const n of [head,story,hero,roster,foot]){n.dataset.plOwned='';root.append(n);}
    for(const c of config.characters.filter(c=>c.enabled)){
      const button=el('button','pl-card');button.type='button';button.dataset.character=c.id;button.setAttribute('aria-label',`选择${c.name}`);
      const art=el('span','pl-card-art');paintArt(art,c);const label=el('span','pl-card-label');label.append(el('strong','',c.name),el('small','',c.tag));
      button.append(art,label);button.addEventListener('click',()=>select(c.id,true));cards.append(button);
    }
    if(!cards.children.length)cards.append(el('p','pl-empty','还没有配置角色，请使用右侧账户列表登录。'));
    cards.addEventListener('keydown',event=>{
      const buttons=[...cards.querySelectorAll('button')];const i=buttons.indexOf(document.activeElement);if(i<0)return;
      let next=null;if(event.key==='ArrowRight')next=(i+1)%buttons.length;if(event.key==='ArrowLeft')next=(i-1+buttons.length)%buttons.length;
      if(next!==null){event.preventDefault();buttons[next].focus();buttons[next].click();}
    });
  }
  function select(id,chooseAccount=false){
    const c=config.characters.find(c=>c.id===id&&c.enabled)??config.characters.find(c=>c.enabled);selectedId=c?.id??null;
    const form=currentRoot.querySelector('#join-game-form');const selector=form?.querySelector('[name="userid"]');
    if(!form||!selector)return;
    if(chooseAccount&&c?.userId){const option=[...selector.options].find(o=>o.value===c.userId);const nextAccount=option&&!option.disabled?c.userId:'';if(selector.value!==nextAccount){const key=form.querySelector('[name="password"]');if(key)key.value='';}selector.value=nextAccount;selector.dispatchEvent(new Event('change',{bubbles:true}));}
    for(const button of currentRoot.querySelectorAll('.pl-card'))button.setAttribute('aria-pressed',String(button.dataset.character===selectedId));
    currentRoot.querySelector('.pl-name').textContent=c?.name||config.title;
    currentRoot.querySelector('.pl-tag').textContent=c?.tag||'冒险即将开始';
    currentRoot.querySelector('.pl-description').textContent=c?.description||config.subtitle;
    currentRoot.querySelector('.pl-detail').textContent=c?.detail||'';
    if(c)paintArt(currentRoot.querySelector('.pl-hero'),c,{hero:true});
    document.body.style.setProperty('--pl-character',c?.color||config.accent);
    const background=assetURL(c?.background||config.background);document.querySelector('#pl-backdrop').style.backgroundImage=background?`url(${JSON.stringify(background)})`:'none';
    const status=form.querySelector('.pl-status');const account=[...selector.options].find(o=>o.value===c?.userId);
    status.textContent=selector.value&&selector.value!==c?.userId?`当前账户：${selector.selectedOptions[0].textContent.trim()}`:c?.userId?(account?(account.disabled?'这个账户已在线，可在下方选择其他账户。':`绑定账户：${account.textContent.trim()}`):'绑定账户不存在，请重新配置。'):'请选择你的 Foundry 账户';
  }
  async function enhance(){
    const root=document.querySelector('#join-game');const form=root?.querySelector('#join-game-form');if(!form)return;
    if(!config)config=await loadConfig();
    if(!root.isConnected)return;
    if(currentRoot!==root)mount(root);
    const selector=form.querySelector('[name="userid"]');if(!selector)return;
    const next=JSON.stringify([...selector.options].map(o=>[o.value,o.disabled,o.textContent]));
    if(currentForm===form&&signature===next)return;signature=next;currentForm=form;unregister?.();
    form.classList.add('pl-native-form');
    const title=form.querySelector('h2');if(title)title.textContent='启程';
    if(!form.querySelector('.pl-status')){const status=el('p','pl-status');status.setAttribute('aria-live','polite');title?.after(status);}
    selector.setAttribute('aria-label','Foundry 登录账户');
    const password=form.querySelector('[name="password"]');password?.setAttribute('placeholder','账户密码（未设置可留空）');password?.setAttribute('aria-label','账户密码');
    const submit=form.querySelector('button[type="submit"]');const label=submit?.querySelector('label');if(label)label.textContent='进入冒险';
    const change=()=>{const bound=config.characters.find(c=>c.enabled&&c.userId===selector.value);select(bound?.id??selectedId,false);};
    selector.addEventListener('change',change);unregister=()=>selector.removeEventListener('change',change);
    for(const button of root.querySelectorAll('.pl-card')){
      const c=config.characters.find(c=>c.id===button.dataset.character);const o=[...selector.options].find(o=>o.value===c.userId);
      button.classList.toggle('pl-online',Boolean(o?.disabled));button.title=o?.disabled?'账户在线':c.name;
    }
    select(selectedId??config.characters.find(c=>c.enabled)?.id,false);
  }
  const observer=new MutationObserver(()=>{if(scheduled)return;scheduled=true;setTimeout(()=>{scheduled=false;enhance().catch(error=>{console.error('Portrait Login:',error);restore();});},40);});
  observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled']});
  enhance().catch(error=>{console.error(error);restore();});
}
