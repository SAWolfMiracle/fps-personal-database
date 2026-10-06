/* Only item identities and categories; importing a catalog never claims ownership. */
(function(root,factory){var api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.FPSCatalog=api})(typeof window==='object'?window:this,function(){
'use strict';
function gameKey(value){return /^(三角洲行动|三角洲|delta force)$/i.test(String(value||'').trim())?'三角洲行动':String(value||'').trim()}
function plan(catalog,records,makeID,stamp,grade){
 if(!catalog||catalog.id!=='delta-force-collectibles'||catalog.game!=='三角洲行动'||!Array.isArray(catalog.items)||!catalog.items.length||catalog.items.length>3000)throw Error('目录格式无效');
 var ids=new Set();catalog.items.forEach(function(item){if(!item||!/^orzice:p?\d+$/.test(item.item_id)||!item.name||item.name.length>200||!Number.isInteger(item.grade)||item.grade<1||item.grade>6||ids.has(item.item_id))throw Error('目录条目无效');ids.add(item.item_id)});
 var names=new Set(),existingIds=new Set();records.filter(function(r){return r.kind==='collection'&&gameKey(r.game)===catalog.game}).forEach(function(r){names.add(String(r.name||'').trim());if(r.catalog_item_id)existingIds.add(r.catalog_item_id)});
 var added=[],skipped=0,now=stamp||new Date().toISOString();
 catalog.items.filter(function(item){return !grade||String(item.grade)===String(grade)}).forEach(function(item){
  if(names.has(item.name.trim())||existingIds.has(item.item_id)){skipped++;return}
  names.add(item.name.trim());existingIds.add(item.item_id);
  added.push({id:makeID(),kind:'collection',game:catalog.game,name:item.name.trim(),category:item.category||'收集品',image:item.image||'',target:1,starting_quantity:0,acquisitions:[],note:'',import_source:'catalog',imported_at:now,catalog_id:catalog.id,catalog_item_id:item.item_id,catalog_object_id:item.object_id||"",catalog_grade:item.grade,catalog_snapshot:catalog.retrieved_at,catalog_source:catalog.source_url});
 });
 return {added:added,skipped:skipped};
}
return {plan:plan};
});
