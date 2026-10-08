import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const args=process.argv.slice(2);const arg=name=>{const i=args.indexOf(name);return i>=0?args[i+1]:null;};
const app=arg('--app');const mode=args.includes('--restore')?'restore':args.includes('--install')?'install':args.includes('--check')?'check':null;
if(!app||!mode){console.log('用法：node install.mjs --app "Foundry resources/app 或解压程序目录" --install|--restore|--check');process.exit(1);}
const root=path.resolve(app);const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
if(pkg.name!=='foundryvtt'||pkg.release?.generation!==13||pkg.release?.build!==351)throw new Error('本接入器仅支持经过检查的 Foundry 13.351。');
const target=path.join(root,'templates/views/join.hbs');const backup=target+'.portrait-login-backup';
const start='<!-- portrait-login:v1:start -->';const end='<!-- portrait-login:v1:end -->';
const block=`${start}\n<link rel="stylesheet" href="modules/portrait-login/styles/login.css">\n<script type="module" src="modules/portrait-login/scripts/login.mjs"></script>\n${end}`;
const source=fs.readFileSync(target,'utf8');const has=source.includes(start);
if(mode==='check'){console.log(JSON.stringify({version:'13.351',installed:has,backup:fs.existsSync(backup),template:target}));process.exit(0);}
if(mode==='install'){
 if(has){console.log('已经安装，无需重复修改。');process.exit(0);}
 if(!source.includes('<template id="join-game"></template>'))throw new Error('登录模板已被其他插件改动，请先检查，未做任何修改。');
 if(fs.existsSync(backup)&&fs.readFileSync(backup,'utf8')!==source)throw new Error('已有备份与当前模板不一致，停止以保护其他改动。');
 if(!fs.existsSync(backup))fs.writeFileSync(backup,source,{flag:'wx'});
 fs.writeFileSync(target,source.replace(/\s*$/,'')+'\n'+block+'\n');
 console.log('已接入登录主题，原模板已备份。请完全重启Foundry。');
}else{
 if(!has){console.log('没有本主题的接入标记，无需恢复。');process.exit(0);}
 const begin=source.indexOf(start);const finish=source.indexOf(end,begin);if(finish<0)throw new Error('接入标记不完整，请手动检查。');
 const remaining=(source.slice(0,begin)+source.slice(finish+end.length)).trimEnd()+'\n';
 const original=fs.existsSync(backup)?fs.readFileSync(backup,'utf8'):null;
 fs.writeFileSync(target,original&&original.trim()===remaining.trim()?original:remaining);
 console.log('已移除主题接入，其他内容保留。请重启Foundry。');
}
