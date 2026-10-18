(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.ArcaKit=factory()})(typeof window==='object'?window:this,function(){
'use strict';
var MAX=1e12;
function text(v,max){return String(v==null?'':v).trim().slice(0,max)}
function price(v){if(v==null||String(v).trim()==='')return null;var n=Number(v);if(!Number.isFinite(n)||n<0||n>MAX||Math.abs(n*100-Math.round(n*100))>.001)throw Error('单价需为非负数字，最多两位小数');return Math.round(n*100)/100}
function normalizeLoadout(raw){
 if(raw==null)return [];if(!Array.isArray(raw)||raw.length>30)throw Error('配装单最多 30 项');
 var out=raw.map(function(r){if(!r||typeof r!=='object')throw Error('配装明细格式错误');var name=text(r.name,120),unit=price(r.unit_price),q=r.quantity==null||r.quantity===''?1:Number(r.quantity);if(!name&&unit===null&&q===1)return null;if(!name)throw Error('请填写每项装备名称');if(!Number.isSafeInteger(q)||q<1||q>1000000)throw Error('装备数量需为 1 到 100 万之间的整数');if(unit!==null&&unit*q>MAX)throw Error('单项配装金额不能超过 1 万亿');return {slot:text(r.slot,40)||'其他',name:name,quantity:q,unit_price:unit}}).filter(Boolean);
 var total=out.reduce(function(n,r){return n+(r.unit_price===null?0:Math.round(r.unit_price*100)*r.quantity)},0);if(!Number.isSafeInteger(total)||total>MAX*100)throw Error('配装合计不能超过 1 万亿');return out;
}
function restoreLoadout(raw){
 if(!Array.isArray(raw))return [];var total=0;return raw.slice(0,30).filter(function(r){return r&&typeof r==='object'&&text(r.name,120)}).map(function(r){var q=Number(r.quantity),unit;try{unit=price(r.unit_price)}catch(e){unit=null}q=Number.isSafeInteger(q)&&q>0&&q<=1000000?q:1;if(unit!==null){var next=total+Math.round(unit*100)*q;if(!Number.isSafeInteger(next)||next>MAX*100)unit=null;else total=next}return {slot:text(r.slot,40)||'其他',name:text(r.name,120),quantity:q,unit_price:unit}});
}
function summary(raw){var rows=normalizeLoadout(raw),cents=0,missing=0;rows.forEach(function(r){if(r.unit_price===null)missing++;else cents+=Math.round(r.unit_price*100)*r.quantity});return {items:rows.length,total:cents/100,missing:missing,complete:rows.length>0&&missing===0}}
function compare(a,b){if(!a||!b||a.id===b.id)throw Error('请选择两套不同的方案');var sameGame=text(a.game,120).toLowerCase()===text(b.game,120).toLowerCase(),left=summary(a.loadout),right=summary(b.loadout);return {sameGame:sameGame,left:left,right:right,budgetDelta:sameGame&&a.budget!=null&&b.budget!=null?Number(b.budget)-Number(a.budget):null,loadoutDelta:sameGame&&left.complete&&right.complete?Math.round((right.total-left.total)*100)/100:null}}
function shareData(r,options,quantity){options=options||{};var data={name:text(r.name,200)||'未命名收藏',game:text(r.game,120)||'未分类游戏'};if(options.picture&&/^https:\/\//i.test(String(r.image||'')))data.image=String(r.image);if(options.quantity)data.quantity=quantity;if(options.date){var dates=(r.acquisitions||[]).map(function(a){return String(a.date||'')}).filter(function(d){return /^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d))&&new Date(d).toISOString().slice(0,10)===d}).sort();if(dates.length)data.date=dates[0]}if(options.caption&&r.showcase&&r.showcase.caption)data.caption=text(r.showcase.caption,180);return data}
function filename(name){return 'Arca-'+text(name,48).replace(/[\\/:*?"<>|\x00-\x1f]/g,'_')+'.png'}
function wrap(ctx,value,width,maxLines){var lines=[],line='',chars=Array.from(String(value||'').replace(/\s+/g,' '));for(var i=0;i<chars.length;i++){var next=line+chars[i];if(ctx.measureText(next).width>width&&line){lines.push(line);line='';if(lines.length===maxLines){var last=lines.pop();while(last&&ctx.measureText(last+'…').width>width)last=Array.from(last).slice(0,-1).join('');lines.push(last+'…');return lines}}line+=chars[i]}if(line)lines.push(line);return lines.slice(0,maxLines)}
function drawCard(canvas,data,picture){
 canvas.width=1080;canvas.height=1440;var ctx=canvas.getContext('2d');if(!ctx)throw Error('当前浏览器无法生成图片');
 var font='-apple-system, BlinkMacSystemFont, "PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
 function rounded(x,y,w,h,r,fill){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill()}
 function write(value,x,y,size,color,weight){ctx.font=(weight||400)+' '+size+'px '+font;ctx.fillStyle=color;ctx.fillText(value,x,y)}
 ctx.fillStyle='#08090b';ctx.fillRect(0,0,1080,1440);rounded(48,48,984,1344,44,'#1c1d21');
 write('Arca',104,124,40,'#f5f5f7',700);write('COLLECTION',762,122,18,'#a4bce7',500);
 var gradient=ctx.createLinearGradient(104,170,976,706);gradient.addColorStop(0,'#293344');gradient.addColorStop(1,'#1e232c');rounded(104,174,872,532,30,gradient);
 if(picture){var w=picture.naturalWidth||picture.width,h=picture.naturalHeight||picture.height,scale=Math.min(776/w,436/h);ctx.drawImage(picture,152+(776-w*scale)/2,222+(436-h*scale)/2,w*scale,h*scale)}else{
  ctx.strokeStyle='#a2bdf1';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(436,365);ctx.lineTo(540,309);ctx.lineTo(644,365);ctx.lineTo(644,489);ctx.lineTo(540,548);ctx.lineTo(436,489);ctx.closePath();ctx.stroke();ctx.beginPath();ctx.moveTo(436,365);ctx.lineTo(540,425);ctx.lineTo(644,365);ctx.moveTo(540,425);ctx.lineTo(540,548);ctx.stroke();
 }
 var y=790;ctx.font='700 56px '+font;ctx.fillStyle='#f5f5f7';var lines=wrap(ctx,data.name,872,3);lines.forEach(function(line){ctx.fillText(line,104,y);y+=70});
 y+=12;ctx.font='400 28px '+font;ctx.fillStyle='#a5a8b0';wrap(ctx,data.game,872,1).forEach(function(line){ctx.fillText(line,104,y)});y+=52;
 var meta=[];if(data.quantity!=null)meta.push('当前收藏 '+data.quantity+' 件');if(data.date)meta.push('最早记录 '+data.date);if(meta.length){write(meta.join('  ·  '),104,y,24,'#b2c8ef');y+=50}
 if(data.caption){ctx.font='400 29px '+font;ctx.fillStyle='#c8c9d0';wrap(ctx,data.caption,872,3).forEach(function(line){ctx.fillText(line,104,y);y+=39})}
 ctx.strokeStyle='#383b43';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(104,1288);ctx.lineTo(976,1288);ctx.stroke();write('PERSONAL COLLECTION',104,1339,17,'#858d9b',500);write('珍藏每一次获得',750,1339,21,'#a6bde7');return canvas;
}
return {normalizeLoadout:normalizeLoadout,restoreLoadout:restoreLoadout,summary:summary,compare:compare,shareData:shareData,filename:filename,wrap:wrap,drawCard:drawCard};
});
