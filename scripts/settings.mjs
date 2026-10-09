import {ID,defaults,normalize,escape,SERVER_URL,CHARACTER_ITEMS,GLOBAL_ITEMS,DEFAULT_LAYOUT} from './model.mjs';
import {createScene,updateScene,applyLayout,ITEM_LABELS,TEXT_LIMITS} from './scene.mjs';

const GRID_SIZE=20,SNAP_STEP=GRID_SIZE/2;
let editorStyles;
function loadEditorStyles(){
  if(editorStyles)return editorStyles;
  // Load a matching stylesheet even when the world still holds the old module CSS.
  const link=document.createElement('link');link.rel='stylesheet';
  link.href=new URL('../styles/settings.css?v=20261009-controls-1',import.meta.url).href;
  editorStyles=new Promise((resolve,reject)=>{
    link.addEventListener('load',resolve,{once:true});
    link.addEventListener('error',()=>{link.remove();editorStyles=null;reject(new Error('登录页编辑器样式加载失败，请刷新后重试。'));},{once:true});
    document.head.append(link);
  });
  return editorStyles;
}

class PortraitConfig extends foundry.applications.api.ApplicationV2 {
  static DEFAULT_OPTIONS={id:'portrait-login-config',tag:'form',classes:['pl-config'],position:{width:window.innerWidth,height:window.innerHeight},window:{title:'冒险者之门 · 登录页配置',icon:'fas fa-id-card',resizable:false},form:{closeOnSubmit:false,handler:PortraitConfig.save}};
  constructor(options){super(options);this.draft=normalize(game.settings.get(ID,'config'));this.selectedId=this.draft.characters[0]?.id;this.panelOpen=false;this.snapToGrid=false;this.layoutSourceId='';}
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
    const c=this.draft,ch=this.character,sources=c.characters.filter(row=>row.id!==ch?.id);
    if(!sources.some(row=>row.id===this.layoutSourceId))this.layoutSourceId='';
    const field=(label,key,value,type='text',scope='global')=>`<label>${label}<input data-${scope}="${key}" type="${type}" value="${escape(value)}"></label>`;
    const image=(label,key,value,scope='field')=>`<label>${label}<span class="pl-image-field"><input data-${scope}="${key}" value="${escape(value)}"><button type="button" data-command="browse" data-key="${key}" data-scope="${scope}" title="浏览${label}" aria-label="浏览${label}">📁</button></span></label>`;
    const users=game.users.filter(u=>u.role>0);
    const root=document.createElement('div');root.className='pl-editor';
    root.innerHTML=`<div class="pl-editor-canvas"></div><div class="pl-editor-toolbar"><span class="pl-save-status" role="status"></span><button type="button" data-command="snap-grid" aria-pressed="${this.snapToGrid}" title="拖动时按 10px（半格）对齐">网格吸附：${this.snapToGrid?'开':'关'}</button><button type="button" data-command="panel" aria-expanded="${this.panelOpen}" aria-controls="pl-config-panel">角色与页面</button><button type="submit" class="pl-publish">保存并发布</button><button type="button" data-command="close">关闭</button></div><p class="pl-editor-help">拖动调整位置 · 拖动控点调整宽高 · Ctrl + 滚轮缩放 · 双击文字编辑</p><aside id="pl-config-panel" class="pl-config-panel" ${this.panelOpen?'':'hidden'} aria-label="角色与页面设置"><div class="pl-panel-heading"><strong>角色与页面</strong><button type="button" data-command="panel" aria-label="收起设置">✕</button></div><label>当前角色<select data-character-select>${c.characters.map(row=>`<option value="${escape(row.id)}" ${row.id===ch?.id?'selected':''}>${escape(row.name)}${row.enabled?'':'（已隐藏）'}</option>`).join('')}</select></label><div class="pl-config-actions"><button type="button" data-command="add">＋ 新增角色</button><button type="button" data-command="from-users">导入玩家已分配角色</button></div>${ch?`<div class="pl-fields-grid"><label>引用其他角色样式<select data-layout-source ${sources.length?'':'disabled'}><option value="">${sources.length?'选择来源角色':'暂无其他角色'}</option>${sources.map(row=>`<option value="${escape(row.id)}" ${row.id===this.layoutSourceId?'selected':''}>${escape(row.name)}${row.enabled?'':'（已隐藏）'}</option>`).join('')}</select></label><button type="button" data-command="copy-layout" ${this.layoutSourceId?'':'disabled'}>应用样式到当前角色</button></div><p class="pl-config-note">复制姓名、称号、立绘、介绍和特征文字的位置、尺寸与缩放，引用后可独立调整。</p><div class="pl-row-title"><label class="pl-check"><input type="checkbox" data-field="enabled" ${ch.enabled?'checked':''}>显示角色</label><button type="button" data-command="up" title="向前">↑</button><button type="button" data-command="down" title="向后">↓</button><button type="button" data-command="remove">删除</button></div><p class="pl-config-note">姓名、称号、介绍和特征文字可在页面上双击修改。空白文字也可双击填写。介绍与特征文字按 Enter 换行，Ctrl + Enter 完成。</p><div class="pl-fields-grid"><label>绑定登录账户<select data-field="userId"><option value="">不绑定，玩家手动选账户</option>${users.map(u=>`<option value="${escape(u.id)}" ${u.id===ch.userId?'selected':''}>${escape(u.name)}</option>`).join('')}</select></label>${field('角色强调色','color',ch.color,'color','field')}${image('角色卡图片','portrait',ch.portrait)}${image('大立绘（留空使用角色卡图片）','hero',ch.hero)}${image('角色专属背景','background',ch.background)}<label>示例图分栏<select data-field="strip"><option value="-1" ${ch.strip===null?'selected':''}>自定义图片（不分栏）</option>${[0,1,2,3,4].map(n=>`<option value="${n}" ${ch.strip===n?'selected':''}>示例角色 ${n+1}</option>`).join('')}</select></label><label>图片垂直位置<input type="range" min="0" max="100" data-field="position" value="${ch.position}"></label></div><button type="button" data-command="reset-character">重置当前角色布局</button>`:''}<details><summary>页面设置</summary><div class="pl-fields-grid">${field('页面标题','title',c.title)}${field('上方标语','eyebrow',c.eyebrow)}${field('副标题','subtitle',c.subtitle)}${image('全局背景','background',c.background,'global')}${field('主题强调色','accent',c.accent,'color')}${field('角色卡高度（100–260）','cardHeight',c.cardHeight,'number')}</div><button type="button" data-command="reset-global">重置页面元素布局</button></details><div class="pl-config-actions"><button type="button" data-command="export">导出配置</button><button type="button" data-command="import">导入配置</button></div><p class="pl-config-note">发布后刷新登录页即可查看。这里填写的文字、图片和隐藏角色均会公开。</p><a href="${new URL('join',SERVER_URL).href}" target="_blank" rel="noopener">打开登录页 ↗</a></aside>`;
    const canvas=root.querySelector('.pl-editor-canvas');
    canvas.style.setProperty('--pl-grid-size',`${GRID_SIZE}px`);
    createScene(canvas,c,{editing:true,onSelect:id=>this.selectCharacter(id)});
    const login=document.createElement('section');login.className='pl-native-form';login.dataset.plItem='login';login.setAttribute('aria-label','登录卡片预览');
    login.innerHTML=`<h2>启程</h2><p class="pl-status">请选择你的 Foundry 账户</p><div class="form-group"><label class="icon" aria-hidden="true">♙</label><div class="form-fields"><select disabled aria-label="Foundry 登录账户"><option value="">选择账户</option>${users.map(u=>`<option value="${escape(u.id)}">${escape(u.name)}</option>`).join('')}</select></div></div><div class="form-group"><label class="icon" aria-hidden="true">⚿</label><div class="form-fields"><input type="password" disabled placeholder="账户密码（未设置可留空）" aria-label="账户密码"></div></div><button type="button" disabled>进入冒险</button>`;
    canvas.append(login);updateScene(canvas,c,ch);
    const frame=document.createElement('div');frame.className='pl-resize-frame';frame.hidden=true;
    frame.innerHTML='<button type="button" class="pl-resize-handle" data-resize="x" aria-label="调整容器宽度" title="拖动调整宽度，方向键微调（10px）"></button><button type="button" class="pl-resize-handle" data-resize="y" aria-label="调整容器高度" title="拖动调整高度，方向键微调（10px）"></button><button type="button" class="pl-resize-handle" data-resize="xy" aria-label="调整容器宽高" title="拖动调整宽高，方向键微调（10px）"></button>';
    canvas.append(frame);
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
    listen(this.element,'change',event=>{
      if(event.target.matches('[data-character-select]'))this.selectCharacter(event.target.value);
      if(event.target.matches('[data-layout-source]')){this.layoutSourceId=event.target.value;this.element.querySelector('[data-command="copy-layout"]').disabled=!this.layoutSourceId;}
    });
    listen(this.canvas,'pointerdown',event=>this.startDrag(event));
    listen(this.canvas,'pointerover',event=>{
      if(this.drag||this.editingText)return;
      const node=event.target.closest('.pl-editable');if(node){this.resizeKey=node.dataset.plItem;this.refreshResizeFrame();}
    });
    listen(window,'resize',()=>this.refreshResizeFrame());
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
    this.refreshResizeFrame();
  }
  refreshResizeFrame(){
    const frame=this.canvas?.querySelector('.pl-resize-frame');if(!frame)return;
    const node=this.canvas.querySelector(`[data-pl-item="${this.resizeKey}"]`);
    frame.hidden=!node?.classList.contains('pl-editable')||Boolean(this.editingText);if(frame.hidden)return;
    const rect=node.getBoundingClientRect(),bounds=this.canvas.getBoundingClientRect();
    Object.assign(frame.style,{left:`${rect.left-bounds.left}px`,top:`${rect.top-bounds.top}px`,width:`${rect.width}px`,height:`${rect.height}px`});
    // Keep the controls reachable even when the container crosses the canvas edge.
    const place=(x,y)=>({x:Math.max(bounds.left-rect.left+4,Math.min(bounds.right-rect.left-16,x)),y:Math.max(bounds.top-rect.top+4,Math.min(bounds.bottom-rect.top-16,y))});
    const corner=place(rect.width+4,rect.height+4),horizontal=place(rect.width+4,rect.height/2-6),vertical=place(rect.width/2-6,rect.height+4);
    if(Math.abs(horizontal.x-corner.x)<16&&Math.abs(horizontal.y-corner.y)<16)horizontal.y=place(horizontal.x,corner.y+(corner.y+rect.top-bounds.top<24?20:-20)).y;
    if(Math.abs(vertical.x-corner.x)<16&&Math.abs(vertical.y-corner.y)<16)vertical.x=place(corner.x+(corner.x+rect.left-bounds.left<24?20:-20),vertical.y).x;
    for(const [axis,position] of Object.entries({x:horizontal,y:vertical,xy:corner}))Object.assign(frame.querySelector(`[data-resize="${axis}"]`).style,{left:`${position.x}px`,top:`${position.y}px`});
  }
  selectCharacter(id){this.read();this.selectedId=id;this.render({force:true});}
  itemLayout(key){return CHARACTER_ITEMS.includes(key)?this.character?.layout[key]:this.draft.layout[key];}
  startDrag(event){
    if(event.button!==0||!event.isPrimary||this.editingText)return;
    const handle=event.target.closest('[data-resize]');
    const node=handle?this.canvas.querySelector(`[data-pl-item="${this.resizeKey}"]`):event.target.closest('.pl-editable');if(!node)return;
    if(handle)event.preventDefault();
    this.resizeKey=node.dataset.plItem;this.refreshResizeFrame();
    const bounds=this.canvas.getBoundingClientRect();
    this.drag={node,capture:handle??node,resize:handle?.dataset.resize,rect:node.getBoundingClientRect(),key:node.dataset.plItem,id:event.pointerId,x:event.clientX,y:event.clientY,bounds,initial:{...this.itemLayout(node.dataset.plItem)},moved:false};
  }
  moveDrag(event){
    const drag=this.drag;if(!drag||event.pointerId!==drag.id)return;
    const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
    if(!drag.moved&&Math.hypot(dx,dy)<4)return;
    if(!drag.moved){drag.moved=true;drag.capture.setPointerCapture(event.pointerId);drag.node.classList.add('pl-dragging');this.canvas.classList.add('pl-grid-visible');}
    event.preventDefault();
    if(drag.resize){this.resizeContainer(drag.node,drag.resize,drag.rect,dx,dy);return;}
    const layout=this.itemLayout(drag.key),rect=drag.node.getBoundingClientRect();
    const place=(start,delta,size,extent)=>{
      const min=-SNAP_STEP,max=Math.max(min,extent-size+SNAP_STEP),position=start*extent/100+delta;
      const value=this.snapToGrid?Math.round(position/SNAP_STEP)*SNAP_STEP:position;
      const limit=this.snapToGrid?Math.floor(max/SNAP_STEP)*SNAP_STEP:max;
      return Math.max(min,Math.min(limit,value))/extent*100;
    };
    layout.x=place(drag.initial.x,dx,rect.width,drag.bounds.width);
    layout.y=place(drag.initial.y,dy,rect.height,drag.bounds.height);
    applyLayout(drag.node,layout);
    this.refreshResizeFrame();
  }
  resizeContainer(node,axis,rect,dx,dy){
    const layout=this.itemLayout(node.dataset.plItem),bounds=this.canvas.getBoundingClientRect(),css=getComputedStyle(node);
    const size=(start,delta,room,padding)=>{
      const min=Math.ceil(Math.max(20,padding*layout.scale)/SNAP_STEP)*SNAP_STEP;
      const max=Math.max(min,Math.floor(room/SNAP_STEP)*SNAP_STEP);
      return Math.max(min,Math.min(max,Math.round((start+delta)/SNAP_STEP)*SNAP_STEP))/layout.scale;
    };
    if(axis.includes('x'))layout.width=size(rect.width,dx,bounds.right+SNAP_STEP-rect.left,parseFloat(css.paddingLeft)+parseFloat(css.paddingRight)+parseFloat(css.borderLeftWidth)+parseFloat(css.borderRightWidth));
    if(axis.includes('y'))layout.height=size(rect.height,dy,bounds.bottom+SNAP_STEP-rect.top,parseFloat(css.paddingTop)+parseFloat(css.paddingBottom)+parseFloat(css.borderTopWidth)+parseFloat(css.borderBottomWidth));
    applyLayout(node,layout);this.refreshResizeFrame();
  }
  endDrag(event,cancel=false){
    const drag=this.drag;if(!drag||event.pointerId!==drag.id)return;this.drag=null;
    if(cancel){const layout=this.itemLayout(drag.key);delete layout.width;delete layout.height;Object.assign(layout,drag.initial);applyLayout(drag.node,drag.initial);}
    drag.node.classList.remove('pl-dragging');
    this.canvas.classList.remove('pl-grid-visible');
    if(drag.capture.hasPointerCapture(drag.id))drag.capture.releasePointerCapture(drag.id);
    this.suppressClick=drag.moved&&!cancel;
    this.refreshResizeFrame();
  }
  resizeItem(event){
    if(!event.ctrlKey)return;event.preventDefault();
    const node=event.target.closest('.pl-editable');if(!node||this.editingText||this.drag)return;
    const layout=this.itemLayout(node.dataset.plItem);
    const delta=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?this.canvas.clientHeight:1);
    layout.scale=Math.min(3,Math.max(.25,layout.scale*Math.exp(-Math.max(-200,Math.min(200,delta))*.002)));
    applyLayout(node,layout);
    this.resizeKey=node.dataset.plItem;this.refreshResizeFrame();
  }
  startText(event){
    const node=event.target.closest('[data-pl-item]'),key=node?.dataset.plItem;
    if(!TEXT_LIMITS[key]||(CHARACTER_ITEMS.includes(key)&&!this.character)||event.target.closest('[data-resize]'))return;
    if(this.editingText?.node===node)return;
    this.finishText();this.drag=null;event.preventDefault();
    const source=CHARACTER_ITEMS.includes(key)?this.character:this.draft;
    this.editingText={node,key,original:source[key]};
    node.contentEditable='plaintext-only';node.setAttribute('role','textbox');node.setAttribute('aria-label',ITEM_LABELS[key]);node.setAttribute('aria-multiline',String(['description','detail'].includes(key)));
    this.refreshResizeFrame();
    node.focus({preventScroll:true});
    const range=document.createRange();range.selectNodeContents(node);const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);
    node.addEventListener('blur',()=>this.finishText(),{once:true,signal:this.listenerAbort.signal});
  }
  finishText(cancel=false){
    const edit=this.editingText;if(!edit)return;this.editingText=null;
    const raw=edit.node.innerText,value=cancel?edit.original:(raw.trim()?raw:'');
    const target=CHARACTER_ITEMS.includes(edit.key)?this.character:this.draft;
    target[edit.key]=value.slice(0,TEXT_LIMITS[edit.key]);this.draft=normalize(this.draft);
    const input=this.element.querySelector(`[data-global="${edit.key}"]`);if(input)input.value=this.draft[edit.key];
    edit.node.removeAttribute('contenteditable');edit.node.removeAttribute('role');edit.node.removeAttribute('aria-label');edit.node.removeAttribute('aria-multiline');
    this.refreshScene();
  }
  keydown(event){
    if(event.isComposing)return;
    if(this.editingText){
      if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();this.finishText(true);return;}
      if(event.key==='Enter'){
        event.stopImmediatePropagation();
        if(!['description','detail'].includes(this.editingText.key)||event.ctrlKey||event.metaKey){event.preventDefault();this.finishText();}
        return;
      }
    }
    const handle=event.target.closest('[data-resize]');
    if(handle&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){
      event.preventDefault();event.stopImmediatePropagation();
      const axis=['ArrowLeft','ArrowRight'].includes(event.key)?'x':'y';
      if(!handle.dataset.resize.includes(axis))return;
      const node=this.canvas.querySelector(`[data-pl-item="${this.resizeKey}"]`),delta=['ArrowLeft','ArrowUp'].includes(event.key)?-SNAP_STEP:SNAP_STEP;
      this.resizeContainer(node,axis,node.getBoundingClientRect(),axis==='x'?delta:0,axis==='y'?delta:0);return;
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
    if(cmd==='snap-grid'){this.snapToGrid=!this.snapToGrid;button.setAttribute('aria-pressed',String(this.snapToGrid));button.textContent=`网格吸附：${this.snapToGrid?'开':'关'}`;return;}
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
    if(cmd==='copy-layout'){
      const source=this.draft.characters.find(c=>c.id===this.layoutSourceId);
      if(!this.character||!source||source.id===this.selectedId)return;
      this.character.layout=Object.fromEntries(CHARACTER_ITEMS.map(key=>[key,{...source.layout[key]}]));
      this.refreshScene();this.element.querySelector('.pl-save-status').textContent=`已引用 ${source.name} 的布局`;return;
    }
    if(cmd==='reset-character'&&this.character)for(const key of CHARACTER_ITEMS)this.character.layout[key]={...DEFAULT_LAYOUT[key]};
    if(cmd==='reset-global')for(const key of GLOBAL_ITEMS)this.draft.layout[key]={...DEFAULT_LAYOUT[key]};
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
