import {MODULE_URL,defaults,normalize} from './model.mjs';
import {element as el,createScene,updateScene} from './scene.mjs';
if (!new URL(location.href).searchParams.has('portraitLoginOff')) {
  let currentRoot=null,currentForm=null,config=null,selectedId=null,signature='',scheduled=false;
  let unregister=null;
  async function loadConfig(){
    const world=globalThis.game?.world?.id;
    const urls=[...(world?[new URL(`storage/${encodeURIComponent(world)}.json`,MODULE_URL)]:[]),new URL('config.json',MODULE_URL)];
    for(const url of urls){try{const response=await fetch(url,{cache:'no-store',credentials:'same-origin'});if(response.ok)return normalize(await response.json());}catch{}}
    return normalize(defaults);
  }
  function restore(){
    unregister?.();observer.disconnect();document.body.classList.remove('pl-active','pl-admin');
    document.documentElement.classList.remove('pl-page');
    currentRoot?.querySelectorAll('[data-pl-owned]').forEach(n=>n.remove());
    currentRoot?.classList.remove('pl-stage');
    const form=currentRoot?.querySelector('#join-game-form');
    if(form){delete form.dataset.plItem;form.style.removeProperty('left');form.style.removeProperty('top');form.style.removeProperty('transform');}
  }
  function mount(root){
    currentRoot=root;root.querySelectorAll('[data-pl-owned]').forEach(n=>n.remove());
    document.body.classList.add('pl-active');
    document.documentElement.classList.add('pl-page');
    createScene(root,config,{onSelect:id=>select(id,true)});
    const head=root.querySelector('.pl-header');
    const tools=el('nav','pl-tools');
    const admin=el('button','','服务器管理');admin.type='button';admin.addEventListener('click',()=>document.body.classList.toggle('pl-admin'));
    const fallback=el('a','','原始界面');const u=new URL(location.href);u.searchParams.set('portraitLoginOff','1');fallback.href=u.href;
    tools.append(admin,fallback);head.append(tools);
  }
  function select(id,chooseAccount=false){
    const c=config.characters.find(c=>c.id===id&&c.enabled)??config.characters.find(c=>c.enabled);selectedId=c?.id??null;
    const form=currentRoot.querySelector('#join-game-form');const selector=form?.querySelector('[name="userid"]');
    if(!form||!selector)return;
    if(chooseAccount&&c?.userId){const option=[...selector.options].find(o=>o.value===c.userId);const nextAccount=option&&!option.disabled?c.userId:'';if(selector.value!==nextAccount){const key=form.querySelector('[name="password"]');if(key)key.value='';}selector.value=nextAccount;selector.dispatchEvent(new Event('change',{bubbles:true}));}
    updateScene(currentRoot,config,c);
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
    form.dataset.plItem='login';
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
