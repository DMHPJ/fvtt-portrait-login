import {ID,defaults,normalize,escape,assetURL,paintArt,SERVER_URL} from './model.mjs';
class PortraitConfig extends foundry.applications.api.ApplicationV2 {
  static DEFAULT_OPTIONS={id:'portrait-login-config',tag:'form',classes:['pl-config'],position:{width:940,height:740},window:{title:'冒险者之门 · 登录页配置',icon:'fas fa-id-card',resizable:true},form:{closeOnSubmit:false,handler:PortraitConfig.save}};
  constructor(options){super(options);this.draft=normalize(game.settings.get(ID,'config'));}
  read(){
    const form=this.element;if(!form)return this.draft;
    const result={...this.draft};for(const key of ['title','subtitle','eyebrow','background','accent','cardHeight'])result[key]=form.querySelector(`[name="${key}"]`)?.value??result[key];
    result.characters=[...form.querySelectorAll('[data-character-row]')].map((row,i)=>{
      const c={...this.draft.characters[i]};for(const input of row.querySelectorAll('[data-field]'))c[input.dataset.field]=input.type==='checkbox'?input.checked:input.value;
      c.strip=Number(c.strip);if(c.strip<0)c.strip=null;return c;
    });return normalize(result);
  }
  async _renderHTML(){
    const c=this.draft;const field=(label,name,value,type='text')=>`<label>${label}<input name="${name}" type="${type}" value="${escape(value)}"></label>`;
    const image=(label,key,value)=>`<label>${label}<span class="pl-image-field"><input data-field="${key}" value="${escape(value)}" placeholder="通过右侧按钮选择图片"><button type="button" data-command="browse" data-key="${key}" title="浏览图片">📁</button></span></label>`;
    const root=document.createElement('div');root.className='pl-editor';
    root.innerHTML=`<p class="pl-config-intro">大立绘 · 角色卡 · 原生账户登录。设置按世界独立保存，发布后刷新登录页即可生效。</p><div class="pl-config-global">${field('页面标题','title',c.title)}${field('上方英文标语','eyebrow',c.eyebrow)}${field('副标题','subtitle',c.subtitle)}<label>全局背景图片<span class="pl-image-field"><input name="background" value="${escape(c.background)}"><button type="button" data-command="browse-background">📁</button></span></label>${field('主题强调色','accent',c.accent,'color')}${field('角色卡高度（100–260）','cardHeight',c.cardHeight,'number')}</div><div class="pl-config-actions"><button type="button" data-command="add">＋ 新增角色</button><button type="button" data-command="from-users">导入玩家已分配角色</button><button type="button" data-command="export">导出配置</button><button type="button" data-command="import">导入配置</button></div><p class="pl-config-note">登录页会公开展示这里填写的文字与图片。账户密码始终使用 Foundry 原生表单。</p><div class="pl-config-rows"></div><footer class="pl-config-footer"><span class="pl-save-status" role="status"></span><a href="${new URL('join',SERVER_URL).href}" target="_blank" rel="noopener">打开登录页 ↗</a><button type="submit" class="pl-publish">保存并发布</button></footer>`;
    const container=root.querySelector('.pl-config-rows');
    const users=game.users.filter(u=>u.role>0);
    c.characters.forEach((ch,i)=>{
      const row=document.createElement('section');row.dataset.characterRow=String(i);row.className='pl-config-row';
      const input=(label,key,value)=>`<label>${label}<input data-field="${key}" value="${escape(value)}"></label>`;
      row.innerHTML=`<div class="pl-editor-preview"></div><div class="pl-row-fields"><div class="pl-row-title"><strong>角色 ${i+1}</strong><label class="pl-check"><input type="checkbox" data-field="enabled" ${ch.enabled?'checked':''}>显示</label><button type="button" data-command="up" title="向前">↑</button><button type="button" data-command="down" title="向后">↓</button><button type="button" data-command="remove">删除</button></div><div class="pl-fields-grid">${input('角色名称','name',ch.name)}${input('称号 / 职业','tag',ch.tag)}<label>绑定登录账户<select data-field="userId"><option value="">不绑定，玩家手动选账户</option>${users.map(u=>`<option value="${escape(u.id)}" ${u.id===ch.userId?'selected':''}>${escape(u.name)}</option>`).join('')}</select></label><label>角色强调色<input type="color" data-field="color" value="${ch.color}"></label>${image('底部卡片插画','portrait',ch.portrait)}${image('大立绘（留空使用卡片图）','hero',ch.hero)}${image('角色专属背景（可留空）','background',ch.background)}<label>示例图分栏<select data-field="strip"><option value="-1" ${ch.strip===null?'selected':''}>自定义图片（不分栏）</option>${[0,1,2,3,4].map(n=>`<option value="${n}" ${ch.strip===n?'selected':''}>示例角色 ${n+1}</option>`).join('')}</select></label><label class="pl-span2">角色介绍<textarea data-field="description" rows="2">${escape(ch.description)}</textarea></label>${input('底部特征文字','detail',ch.detail)}<label>卡片图片垂直位置<input type="range" min="0" max="100" data-field="position" value="${ch.position}"></label></div></div>`;
      paintArt(row.querySelector('.pl-editor-preview'),ch);container.append(row);
    });return root;
  }
  _replaceHTML(result,content){content.replaceChildren(result);}
  _onRender(context,options){
    super._onRender(context,options);this.listenerAbort?.abort();this.listenerAbort=new AbortController();
    this.element.addEventListener('click',e=>this.command(e),{signal:this.listenerAbort.signal});
    this.element.addEventListener('input',e=>{if(e.target.dataset.field==='portrait')e.target.closest('[data-character-row]').querySelector('[data-field="strip"]').value='-1';const row=e.target.closest('[data-character-row]');if(row){const draft=this.read();paintArt(row.querySelector('.pl-editor-preview'),draft.characters[Number(row.dataset.characterRow)]);}}, {signal:this.listenerAbort.signal});
  }
  async command(event){
    const button=event.target.closest('[data-command]');if(!button)return;event.preventDefault();this.draft=this.read();
    const cmd=button.dataset.command;const row=button.closest('[data-character-row]');const i=Number(row?.dataset.characterRow);
    if(cmd==='browse'||cmd==='browse-background'){
      const input=cmd==='browse-background'?this.element.querySelector('[name="background"]'):row.querySelector(`[data-field="${button.dataset.key}"]`);
      const Picker=foundry.applications.apps.FilePicker.implementation;
      return new Picker({type:'image',current:input.value.startsWith('@/')?'':input.value,callback:path=>{input.value=path;input.dispatchEvent(new Event('input',{bubbles:true}));}}).browse();
    }
    if(cmd==='add')this.draft.characters.push({...normalize({characters:[{}]}).characters[0],id:foundry.utils.randomID(),name:'新冒险者'});
    if(cmd==='remove')this.draft.characters.splice(i,1);
    if(cmd==='up'&&i>0)[this.draft.characters[i-1],this.draft.characters[i]]=[this.draft.characters[i],this.draft.characters[i-1]];
    if(cmd==='down'&&i<this.draft.characters.length-1)[this.draft.characters[i+1],this.draft.characters[i]]=[this.draft.characters[i],this.draft.characters[i+1]];
    if(cmd==='from-users')for(const u of game.users.filter(u=>u.role>0&&u.character)){
      if(this.draft.characters.some(c=>c.userId===u.id))continue;
      this.draft.characters.push({...normalize({characters:[{}]}).characters[0],id:foundry.utils.randomID(),userId:u.id,name:u.character.name,portrait:u.character.img,tag:u.name});
    }
    if(cmd==='export'){foundry.utils.saveDataToFile(JSON.stringify(this.draft,null,2),'application/json',`portrait-login-${game.world.id}.json`);return;}
    if(cmd==='import'){
      const picker=document.createElement('input');picker.type='file';picker.accept='.json,application/json';picker.addEventListener('change',async()=>{
        try{const file=picker.files[0];if(file.size>1_000_000)throw new Error('配置文件过大');const raw=JSON.parse(await file.text());if(!Array.isArray(raw.characters))throw new Error('配置中缺少 characters 列表');this.draft=normalize(raw);this.render({force:true});}catch(error){ui.notifications.error(`导入失败：${error.message}`);}
      });picker.click();return;
    }
    this.render({force:true});
  }
  static async save(event,form){
    if(!game.user.isGM)return ui.notifications.error('仅GM可以发布登录页配置。');
    const config=this.read();const status=form.querySelector('.pl-save-status');const submit=form.querySelector('[type="submit"]');submit.disabled=true;status.textContent='正在发布…';
    try{
      const file=new File([JSON.stringify(config,null,2)],`${game.world.id}.json`,{type:'application/json'});
      const result=await foundry.applications.apps.FilePicker.implementation.uploadPersistent(ID,'',file,{}, {notify:false});
      if(!result?.path)throw new Error('配置文件上传失败，请检查Data目录写入权限。');
      await game.settings.set(ID,'config',config);this.draft=config;status.textContent='已发布，刷新登录页即可查看';ui.notifications.info('角色登录页配置已发布。');
    }catch(error){status.textContent=`发布失败：${error.message}`;ui.notifications.error(status.textContent);}finally{submit.disabled=false;}
  }
}
Hooks.once('init',()=>{
  game.settings.register(ID,'config',{scope:'world',config:false,type:Object,default:defaults});
  game.settings.registerMenu(ID,'configure',{name:'角色登录页',label:'配置角色立绘与账户',hint:'自定义背景、角色卡、立绘、介绍和账户绑定；保存并发布后登录页立即可用。',icon:'fas fa-id-card',type:PortraitConfig,restricted:true});
});
Hooks.once('ready',()=>{game.modules.get(ID).api={openConfig:()=>{if(!game.user.isGM)return;return new PortraitConfig().render({force:true});}};});
