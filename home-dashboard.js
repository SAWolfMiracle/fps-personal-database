(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.FPSHome=factory()})(typeof window==='object'?window:this,function(){
'use strict';
function settings(raw){raw=raw&&typeof raw==='object'?raw:{};var out={matches:raw.matches!==false,collections:raw.collections!==false,pins:Array.from(new Set((Array.isArray(raw.pins)?raw.pins:['阿萨拉牌']).filter(function(x){return typeof x==='string'&&x.trim()&&x.length<=80}))).slice(0,12)};if(raw.showcase!=null)out.showcase=raw.showcase===true;if(Array.isArray(raw.order))out.order=layout({pins:out.pins,order:raw.order,showcase:out.showcase});return out}
function key(r){var game=String(r.game||'').trim().toLowerCase();if(/^(三角洲|delta force)$/.test(game))game='三角洲行动';return JSON.stringify([game,r.catalog_item_id||String(r.name||'').trim().toLowerCase()])}
function progress(records,quantity){var types=new Map();records.filter(function(r){return r.kind==='collection'}).forEach(function(r){var id=key(r),old=types.get(id),n=quantity(r),target=Math.max(1,Number(r.target)||1);if(!old)types.set(id,{name:r.name,owned:n>0,complete:n>=target});else{old.owned=old.owned||n>0;old.complete=old.complete||n>=target}});var items=Array.from(types.values());return {total:items.length,owned:items.filter(function(x){return x.owned}).length,complete:items.filter(function(x){return x.complete}).length,missing:items.filter(function(x){return !x.complete}).map(function(x){return x.name})}}
function deck(items,records,quantity,cardName,group){return items.map(function(item){var candidates=records.filter(function(r){return r.kind==='collection'&&group(r)==='阿萨拉牌'&&cardName(r)===item.name}).sort(function(a,b){return quantity(b)-quantity(a)});var record=candidates[0];return {id:item.id,name:item.name,recordId:record?record.id:null,quantity:record?quantity(record):0}})}

function layout(p){var all=['matches','collections','recent'].concat(p.showcase?['showcase']:[]).concat((p.pins||[]).map(function(x){return 'pin:'+x}));return Array.from(new Set((Array.isArray(p.order)?p.order:[]).filter(function(x){return all.indexOf(x)>=0}).concat(all)))}
function move(keys,from,to){var next=keys.slice(),a=next.indexOf(from),b=next.indexOf(to);if(a<0||b<0||a===b)return next;next.splice(b,0,next.splice(a,1)[0]);return next}
var themes=[{"name":"德小兰组装","kind":"官方组装关系","source":"https://steamcommunity.com/app/2507950/announcements/?l=schinese","checked":"2026-10-17","items":[{"id":"orzice:p1630","name":"德小兰·灰鲭鲨模型"},{"id":"orzice:p1629","name":"灰鲭鲨模型"},{"id":"orzice:p1628","name":"德小兰"}]},{"name":"炫彩收藏","kind":"本站主题整理，非官方任务合集","source":"https://orzice.com/v/scp_book","checked":"2026-10-17","items":[{"id":"orzice:p1627","name":"炫彩花小蝶"},{"id":"orzice:p1516","name":"炫彩露小娜"},{"id":"orzice:p1457","name":"炫彩足球"},{"id":"orzice:p1456","name":"炫彩乌小蛋"},{"id":"orzice:p1349","name":"炫彩威小龙"},{"id":"orzice:p1295","name":"炫彩拉小宅"},{"id":"orzice:p1287","name":"炫彩鸟蛋"},{"id":"orzice:p1249","name":"炫彩兰小登"},{"id":"orzice:p1089","name":"炫彩克小圈"},{"id":"orzice:p187","name":"炫彩麦小蛋"}]},{"name":"角色手办","kind":"本站主题整理，非官方任务合集","source":"https://orzice.com/v/scp_book","checked":"2026-10-17","items":[{"id":"orzice:p1607","name":"手办：守夜人"},{"id":"orzice:p1606","name":"手办：盾峰"},{"id":"orzice:p1488","name":"手办：劳拉（崛起）"},{"id":"orzice:p1119","name":"手办-阿米娅（近卫）"},{"id":"orzice:p1498","name":"手办：劳拉"},{"id":"orzice:p1121","name":"手办-阿米娅"}]},{"name":"海盗钱币","kind":"本站主题整理，非官方任务合集","source":"https://orzice.com/v/scp_book","checked":"2026-10-17","items":[{"id":"orzice:956","name":"亮闪闪的海盗金币"},{"id":"orzice:977","name":"古怪的海盗银币"},{"id":"orzice:985","name":"锈迹斑斑的海盗铜币"}]},{"name":"建筑图纸","kind":"本站主题整理，非官方任务合集","source":"https://orzice.com/v/scp_book","checked":"2026-10-17","items":[{"id":"orzice:999","name":"建筑图纸5号"},{"id":"orzice:997","name":"建筑图纸4号"},{"id":"orzice:995","name":"建筑图纸3号"},{"id":"orzice:998","name":"建筑图纸2号"},{"id":"orzice:994","name":"建筑图纸1号"}]},{"name":"阵营勋章","kind":"本站主题整理，非官方任务合集","source":"https://orzice.com/v/scp_book","checked":"2026-10-17","items":[{"id":"orzice:p1495","name":"G.T.I.勇气勋章"},{"id":"orzice:p1494","name":"哈夫克精英勋章"},{"id":"orzice:p1493","name":"阿萨拉赤忱勋章"},{"id":"orzice:p1492","name":"G.T.I.制式勋章"},{"id":"orzice:p1491","name":"哈夫克制式勋章"},{"id":"orzice:p1490","name":"阿萨拉制式勋章"}]},{"name":"载具与机械模型","kind":"本站主题整理，非官方任务合集","source":"https://orzice.com/v/scp_book","checked":"2026-10-17","items":[{"id":"orzice:1045","name":"步战车模型"},{"id":"orzice:1041","name":"主战坦克模型"},{"id":"orzice:p232","name":"机械工蜂模型"}]}];
function theme(name){return themes.find(function(t){return t.name===name})||null}
function inTheme(r,name){var t=theme(name);return !!t&&r.kind==='collection'&&/^(三角洲行动|三角洲|delta force)$/i.test(String(r.game||'').trim())&&r.collection_group!=='普通库存'&&t.items.some(function(x){return r.catalog_item_id?x.id===r.catalog_item_id:x.name===r.name})}
function themeProgress(name,records,quantity){var t=theme(name);if(!t)return null;var complete=0,owned=0,missing=[];t.items.forEach(function(item){var rows=records.filter(function(r){return inTheme(r,name)&&(r.catalog_item_id?r.catalog_item_id===item.id:r.name===item.name)}),has=rows.some(function(r){return quantity(r)>0}),done=rows.some(function(r){return quantity(r)>=Math.max(1,Number(r.target)||1)});if(has)owned++;if(done)complete++;else missing.push(item.name)});return {total:t.items.length,owned:owned,complete:complete,missing:missing}}
function bindSort(root,options){
 if(!root||!root.addEventListener)return;
 if(root._fpsSortCleanup)root._fpsSortCleanup();
 var doc=root.ownerDocument,win=doc.defaultView,state=null,timer=null;
 var reduced=!!(win.matchMedia&&win.matchMedia('(prefers-reduced-motion: reduce)').matches);
 function preview(keys,key){options.preview(keys,{animate:!reduced,dragKey:key})}
 function removeGhost(ghost){if(ghost&&ghost.remove)ghost.remove()}
 function land(ghost,rect){
  if(!ghost)return;
  if(reduced||!rect||!ghost.animate){removeGhost(ghost);return}
  var end='translate3d('+(rect.left-ghost._origin.left)+'px,'+(rect.top-ghost._origin.top)+'px,0) scale(1)';
  var animation=ghost.animate([{transform:ghost.style.transform},{transform:end}],{duration:180,easing:'cubic-bezier(.2,.8,.2,1)',fill:'forwards'});
  animation.finished.then(function(){removeGhost(ghost)},function(){removeGhost(ghost)});
 }
 function cleanup(restore,keepGhost){
  win.clearTimeout(timer);timer=null;var old=state;state=null;if(!old)return null;
  if(old.frame!=null&&win.cancelAnimationFrame)win.cancelAnimationFrame(old.frame);
  if(old.row)old.row.classList.remove('is-sorting');
  if(old.handle.hasPointerCapture&&old.handle.hasPointerCapture(old.id))old.handle.releasePointerCapture(old.id);
  if(restore)preview(old.original,old.key);
  if(!keepGhost)removeGhost(old.ghost);
  return old;
 }
 function lift(){
  if(!state||options.read().epoch!==state.epoch){cleanup(true,false);return}
  state.held=true;state.row.classList.add('is-sorting');
  if(state.row.cloneNode&&doc.body){
   var rect=state.row.getBoundingClientRect(),ghost=state.row.cloneNode(true);
   [ghost].concat(Array.from(ghost.querySelectorAll('*'))).forEach(function(e){['id','data-home-module','data-home-order-row','data-home-drag'].forEach(function(name){e.removeAttribute(name)})});
   ghost.classList.remove('is-sorting');ghost.classList.add('home-drag-ghost');ghost.setAttribute('aria-hidden','true');ghost.inert=true;
   Object.assign(ghost.style,{left:rect.left+'px',top:rect.top+'px',width:rect.width+'px',height:rect.height+'px',margin:'0',transform:'translate3d(0,0,0) scale('+ (reduced?'1':'1.015') +')'});
   ghost._origin={left:rect.left,top:rect.top};doc.body.appendChild(ghost);state.ghost=ghost;
  }
  if(state.handle.setPointerCapture)state.handle.setPointerCapture(state.id);
  if(win.requestAnimationFrame)state.frame=win.requestAnimationFrame(frame);
 }
 function down(e){
  var handle=e.target.closest('[data-home-drag]');if(!handle||!root.contains(handle)||(e.button!=null&&e.button!==0))return;
  cleanup(true,false);var current=options.read(),key=handle.getAttribute('data-home-drag');if(current.keys.indexOf(key)<0)return;
  state={id:e.pointerId,key:key,pressX:e.clientX,pressY:e.clientY,x:e.clientX,y:e.clientY,original:current.keys.slice(),keys:current.keys.slice(),epoch:current.epoch,handle:handle,row:handle.closest('[data-home-module],[data-home-order-row]'),held:false,frame:null,previousTime:null,ghost:null};
  timer=win.setTimeout(lift,280);
 }
 function track(){
  if(!state)return;
  if(state.ghost)state.ghost.style.transform='translate3d('+(state.x-state.pressX)+'px,'+(state.y-state.pressY)+'px,0) scale('+(reduced?'1':'1.015')+')';
  var hit=doc.elementFromPoint(state.x,state.y),row=hit&&hit.closest('[data-home-module],[data-home-order-row]');
  if(!row||!root.contains(row))return;
  var key=row.getAttribute('data-home-order-row')||row.getAttribute('data-home-module');if(!key||key===state.key||state.keys.indexOf(key)<0)return;if(key===state.lastTarget&&Math.abs(state.y-state.swapY)<16)return;
  if(row.getBoundingClientRect){var rect=row.getBoundingClientRect(),threshold=Math.min(56,rect.height*.35),downward=state.keys.indexOf(state.key)<state.keys.indexOf(key);if(downward&&state.y<rect.top+threshold||!downward&&state.y>rect.bottom-threshold)return}
  state.lastTarget=key;state.swapY=state.y;state.keys=move(state.keys,state.key,key);preview(state.keys,state.key);
 }
 function frame(time){
  if(!state||!state.held)return;
  if(options.read().epoch!==state.epoch){cleanup(true,false);return}
  var elapsed=state.previousTime==null?16:Math.min(32,Math.max(0,time-state.previousTime));state.previousTime=time;
  var rect=root.getBoundingClientRect(),top=Math.max(64,rect.top),bottom=Math.min(win.innerHeight-90,rect.bottom),edge=64,speed=0;
  if(state.y<top+edge)speed=-Math.min(12,(top+edge-state.y)*.2);else if(state.y>bottom-edge)speed=Math.min(12,(state.y-bottom+edge)*.2);
  if(speed)win.scrollBy(0,speed*elapsed/16);
  track();if(state)state.frame=win.requestAnimationFrame(frame);
 }
 function moving(e){
  if(!state||e.pointerId!==state.id)return;
  if(options.read().epoch!==state.epoch){cleanup(true,false);return}
  state.x=e.clientX;state.y=e.clientY;
  if(!state.held){if(Math.hypot(state.x-state.pressX,state.y-state.pressY)>10)cleanup(true,false);return}
  e.preventDefault();if(!win.requestAnimationFrame)track();
 }
 function up(e){
  if(!state||state.id!==e.pointerId)return;
  if(!state.held||options.read().epoch!==state.epoch){cleanup(true,false);return}
  state.x=e.clientX;state.y=e.clientY;track();
  // Release the pointer before a successful save re-renders the source card.
  var saved=cleanup(false,true),ghost=saved.ghost,rect=saved.row.getBoundingClientRect?saved.row.getBoundingClientRect():null;
  var result=options.save(saved.keys,saved.epoch);
  if(result===false){preview(saved.original,saved.key);rect=saved.row.getBoundingClientRect?saved.row.getBoundingClientRect():null}
  land(ghost,rect);
 }
 function cancel(e){if(state&&(!e||e.pointerId===state.id))cleanup(true,false)}
 function context(e){if(e.target.closest('[data-home-drag]'))e.preventDefault()}
 root.addEventListener('pointerdown',down);root.addEventListener('pointermove',moving,{passive:false});root.addEventListener('pointerup',up);root.addEventListener('pointercancel',cancel);root.addEventListener('lostpointercapture',cancel);root.addEventListener('contextmenu',context);
 root._fpsSortCleanup=function(){cleanup(false,false);root.removeEventListener('pointerdown',down);root.removeEventListener('pointermove',moving);root.removeEventListener('pointerup',up);root.removeEventListener('pointercancel',cancel);root.removeEventListener('lostpointercapture',cancel);root.removeEventListener('contextmenu',context)};
}

return {settings:settings,progress:progress,deck:deck,layout:layout,move:move,themes:themes,theme:theme,inTheme:inTheme,themeProgress:themeProgress,bindSort:bindSort};
});
