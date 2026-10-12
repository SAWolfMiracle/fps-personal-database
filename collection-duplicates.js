(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.FPSDuplicates=factory()})(typeof window==='object'?window:this,function(){
'use strict';
function key(r){if(!r||r.kind!=='collection'||!r.catalog_item_id)return '';var game=String(r.game||'').trim().toLowerCase();if(/^(三角洲|delta force)$/.test(game))game='三角洲行动';return JSON.stringify([game,r.catalog_item_id])}
function empty(r){return r.import_source==='catalog'&&!Number(r.starting_quantity)&&!(r.acquisitions||[]).length&&!(r.inventory_events||[]).length&&!String(r.note||'').trim()&&!String(r.obtain_method||'').trim()&&!String(r.collection_group||'').trim()&&Number(r.target)===1}
function plan(records){var groups=new Map(),remove=[],conflicts=[];records.forEach(function(r){var k=key(r);if(k){if(!groups.has(k))groups.set(k,[]);groups.get(k).push(r)}});groups.forEach(function(rows){if(rows.length<2)return;var meaningful=rows.filter(function(r){return !empty(r)}),keep=meaningful.length?meaningful:rows.slice(0,1);rows.forEach(function(r){if(keep.indexOf(r)<0&&empty(r))remove.push(r.id)});if(meaningful.length>1)conflicts.push(meaningful.map(function(r){return r.id}))});return {remove:remove,conflicts:conflicts}}
function skipGuest(r,current){var k=key(r);return !!k&&empty(r)&&current.some(function(x){return key(x)===k})}
return {key:key,empty:empty,plan:plan,skipGuest:skipGuest};
});
