/* Only item identities and categories; importing a catalog never claims ownership. */
(function(root,factory){var node=typeof module==='object'&&module.exports;var api=factory(node?require('./collection-guides.js'):root.FPSObtainGuides);if(node)module.exports=api;else root.FPSCatalog=api})(typeof window==='object'?window:this,function(sourceData){
'use strict';
var guideEntries=sourceData&&sourceData.entries||{},guideNames={};Object.keys(guideEntries).forEach(function(id){guideNames[guideEntries[id].name]=id});
function gameKey(value){return /^(三角洲行动|三角洲|delta force)$/i.test(String(value||'').trim())?'三角洲行动':String(value||'').trim()}
function plan(catalog,records,makeID,stamp,grade){
 if(!catalog||catalog.id!=='delta-force-collectibles'||catalog.game!=='三角洲行动'||!Array.isArray(catalog.items)||!catalog.items.length||catalog.items.length>3000)throw Error('目录格式无效');
 var ids=new Set();catalog.items.forEach(function(item){if(!item||!/^orzice:p?\d+$/.test(item.item_id)||!item.name||item.name.length>200||!Number.isInteger(item.grade)||item.grade<1||item.grade>6||ids.has(item.item_id))throw Error('目录条目无效');ids.add(item.item_id)});
 var names=new Set(),existingIds=new Set();records.filter(function(r){return r.kind==='collection'&&gameKey(r.game)===catalog.game}).forEach(function(r){names.add(String(r.name||'').trim());if(r.catalog_item_id)existingIds.add(r.catalog_item_id)});
 var added=[],skipped=0,now=stamp||new Date().toISOString();
 catalog.items.filter(function(item){return !grade||String(item.grade)===String(grade)}).forEach(function(item){
  if(names.has(item.name.trim())||existingIds.has(item.item_id)){skipped++;return}
  names.add(item.name.trim());existingIds.add(item.item_id);
  added.push({id:makeID(),kind:'collection',game:catalog.game,name:item.name.trim(),category:item.category||'收集品',image:item.image||'',target:1,starting_quantity:0,acquisitions:[],note:'',import_source:'catalog',imported_at:now,catalog_id:catalog.id,catalog_item_id:item.item_id,catalog_object_id:item.object_id||"",catalog_grade:item.grade,catalog_snapshot:catalog.retrieved_at});
 });
 return {added:added,skipped:skipped};
}
var deckNames={"orzice:p1518": "阿萨拉牌-牌盒", "orzice:p1517": "阿萨拉牌-大王", "orzice:p1524": "阿萨拉牌-小王", "orzice:p1529": "阿萨拉牌-方片A", "orzice:p1528": "阿萨拉牌-梅花A", "orzice:p1527": "阿萨拉牌-红桃A", "orzice:p1526": "阿萨拉牌-黑桃A", "orzice:p1547": "阿萨拉牌-方片K", "orzice:p1546": "阿萨拉牌-梅花K", "orzice:p1545": "阿萨拉牌-红桃K", "orzice:p1544": "阿萨拉牌-黑桃K", "orzice:p1543": "阿萨拉牌-方片Q", "orzice:p1542": "阿萨拉牌-梅花Q", "orzice:p1541": "阿萨拉牌-红桃Q", "orzice:p1540": "阿萨拉牌-黑桃Q", "orzice:p1539": "阿萨拉牌-方片J", "orzice:p1538": "阿萨拉牌-梅花J", "orzice:p1537": "阿萨拉牌-红桃J", "orzice:p1536": "阿萨拉牌-黑桃J", "orzice:p1579": "阿萨拉牌-方片9", "orzice:p1578": "阿萨拉牌-梅花9", "orzice:p1577": "阿萨拉牌-红桃9", "orzice:p1576": "阿萨拉牌-黑桃9", "orzice:p1575": "阿萨拉牌-方片8", "orzice:p1574": "阿萨拉牌-梅花8", "orzice:p1573": "阿萨拉牌-红桃8", "orzice:p1572": "阿萨拉牌-黑桃8", "orzice:p1571": "阿萨拉牌-方片7", "orzice:p1570": "阿萨拉牌-梅花7", "orzice:p1569": "阿萨拉牌-红桃7", "orzice:p1568": "阿萨拉牌-黑桃7", "orzice:p1567": "阿萨拉牌-方片6", "orzice:p1566": "阿萨拉牌-梅花6", "orzice:p1565": "阿萨拉牌-红桃6", "orzice:p1564": "阿萨拉牌-黑桃6", "orzice:p1563": "阿萨拉牌-方片5", "orzice:p1562": "阿萨拉牌-梅花5", "orzice:p1561": "阿萨拉牌-红桃5", "orzice:p1560": "阿萨拉牌-黑桃5", "orzice:p1559": "阿萨拉牌-方片4", "orzice:p1558": "阿萨拉牌-梅花4", "orzice:p1557": "阿萨拉牌-红桃4", "orzice:p1556": "阿萨拉牌-黑桃4", "orzice:p1555": "阿萨拉牌-方片3", "orzice:p1554": "阿萨拉牌-梅花3", "orzice:p1553": "阿萨拉牌-红桃3", "orzice:p1552": "阿萨拉牌-黑桃3", "orzice:p1551": "阿萨拉牌-方片2", "orzice:p1550": "阿萨拉牌-梅花2", "orzice:p1549": "阿萨拉牌-红桃2", "orzice:p1548": "阿萨拉牌-黑桃2", "orzice:p1535": "阿萨拉牌-方片10", "orzice:p1534": "阿萨拉牌-梅花10", "orzice:p1533": "阿萨拉牌-红桃10", "orzice:p1532": "阿萨拉牌-黑桃10"};
function cardName(r){if(gameKey(r.game)!=='三角洲行动')return '';var name=deckNames[r.catalog_item_id]||String(r.name||'').trim();return /^阿萨拉牌-(牌盒|大王|小王|(黑桃|红桃|梅花|方片)(A|K|Q|J|10|[2-9]))$/.test(name)?name:''}
function group(r){if(r.collection_group==='普通库存')return '';if(r.collection_group)return String(r.collection_group).slice(0,80);return cardName(r)?'阿萨拉牌':''}
function deckProgress(records,quantity){var held=new Set(),box=false;records.filter(function(r){return r.kind==='collection'&&group(r)==='阿萨拉牌'}).forEach(function(r){var name=cardName(r);if(!name||quantity(r)<1)return;if(name==='阿萨拉牌-牌盒')box=true;else held.add(name)});return {owned:held.size,total:54,box:box,missing:Object.values(deckNames).filter(function(n){return n!=='阿萨拉牌-牌盒'&&!held.has(n)})}}
var modelNames={'orzice:p1628':'德小兰','orzice:p1629':'灰鲭鲨模型','orzice:p1630':'德小兰·灰鲭鲨模型'};
function acquisitionGuide(r,now){
 if(r.obtain_method&&String(r.obtain_method).trim())return {summary:'个人补充',text:String(r.obtain_method).trim().slice(0,2000),status:'未独立核实',source:'',checked:''};
 if(gameKey(r.game)!=='三角洲行动')return {summary:'待核实',text:'尚未补充可靠获取资料；可在编辑中填写个人补充。',status:'待核实',source:'',checked:''};
 var name=modelNames[r.catalog_item_id]||String(r.name||'').trim();
 if(!Object.values(modelNames).includes(name))return referenceGuide(r);
 var start=Date.parse('2026-10-16T00:00:00+08:00'),end=Date.parse('2027-01-21T02:00:00+08:00'),time=now==null?Date.now():Number(now);
 var status=time<start?'尚未开放':time>=end?'活动已结束；历史途径':'公告开放期内；以游戏内为准';
var text=name==='德小兰·灰鲭鲨模型'?'集齐德小兰和灰鲭鲨模型后组装。材料的公告获取途径为极星守望限时玩法；本站不会自动合成或扣除材料。':'极星守望玩法：提高绩效等级，领取德穆兰嘉奖箱后有概率开出；或以 G.T.I. 干员击败玩家扮演的德穆兰，搜索其夹层，有概率获得。公告未公布掉落概率。';
 text+=' 玩法时间（北京时间）：2026-10-16 00:00 至 2027-01-21 02:00。地图：航天基地机密 / 绝密、AZ-3 机密。扮演德穆兰需先完成德穆兰档案，入局消耗安全总监工卡；副官需与德穆兰组队。上述身份条件不等于 G.T.I. 搜夹层的条件。';
 return {summary:name==='德小兰·灰鲭鲨模型'?'集齐两件材料后组装':'限时玩法 · 嘉奖箱 / 德穆兰夹层',text:text,status:status,source:'https://steamcommunity.com/app/2507950/announcements/?l=schinese',checked:'2026-10-11',sourceLabel:'官方 10 月 10 日更新公告（发布于 10 月 9 日）'};
}
function referenceGuide(r){
 var fact=guideEntries[r.catalog_item_id]||guideEntries[guideNames[String(r.name||'').trim()]],parts=[],labels=[];
 if(!fact)return {summary:'待核实',text:'尚未补充可靠获取资料；不根据名称或品质猜测刷新点。',status:'待核实',source:'',checked:''};
 if(fact.guide)return Object.assign({},fact.guide);
 if(fact.containers&&fact.containers.length){labels.push('容器搜刮');parts.push('公开资料列出的刷新容器：'+fact.containers.join('、')+'。仅表示可能掉落，不保证出货；未核实各地图、难度及当前掉落概率。')}
 if(fact.exchange&&fact.exchange.length){labels.push('军需处兑换');fact.exchange.forEach(function(x){parts.push('军需处兑换：'+(x.unlock||'解锁条件未注明')+'；材料 '+x.ingredients.join('、')+'。配方及限购以游戏内为准。')})}
 if(fact.tradeable){labels.push('交易行');parts.push('资料页标为可交易，可在交易行寻找货源；当前供货、解锁条件和价格以游戏内为准。')}
 if(fact.explicit_source){labels.push('物品说明来源');parts.push('物品说明标注：'+fact.explicit_source)}
 if(!parts.length)parts.push('已检查该物品资料页，但未找到明确获取途径。具体任务、活动或刷新点仍待核实；禁止交易不等于只能搜刮。');
 return {summary:labels.join(' / ')||'待核实',text:parts.join(' '),status:labels.length?'公开资料参考 · 非实时验证':'待核实',source:fact.source,sourceLabel:fact.source_label||'',checked:fact.checked};
}
function guideCoverage(){var list=Object.keys(guideEntries).map(function(id){return acquisitionGuide({game:'三角洲行动',catalog_item_id:id,name:guideEntries[id].name})});return {total:list.length,known:list.filter(function(g){return g.summary!=='待核实'}).length,pending:list.filter(function(g){return g.summary==='待核实'}).length}}
return {deckItems:function(){return Object.keys(deckNames).map(function(id){return {id:id,name:deckNames[id]}})},plan:plan,group:group,cardName:cardName,deckProgress:deckProgress,acquisitionGuide:acquisitionGuide,guideCoverage:guideCoverage};
});
