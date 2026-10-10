import fs from 'node:fs';
import path from 'node:path';
const args=process.argv.slice(2),arg=name=>{const i=args.indexOf(name);return i>=0?args[i+1]:null;};
const app=arg('--app'),mode=args.includes('--restore')?'restore':args.includes('--install')?'install':args.includes('--check')?'check':null;
if(!app||!mode){console.log('用法：node install.mjs --app "Foundry resources/app 或解压程序目录" --install|--restore|--check');process.exit(1);}
const root=path.resolve(app),pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
if(pkg.name!=='foundryvtt'||pkg.release?.generation!==13||pkg.release?.build!==351)throw new Error('本接入器仅支持经过检查的 Foundry 13.351。');
const start='<!-- portrait-login:v1:start -->',end='<!-- portrait-login:v1:end -->';
const serverStart='/* portrait-login:v2:start */',serverEnd='/* portrait-login:v2:end */';
const assets='<link rel="stylesheet" href="modules/portrait-login/styles/login.css">\n<script type="module" src="modules/portrait-login/scripts/login.mjs"></script>';
const legacy=`${start}\n${assets}\n${end}`;
const block=`${start}\n{{#if portraitLoginEnabled}}\n${assets}\n{{/if}}\n${end}`;
// Join data intentionally lacks world module settings. Expose only this boolean while rendering.
const serverBlock=`${serverStart}portraitLoginEnabled:(await globalThis.db.Setting.getValue("core.moduleConfiguration"))?.["portrait-login"]===true,${serverEnd}`;
const specs=[
  {relative:'templates/views/join.hbs',start,end,block,known:[legacy,block],template:true},
  {relative:'dist/server/views/join.mjs',start:serverStart,end:serverEnd,block:serverBlock,known:[serverBlock]}
];
function inspect(spec){
  const target=path.join(root,spec.relative),source=fs.readFileSync(target,'utf8'),backup=target+'.portrait-login-backup';
  const begin=source.indexOf(spec.start),finish=source.indexOf(spec.end);
  if((begin<0)!==(finish<0)||finish<begin||(begin>=0&&(source.indexOf(spec.start,begin+spec.start.length)>=0||source.indexOf(spec.end,finish+spec.end.length)>=0)))throw new Error(`${spec.relative} 接入标记不完整或重复，未做任何修改。`);
  const installed=begin>=0,current=installed?source.slice(begin,finish+spec.end.length):null;
  if(installed&&!spec.known.includes(current.replace(/\r\n/g,'\n')))throw new Error(`${spec.relative} 的接入块已被修改，请先检查。`);
  return {...spec,target,source,backup,begin,finish,installed,current};
}
const files=specs.map(inspect);
if(mode==='check'){
  console.log(JSON.stringify({version:'13.351',installed:files.every(f=>f.installed&&f.current.replace(/\r\n/g,'\n')===f.block),upgradeNeeded:files.some(f=>f.installed)&&!files.every(f=>f.installed&&f.current.replace(/\r\n/g,'\n')===f.block),files:files.map(f=>({path:f.target,installed:f.installed,backup:fs.existsSync(f.backup)}))}));process.exit(0);
}
// Preflight both files before creating backups or changing either file.
for(const f of files){
  if(mode==='install'){
    if(f.installed)f.next=f.source.slice(0,f.begin)+f.block+f.source.slice(f.finish+f.end.length);
    else{
      if(fs.existsSync(f.backup)&&fs.readFileSync(f.backup,'utf8')!==f.source)throw new Error(`${f.relative} 已有备份与当前文件不一致，停止以保护其他改动。`);
      if(f.template){
        if(!f.source.includes('<template id="join-game"></template>'))throw new Error('无法识别登录模板，未做任何修改。');
        f.next=f.source.trimEnd()+'\n'+f.block+'\n';
      }else{
        const anchor=/(\.render\(this\._template,\{)(bodyClass:)/g;
        if([...f.source.matchAll(anchor)].length!==1)throw new Error('无法识别 13.351 登录路由，未做任何修改。');
        f.next=f.source.replace(anchor,`$1${f.block}$2`);
      }
    }
  }else{
    f.next=f.installed?f.source.slice(0,f.begin)+f.source.slice(f.finish+f.end.length):f.source;
    if(f.installed){
      if(f.template)f.next=f.next.trimEnd()+'\n';
      const original=fs.existsSync(f.backup)?fs.readFileSync(f.backup,'utf8'):null;
      if(original!==null&&original.trim()===f.next.trim())f.next=original;
    }
  }
}
const changed=files.filter(f=>f.next!==f.source),written=[];
try{
  if(mode==='install')for(const f of changed)if(!fs.existsSync(f.backup)){
    // An old installation may have lost its backup: do not back up the injected block as original.
    const clean=f.installed?f.source.slice(0,f.begin)+f.source.slice(f.finish+f.end.length):f.source;
    fs.writeFileSync(f.backup,clean,{flag:'wx'});
  }
  for(const f of changed){written.push(f);fs.writeFileSync(f.target,f.next);}
}catch(error){
  for(const f of written.reverse())fs.writeFileSync(f.target,f.source);
  throw error;
}
console.log(changed.length?(mode==='install'?'已安装或升级按世界启用的登录主题接入。请完全重启 Foundry，并在目标世界启用模组、保存并发布配置。':'已移除登录主题的模板和服务端接入，其他改动保留。请完全重启 Foundry。'):'接入状态无需修改。');
