export const ID = "portrait-login";
export const MODULE_URL = new URL('../', import.meta.url);
export const SERVER_URL = new URL('../../', MODULE_URL);
export const CHARACTER_ITEMS = ['name','tag','hero','description','detail'];
export const GLOBAL_ITEMS = ['eyebrow','login','roster'];
export const DEFAULT_LAYOUT = {
  name:{x:5,y:28,scale:1},tag:{x:5,y:40,scale:1},hero:{x:38,y:12,scale:1},
  description:{x:5,y:47,scale:1},detail:{x:5,y:63,scale:1},
  eyebrow:{x:5,y:21,scale:1},login:{x:74,y:30,scale:1},roster:{x:5,y:70,scale:1}
};
function normalizeLayout(source,keys){
  const number=(value,fallback,min,max)=>typeof value==='number'&&Number.isFinite(value)?Math.min(max,Math.max(min,value)):fallback;
  return Object.fromEntries(keys.map(key=>{
    const v=source?.[key],d=DEFAULT_LAYOUT[key],layout={x:number(v?.x,d.x,-100,100),y:number(v?.y,d.y,-100,100),scale:number(v?.scale,d.scale,.25,3)};
    for(const dimension of ['width','height'])if(typeof v?.[dimension]==='number'&&Number.isFinite(v[dimension])&&v[dimension]>0)layout[dimension]=number(v[dimension],null,1,10000);
    return [key,layout];
  }));
}
export const text = (v, max=1000) => String(v??'').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').slice(0,max);
export const escape = v => text(v,10000).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function assetURL(value) {
  const s=text(value).trim();if(!s)return '';
  if(/^(?:[a-z]:[\\/]|javascript:|data:|vbscript:|file:|blob:)/i.test(s))return '';
  try {
    const url=s.startsWith('@/') ? new URL(s.slice(2),MODULE_URL) : new URL(s.replace(/^\//,''),SERVER_URL);
    if(!['http:','https:'].includes(url.protocol))return '';
    return url.href;
  } catch{return '';}
}
export const defaults = {
  title:'冒险者之门',subtitle:'每一次相逢，都是传奇的序章。',eyebrow:'THE NEXT CHAPTER',background:'',accent:'#c8aa71',cardHeight:158,layout:normalizeLayout(null,GLOBAL_ITEMS),
  characters:[
    {id:'ranger',name:'瑟琳 · 风语',tag:'月林游侠',description:'循着星光与林间的低语，踏上尚无人抵达的旅途。',detail:'长弓 · 自然 · 守望',color:'#90ad92'},
    {id:'knight',name:'亚瑟 · 灰烬',tag:'誓约骑士',description:'旧日的荣光已化作灰烬，而守护的誓言从未熄灭。',detail:'长剑 · 坚守 · 荣誉',color:'#c88477'},
    {id:'mage',name:'伊芙 · 星潮',tag:'秘法学者',description:'群星在指尖流转，未解的奥秘正等待一个答案。',detail:'秘法 · 星辰 · 求知',color:'#87a7d9'},
    {id:'rogue',name:'诺克斯',tag:'暮影行者',description:'在灯火照不到的地方，总有另一条通往明日的路。',detail:'双刃 · 潜行 · 自由',color:'#c6aa69'},
    {id:'bard',name:'莉拉 · 绯歌',tag:'远游诗人',description:'将每一段冒险写成歌，让故事比旅途走得更远。',detail:'琴弦 · 灵感 · 奇遇',color:'#ba89ac'}
  ].map((c,i)=>({...c,userId:'',portrait:'@/assets/party.png',hero:'',background:'',strip:i,position:50,enabled:true,layout:normalizeLayout(null,CHARACTER_ITEMS)}))
};
export function normalize(source={}) {
  const hex=(v,fallback)=>/^#[\da-f]{6}$/i.test(v)?v:fallback;
  const c={title:text(source.title??defaults.title,80),subtitle:text(source.subtitle??defaults.subtitle,250),eyebrow:text(source.eyebrow??defaults.eyebrow,80),background:text(source.background,1000),accent:hex(source.accent,defaults.accent),cardHeight:Math.min(260,Math.max(100,Number(source.cardHeight)||158)),layout:normalizeLayout(source.layout,GLOBAL_ITEMS),characters:[]};
  const rows=Array.isArray(source.characters)?source.characters:defaults.characters;
  c.characters=rows.slice(0,60).map((x,i)=>({id:text(x.id||`character-${i+1}`,80),name:text(x.name||'未命名角色',80),tag:text(x.tag,80),description:text(x.description,1500),detail:text(x.detail,160),userId:text(x.userId,80),portrait:text(x.portrait,1000),hero:text(x.hero,1000),background:text(x.background,1000),color:hex(x.color,c.accent),strip:Number.isInteger(x.strip)&&x.strip>=0&&x.strip<=4?x.strip:null,position:Math.min(100,Math.max(0,Number.isFinite(Number(x.position)) ? Number(x.position) : 50)),enabled:x.enabled!==false,layout:normalizeLayout(x.layout,CHARACTER_ITEMS)}));
  return c;
}
export function paintArt(el,c,{hero=false}={}) {
  const value=hero?(c.hero||c.portrait):c.portrait;
  const url=assetURL(value);el.style.backgroundImage=url?`url(${JSON.stringify(url)})`:'none';
  const strip=c.strip!==null && !(hero&&c.hero);
  el.style.backgroundSize=strip?'500% auto':(hero?'contain':'cover');
  el.style.backgroundPosition=strip?`${c.strip*25}% ${hero?0:5}%`:`50% ${c.position}%`;
  el.classList.toggle('pl-no-art',!url);
}
