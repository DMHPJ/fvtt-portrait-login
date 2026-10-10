import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const installer=fileURLToPath(new URL('../tools/install.mjs',import.meta.url));
const template='<template id="join-game"></template>\n';
const route='export default class JoinView {async handleGet(s,e){return e.render(this._template,{bodyClass:[]});}}';
const legacy='<!-- portrait-login:v1:start -->\n<link rel="stylesheet" href="modules/portrait-login/styles/login.css">\n<script type="module" src="modules/portrait-login/scripts/login.mjs"></script>\n<!-- portrait-login:v1:end -->\n';
function fixture(t,{old=false,build=351,server=route}={}){
 const root=mkdtempSync(path.join(tmpdir(),'portrait-scope-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 mkdirSync(path.join(root,'templates/views'),{recursive:true});mkdirSync(path.join(root,'dist/server/views'),{recursive:true});
 writeFileSync(path.join(root,'package.json'),JSON.stringify({name:'foundryvtt',release:{generation:13,build}}));
 const tpl=path.join(root,'templates/views/join.hbs'),srv=path.join(root,'dist/server/views/join.mjs');
 writeFileSync(tpl,template+(old?legacy:''));writeFileSync(srv,server);
 if(old)writeFileSync(tpl+'.portrait-login-backup',template);
 return {tpl,srv,run(mode){return spawnSync(process.execPath,[installer,'--app',root,mode],{encoding:'utf8'});}};
}
test('install, repeat, boolean-only activation and exact restore',async t=>{
 const f=fixture(t);assert.equal(f.run('--install').status,0);
 const first=readFileSync(f.tpl,'utf8'),firstServer=readFileSync(f.srv,'utf8');
 assert.match(first,/\{\{#if portraitLoginEnabled\}\}/);
 assert.equal(f.run('--install').status,0);assert.equal(readFileSync(f.tpl,'utf8'),first);assert.equal(readFileSync(f.srv,'utf8'),firstServer);
 assert.equal(JSON.parse(f.run('--check').stdout).installed,true);
 const {default:View}=await import('data:text/javascript,'+encodeURIComponent(firstServer));
 const previous=globalThis.db;t.after(()=>{globalThis.db=previous;});
 for(const [config,expected] of [[undefined,false],[{},false],[{'portrait-login':false},false],[{'portrait-login':true},true],[{'portrait-login':'true'},false]]){
  globalThis.db={Setting:{getValue:async key=>{assert.equal(key,'core.moduleConfiguration');return config;}}};
  const data=await new View().handleGet(null,{render:(_,data)=>data});assert.equal(data.portraitLoginEnabled,expected);assert.deepEqual(Object.keys(data).sort(),['bodyClass','portraitLoginEnabled']);
 }
 assert.equal(f.run('--restore').status,0);assert.equal(readFileSync(f.tpl,'utf8'),template);assert.equal(readFileSync(f.srv,'utf8'),route);
});
test('upgrade old installation and preserve its original backup',t=>{
 const f=fixture(t,{old:true});assert.equal(JSON.parse(f.run('--check').stdout).upgradeNeeded,true);
 assert.equal(f.run('--install').status,0);assert.equal(readFileSync(f.tpl+'.portrait-login-backup','utf8'),template);
 assert.equal(f.run('--restore').status,0);assert.equal(readFileSync(f.tpl,'utf8'),template);
});
test('restore preserves unrelated changes in both files',t=>{
 const f=fixture(t);assert.equal(f.run('--install').status,0);
 writeFileSync(f.tpl,readFileSync(f.tpl,'utf8')+'<!-- external -->\n');writeFileSync(f.srv,readFileSync(f.srv,'utf8')+'\n// external\n');
 assert.equal(f.run('--restore').status,0);assert.match(readFileSync(f.tpl,'utf8'),/external/);assert.match(readFileSync(f.srv,'utf8'),/external/);
});
test('preflight rejects unsupported version and unknown server before writing template',t=>{
 for(const opts of [{build:350},{server:'unrecognized'}]){const f=fixture(t,opts);assert.notEqual(f.run('--install').status,0);assert.equal(readFileSync(f.tpl,'utf8'),template);assert.equal(existsSync(f.tpl+'.portrait-login-backup'),false);}
});
test('conflicting backups, incomplete and modified markers fail without writes',t=>{
 for(const mode of ['backup','marker','modified']){
  const f=fixture(t);
  if(mode==='backup')writeFileSync(f.srv+'.portrait-login-backup','different');
  if(mode==='marker')writeFileSync(f.tpl,template+'<!-- portrait-login:v1:start -->');
  if(mode==='modified')writeFileSync(f.tpl,template+legacy.replace('styles/login.css','styles/custom.css'));
  const before=readFileSync(f.tpl,'utf8');assert.notEqual(f.run('--install').status,0);assert.equal(readFileSync(f.tpl,'utf8'),before);assert.equal(readFileSync(f.srv,'utf8'),route);
 }
});
