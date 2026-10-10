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
var deckNames={"orzice:p1518": "阿萨拉牌-牌盒", "orzice:p1517": "阿萨拉牌-大王", "orzice:p1524": "阿萨拉牌-小王", "orzice:p1529": "阿萨拉牌-方片A", "orzice:p1528": "阿萨拉牌-梅花A", "orzice:p1527": "阿萨拉牌-红桃A", "orzice:p1526": "阿萨拉牌-黑桃A", "orzice:p1547": "阿萨拉牌-方片K", "orzice:p1546": "阿萨拉牌-梅花K", "orzice:p1545": "阿萨拉牌-红桃K", "orzice:p1544": "阿萨拉牌-黑桃K", "orzice:p1543": "阿萨拉牌-方片Q", "orzice:p1542": "阿萨拉牌-梅花Q", "orzice:p1541": "阿萨拉牌-红桃Q", "orzice:p1540": "阿萨拉牌-黑桃Q", "orzice:p1539": "阿萨拉牌-方片J", "orzice:p1538": "阿萨拉牌-梅花J", "orzice:p1537": "阿萨拉牌-红桃J", "orzice:p1536": "阿萨拉牌-黑桃J", "orzice:p1579": "阿萨拉牌-方片9", "orzice:p1578": "阿萨拉牌-梅花9", "orzice:p1577": "阿萨拉牌-红桃9", "orzice:p1576": "阿萨拉牌-黑桃9", "orzice:p1575": "阿萨拉牌-方片8", "orzice:p1574": "阿萨拉牌-梅花8", "orzice:p1573": "阿萨拉牌-红桃8", "orzice:p1572": "阿萨拉牌-黑桃8", "orzice:p1571": "阿萨拉牌-方片7", "orzice:p1570": "阿萨拉牌-梅花7", "orzice:p1569": "阿萨拉牌-红桃7", "orzice:p1568": "阿萨拉牌-黑桃7", "orzice:p1567": "阿萨拉牌-方片6", "orzice:p1566": "阿萨拉牌-梅花6", "orzice:p1565": "阿萨拉牌-红桃6", "orzice:p1564": "阿萨拉牌-黑桃6", "orzice:p1563": "阿萨拉牌-方片5", "orzice:p1562": "阿萨拉牌-梅花5", "orzice:p1561": "阿萨拉牌-红桃5", "orzice:p1560": "阿萨拉牌-黑桃5", "orzice:p1559": "阿萨拉牌-方片4", "orzice:p1558": "阿萨拉牌-梅花4", "orzice:p1557": "阿萨拉牌-红桃4", "orzice:p1556": "阿萨拉牌-黑桃4", "orzice:p1555": "阿萨拉牌-方片3", "orzice:p1554": "阿萨拉牌-梅花3", "orzice:p1553": "阿萨拉牌-红桃3", "orzice:p1552": "阿萨拉牌-黑桃3", "orzice:p1551": "阿萨拉牌-方片2", "orzice:p1550": "阿萨拉牌-梅花2", "orzice:p1549": "阿萨拉牌-红桃2", "orzice:p1548": "阿萨拉牌-黑桃2", "orzice:p1535": "阿萨拉牌-方片10", "orzice:p1534": "阿萨拉牌-梅花10", "orzice:p1533": "阿萨拉牌-红桃10", "orzice:p1532": "阿萨拉牌-黑桃10"};
function cardName(r){if(gameKey(r.game)!=='三角洲行动')return '';var name=deckNames[r.catalog_item_id]||String(r.name||'').trim();return /^阿萨拉牌-(牌盒|大王|小王|(黑桃|红桃|梅花|方片)(A|K|Q|J|10|[2-9]))$/.test(name)?name:''}
function group(r){if(r.collection_group==='普通库存')return '';if(r.collection_group)return String(r.collection_group).slice(0,80);return cardName(r)?'阿萨拉牌':''}
function deckProgress(records,quantity){var held=new Set(),box=false;records.filter(function(r){return r.kind==='collection'&&group(r)==='阿萨拉牌'}).forEach(function(r){var name=cardName(r);if(!name||quantity(r)<1)return;if(name==='阿萨拉牌-牌盒')box=true;else held.add(name)});return {owned:held.size,total:54,box:box,missing:Object.values(deckNames).filter(function(n){return n!=='阿萨拉牌-牌盒'&&!held.has(n)})}}
return {plan:plan,group:group,cardName:cardName,deckProgress:deckProgress};
});
