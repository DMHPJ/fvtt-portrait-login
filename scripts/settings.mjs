import {ID,defaults,normalize,escape,SERVER_URL,CHARACTER_ITEMS,DEFAULT_LAYOUT} from './model.mjs';
import {createScene,updateScene,applyLayout,ITEM_LABELS,TEXT_LIMITS} from './scene.mjs';

let editorStyles;
function loadEditorStyles(){
  if(editorStyles)return editorStyles;
  // Load a matching stylesheet even when the world still holds the old module CSS.
  const link=document.createElement('link');link.rel='stylesheet';
  link.href=new URL('../styles/settings.css?v=20261008-editor-2',import.meta.url).href;
  editorStyles=new Promise((resolve,reject)=>{
    link.addEventListener('load',resolve,{once:true});
    link.addEventListener('error',()=>{link.remove();editorStyles=null;reject(new Error('登录页编辑器样式加载失败，请刷新后重试。'));},{once:true});
    document.head.append(link);
  });
  return editorStyles;
}

class PortraitConfig extends foundry.applications.api.ApplicationV2 {
  static DEFAULT_OPTIONS={id:'portrait-login-config',tag:'form',classes:['pl-config'],position:{width:window.innerWidth,height:window.innerHeight},window:{title:'冒险者之门 · 登录页配置',icon:'fas fa-id-card',resizable:false},form:{closeOnSubmit:false,handler:PortraitConfig.save}};
  constructor(options){super(options);this.draft=normalize(game.settings.get(ID,'config'));this.selectedId=this.draft.characters[0]?.id;this.panelOpen=false;}
  get character(){return this.draft.characters.find(c=>c.id===this.selectedId);}
  read(){
    this.finishText();
    const form=this.element;if(!form)return this.draft;
    for(const input of form.querySelectorAll('[data-global]'))this.draft[input.dataset.global]=input.value;
    const c=this.character;
    if(c)for(const input of form.querySelectorAll('[data-field]')){
      const key=input.dataset.field;c[key]=input.type==='checkbox'?input.checked:input.value;
      if(key==='strip')c[key]=Number(input.value)<0?null:Number(input.value);
    }
    this.draft=normalize(this.draft);return this.draft;
  }
  async _renderHTML(){
    await loadEditorStyles();
    const c=this.draft,ch=this.character;
    const field=(label,key,value,type='text',scope='global')=>`<label>${label}<input data-${scope}="${key}" type="${type}" value="${escape(value)}"></label>`;
    const image=(label,key,value,scope='field')=>`<label>${label}<span class="pl-image-field"><input data-${scope}="${key}" value="${escape(value)}"><button type="button" data-command="browse" data-key="${key}" data-scope="${scope}" title="浏览${label}" aria-label="浏览${label}">📁</button></span></label>`;
    const users=game.users.filter(u=>u.role>0);
    const root=document.createElement('div');root.className='pl-editor';
    root.innerHTML=`<div class="pl-editor-canvas"></div><div class="pl-editor-toolbar"><span class="pl-save-status" role="status"></span><button type="button" data-command="panel" aria-expanded="${this.panelOpen}" aria-controls="pl-config-panel">角色与页面</button><button type="submit" class="pl-publish">保存并发布</button><button type="button" data-command="close">关闭</button></div><p class="pl-editor-help">拖动调整位置 · Ctrl + 滚轮缩放 · 双击文字编辑</p><aside id="pl-config-panel" class="pl-config-panel" ${this.panelOpen?'':'hidden'} aria-label="角色与页面设置"><div class="pl-panel-heading"><strong>角色与页面</strong><button type="button" data-command="panel" aria-label="收起设置">✕</button></div><label>当前角色<select data-character-select>${c.characters.map(row=>`<option value="${escape(row.id)}" ${row.id===ch?.id?'selected':''}>${escape(row.name)}${row.enabled?'':'（已隐藏）'}</option>`).join('')}</select></label><div class="pl-config-actions"><button type="button" data-command="add">＋ 新增角色</button><button type="button" data-command="from-users">导入玩家已分配角色</button></div>${ch?`<div class="pl-row-title"><label class="pl-check"><input type="checkbox" data-field="enabled" ${ch.enabled?'checked':''}>显示角色</label><button type="button" data-command="up" title="向前">↑</button><button type="button" data-command="down" title="向后">↓</button><button type="button" data-command="remove">删除</button></div><p class="pl-config-note">姓名、称号、介绍和特征文字可在页面上双击修改。空白文字也可双击填写。</p><div class="pl-fields-grid"><label>绑定登录账户<select data-field="userId"><option value="">不绑定，玩家手动选账户</option>${users.map(u=>`<option value="${escape(u.id)}" ${u.id===ch.userId?'selected':''}>${escape(u.name)}</option>`).join('')}</select></label>${field('角色强调色','color',ch.color,'color','field')}${image('角色卡图片','portrait',ch.portrait)}${image('大立绘（留空使用角色卡图片）','hero',ch.hero)}${image('角色专属背景','background',ch.background)}<label>示例图分栏<select data-field="strip"><option value="-1" ${ch.strip===null?'selected':''}>自定义图片（不分栏）</option>${[0,1,2,3,4].map(n=>`<option value="${n}" ${ch.strip===n?'selected':''}>示例角色 ${n+1}</option>`).join('')}</select></label><label>图片垂直位置<input type="range" min="0" max="100" data-field="position" value="${ch.position}"></label></div><button type="button" data-command="reset-character">重置当前角色布局</button>`:''}<details><summary>页面设置</summary><div class="pl-fields-grid">${field('页面标题','title',c.title)}${field('上方标语','eyebrow',c.eyebrow)}${field('副标题','subtitle',c.subtitle)}${image('全局背景','background',c.background,'global')}${field('主题强调色','accent',c.accent,'color')}${field('角色卡高度（100–260）','cardHeight',c.cardHeight,'number')}</div><button type="button" data-command="reset-global">重置登录卡片和角色选择器布局</button></details><div class="pl-config-actions"><button type="button" data-command="export">导出配置</button><button type="button" data-command="import">导入配置</button></div><p class="pl-config-note">发布后刷新登录页即可查看。这里填写的文字、图片和隐藏角色均会公开。</p><a href="${new URL('join',SERVER_URL).href}" target="_blank" rel="noopener">打开登录页 ↗</a></aside>`;
    const canvas=root.querySelector('.pl-editor-canvas');
    createScene(canvas,c,{editing:true,onSelect:id=>this.selectCharacter(id)});
    const login=document.createElement('section');login.className='pl-native-form';login.dataset.plItem='login';login.setAttribute('aria-label','登录卡片预览');
    login.innerHTML=`<h2>启程</h2><p class="pl-status">请选择你的 Foundry 账户</p><div class="form-group"><label class="icon" aria-hidden="true">♙</label><div class="form-fields"><select disabled aria-label="Foundry 登录账户"><option value="">选择账户</option>${users.map(u=>`<option value="${escape(u.id)}">${escape(u.name)}</option>`).join('')}</select></div></div><div class="form-group"><label class="icon" aria-hidden="true">⚿</label><div class="form-fields"><input type="password" disabled placeholder="账户密码（未设置可留空）" aria-label="账户密码"></div></div><button type="button" disabled>进入冒险</button>`;
    canvas.append(login);updateScene(canvas,c,ch);
    return root;
  }
  _replaceHTML(result,content){content.replaceChildren(result);}
  _onRender(context,options){
    super._onRender(context,options);this.listenerAbort?.abort();this.listenerAbort=new AbortController();
    this.canvas=this.element.querySelector('.pl-editor-canvas');this.drag=null;this.editingText=null;this.suppressClick=false;
    this.element.setAttribute('role','dialog');this.element.setAttribute('aria-modal','true');this.element.setAttribute('aria-label','登录页编辑器');
    const listen=(node,type,handler,extra={})=>node.addEventListener(type,handler,{signal:this.listenerAbort.signal,...extra});
    listen(this.element,'click',event=>this.command(event));
    listen(this.element,'input',event=>{
      if(!event.target.matches('[data-field],[data-global]'))return;
      if(event.target.dataset.field==='portrait')this.element.querySelector('[data-field="strip"]').value='-1';
      this.read();this.refreshScene();
    });
    listen(this.element,'change',event=>{if(event.target.matches('[data-character-select]'))this.selectCharacter(event.target.value);});
    listen(this.canvas,'pointerdown',event=>this.startDrag(event));
    listen(this.canvas,'pointermove',event=>this.moveDrag(event));
    listen(this.canvas,'pointerup',event=>this.endDrag(event));
    listen(this.canvas,'pointercancel',event=>this.endDrag(event,true));
    listen(this.canvas,'lostpointercapture',event=>this.endDrag(event,true));
    listen(this.canvas,'click',event=>{if(this.suppressClick){event.preventDefault();event.stopImmediatePropagation();this.suppressClick=false;}},{capture:true});
    listen(this.canvas,'dragstart',event=>event.preventDefault());
    listen(this.canvas,'wheel',event=>this.resizeItem(event),{passive:false});
    listen(this.canvas,'dblclick',event=>this.startText(event));
    listen(this.element,'keydown',event=>this.keydown(event),{capture:true});
    this.refreshScene();this.element.querySelector('[data-command="panel"]').focus({preventScroll:true});
  }
  refreshScene(){
    updateScene(this.canvas,this.draft,this.character);
    for(const node of this.canvas.querySelectorAll('[data-pl-item]')){
      const key=node.dataset.plItem,editable=Boolean(this.character)||!CHARACTER_ITEMS.includes(key);
      node.classList.toggle('pl-editable',editable);node.dataset.plLabel=ITEM_LABELS[key];
      node.title=editable?`${ITEM_LABELS[key]}：拖动调整位置，Ctrl + 滚轮缩放${TEXT_LIMITS[key]?'，双击编辑':''}`:'';
      if(TEXT_LIMITS[key])node.dataset.placeholder=`双击填写${ITEM_LABELS[key]}`;
    }
    const account=this.canvas.querySelector('.pl-native-form select');account.value=this.character?.userId??'';
    const user=game.users.find(u=>u.id===this.character?.userId);
    this.canvas.querySelector('.pl-status').textContent=user?`绑定账户：${user.name}`:'请选择你的 Foundry 账户';
    for(const option of this.element.querySelectorAll('[data-character-select] option')){
      const c=this.draft.characters.find(c=>c.id===option.value);if(c)option.textContent=`${c.name}${c.enabled?'':'（已隐藏）'}`;
    }
  }
  selectCharacter(id){this.read();this.selectedId=id;this.render({force:true});}
  itemLayout(key){return CHARACTER_ITEMS.includes(key)?this.character?.layout[key]:this.draft.layout[key];}
  startDrag(event){
    if(event.button!==0||!event.isPrimary||this.editingText)return;
    const node=event.target.closest('.pl-editable');if(!node)return;
    const bounds=this.canvas.getBoundingClientRect();
    this.drag={node,key:node.dataset.plItem,id:event.pointerId,x:event.clientX,y:event.clientY,bounds,initial:{...this.itemLayout(node.dataset.plItem)},moved:false};
  }
  moveDrag(event){
    const drag=this.drag;if(!drag||event.pointerId!==drag.id)return;
    const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
    if(!drag.moved&&Math.hypot(dx,dy)<4)return;
    if(!drag.moved){drag.moved=true;drag.node.setPointerCapture(event.pointerId);drag.node.classList.add('pl-dragging');}
    event.preventDefault();
    const layout=this.itemLayout(drag.key),rect=drag.node.getBoundingClientRect();
    layout.x=Math.max(0,Math.min(Math.max(0,100-rect.width/drag.bounds.width*100),drag.initial.x+dx/drag.bounds.width*100));
    layout.y=Math.max(0,Math.min(Math.max(0,100-rect.height/drag.bounds.height*100),drag.initial.y+dy/drag.bounds.height*100));
    applyLayout(drag.node,layout);
  }
  endDrag(event,cancel=false){
    const drag=this.drag;if(!drag||event.pointerId!==drag.id)return;this.drag=null;
    if(cancel){Object.assign(this.itemLayout(drag.key),drag.initial);applyLayout(drag.node,drag.initial);}
    drag.node.classList.remove('pl-dragging');
    if(drag.node.hasPointerCapture(drag.id))drag.node.releasePointerCapture(drag.id);
    this.suppressClick=drag.moved&&!cancel;
  }
  resizeItem(event){
    if(!event.ctrlKey)return;event.preventDefault();
    const node=event.target.closest('.pl-editable');if(!node||this.editingText||this.drag)return;
    const layout=this.itemLayout(node.dataset.plItem);
    const delta=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?this.canvas.clientHeight:1);
    layout.scale=Math.min(3,Math.max(.25,layout.scale*Math.exp(-Math.max(-200,Math.min(200,delta))*.002)));
    applyLayout(node,layout);
  }
  startText(event){
    const node=event.target.closest('[data-pl-item]'),key=node?.dataset.plItem;
    if(!TEXT_LIMITS[key]||!this.character)return;
    if(this.editingText?.node===node)return;
    this.finishText();this.drag=null;event.preventDefault();
    this.editingText={node,key,original:this.character[key]};
    node.contentEditable='plaintext-only';node.setAttribute('role','textbox');node.setAttribute('aria-label',ITEM_LABELS[key]);node.setAttribute('aria-multiline',String(key==='description'));
    node.focus({preventScroll:true});
    const range=document.createRange();range.selectNodeContents(node);const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);
    node.addEventListener('blur',()=>this.finishText(),{once:true,signal:this.listenerAbort.signal});
  }
  finishText(cancel=false){
    const edit=this.editingText;if(!edit)return;this.editingText=null;
    const raw=edit.node.innerText,value=cancel?edit.original:(raw.trim()?raw:'');
    this.character[edit.key]=value.slice(0,TEXT_LIMITS[edit.key]);this.draft=normalize(this.draft);
    edit.node.removeAttribute('contenteditable');edit.node.removeAttribute('role');edit.node.removeAttribute('aria-label');edit.node.removeAttribute('aria-multiline');
    this.refreshScene();
  }
  keydown(event){
    if(this.editingText){
      if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();this.finishText(true);return;}
      if(event.key==='Enter'&&(this.editingText.key!=='description'||!event.shiftKey)){event.preventDefault();event.stopImmediatePropagation();this.finishText();return;}
    }
    if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();if(this.panelOpen){this.panelOpen=false;this.element.querySelector('.pl-config-panel').hidden=true;this.element.querySelector('[data-command="panel"]').setAttribute('aria-expanded','false');}else this.close();}
    if(event.key==='Tab'){
      const nodes=[...this.element.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),summary,[contenteditable]')].filter(node=>node.getClientRects().length);
      const index=nodes.indexOf(document.activeElement);
      if(event.shiftKey&&index<=0){event.preventDefault();nodes.at(-1)?.focus();}
      else if(!event.shiftKey&&(index===nodes.length-1||index<0)){event.preventDefault();nodes[0]?.focus();}
    }
  }
  async command(event){
    const button=event.target.closest('[data-command]');if(!button)return;event.preventDefault();this.read();
    const cmd=button.dataset.command,i=this.draft.characters.findIndex(c=>c.id===this.selectedId);
    if(cmd==='close')return this.close();
    if(cmd==='panel'){this.panelOpen=!this.panelOpen;this.element.querySelector('.pl-config-panel').hidden=!this.panelOpen;this.element.querySelector('[data-command="panel"]').setAttribute('aria-expanded',String(this.panelOpen));return;}
    if(cmd==='browse'){
      const input=this.element.querySelector(`[data-${button.dataset.scope}="${button.dataset.key}"]`);
      const Picker=foundry.applications.apps.FilePicker.implementation;
      return new Picker({type:'image',current:input.value.startsWith('@/')?'':input.value,callback:path=>{if(!input.isConnected)return;input.value=path;input.dispatchEvent(new Event('input',{bubbles:true}));}}).browse();
    }
    if(cmd==='add'){
      if(this.draft.characters.length>=60)return ui.notifications.warn('最多可配置 60 个角色。');
      const ch={...normalize({characters:[{}]}).characters[0],id:foundry.utils.randomID(),name:'新冒险者'};this.draft.characters.push(ch);this.selectedId=ch.id;
    }
    if(cmd==='remove'&&i>=0){this.draft.characters.splice(i,1);this.selectedId=this.draft.characters[Math.min(i,this.draft.characters.length-1)]?.id;}
    if(cmd==='up'&&i>0)[this.draft.characters[i-1],this.draft.characters[i]]=[this.draft.characters[i],this.draft.characters[i-1]];
    if(cmd==='down'&&i>=0&&i<this.draft.characters.length-1)[this.draft.characters[i+1],this.draft.characters[i]]=[this.draft.characters[i],this.draft.characters[i+1]];
    if(cmd==='reset-character'&&this.character)for(const key of CHARACTER_ITEMS)this.character.layout[key]={...DEFAULT_LAYOUT[key]};
    if(cmd==='reset-global')for(const key of ['login','roster'])this.draft.layout[key]={...DEFAULT_LAYOUT[key]};
    if(cmd==='from-users')for(const u of game.users.filter(u=>u.role>0&&u.character)){
      if(this.draft.characters.length>=60)break;
      if(this.draft.characters.some(c=>c.userId===u.id))continue;
      this.draft.characters.push({...normalize({characters:[{}]}).characters[0],id:foundry.utils.randomID(),userId:u.id,name:u.character.name,portrait:u.character.img,tag:u.name});
    }
    if(cmd==='from-users'&&!this.character)this.selectedId=this.draft.characters[0]?.id;
    if(cmd==='export'){foundry.utils.saveDataToFile(JSON.stringify(this.draft,null,2),'application/json',`portrait-login-${game.world.id}.json`);return;}
    if(cmd==='import'){
      const picker=document.createElement('input');picker.type='file';picker.accept='.json,application/json';picker.addEventListener('change',async()=>{
        try{const file=picker.files[0];if(!file)return;if(file.size>1_000_000)throw new Error('配置文件过大');const raw=JSON.parse(await file.text());if(!Array.isArray(raw?.characters))throw new Error('配置中缺少 characters 列表');this.draft=normalize(raw);this.selectedId=this.draft.characters[0]?.id;this.render({force:true});}catch(error){ui.notifications.error(`导入失败：${error.message}`);}
      });picker.click();return;
    }
    this.render({force:true});
  }
  async close(options){
    await super.close(options);this.listenerAbort?.abort();this.drag=null;this.editingText=null;return this;
  }
  static async save(event,form){
    if(!game.user.isGM)return ui.notifications.error('仅GM可以发布登录页配置。');
    if(this.saving)return;this.saving=true;
    const config=normalize(this.read());const status=form.querySelector('.pl-save-status');const submit=form.querySelector('[type="submit"]');submit.disabled=true;status.textContent='正在发布…';
    try{
      const file=new File([JSON.stringify(config,null,2)],`${game.world.id}.json`,{type:'application/json'});
      const result=await foundry.applications.apps.FilePicker.implementation.uploadPersistent(ID,'',file,{}, {notify:false});
      if(!result?.path)throw new Error('配置文件上传失败，请检查Data目录写入权限。');
      await game.settings.set(ID,'config',config);status.textContent='已发布，刷新登录页即可查看';ui.notifications.info('角色登录页配置已发布。');
    }catch(error){status.textContent=`发布失败：${error.message}`;ui.notifications.error(status.textContent);}finally{this.saving=false;submit.disabled=false;}
  }
}
Hooks.once('init',()=>{
  game.settings.register(ID,'config',{scope:'world',config:false,type:Object,default:defaults});
  game.settings.registerMenu(ID,'configure',{name:'角色登录页',label:'配置角色立绘与账户',hint:'全屏编辑登录页，拖动、缩放和修改角色内容，保存并发布后刷新登录页即可查看。',icon:'fas fa-id-card',type:PortraitConfig,restricted:true});
});
Hooks.once('ready',()=>{game.modules.get(ID).api={openConfig:()=>{if(!game.user.isGM)return;return new PortraitConfig().render({force:true});}};});
