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
var legacyFiveMaps=['零号大坝','长弓溪谷','航天基地','巴克什','潮汐监狱'];
var researchedMapContexts={
 'orzice:p1457':{maps:legacyFiveMaps,note:'S9 限时藏宝堆路线：当时五张烽火地带地图均有藏宝堆；属于历史活动地图，不代表当前仍开放。'},
 'orzice:p1456':{maps:legacyFiveMaps,note:'S9 历史掉落范围：当时五张烽火地带地图的各类容器均有低概率掉落；没有固定刷新点，当前掉落状态未核实。'},
 'orzice:p1348':{maps:legacyFiveMaps,note:'S8 历史容器路线覆盖当时五张地图；春节联动福贝点位另见零号大坝、长弓溪谷、航天基地、潮汐监狱。活动已结束，返场未核实。'},
 'orzice:p1361':{maps:['零号大坝','巴克什','航天基地'],note:'S8 赤枭巡猎历史地图：零号大坝、巴克什、航天基地；当前玩法是否开放未核实。'},
 'orzice:p1350':{maps:['零号大坝','巴克什','航天基地'],note:'S8 赤枭巡猎历史地图：零号大坝、巴克什、航天基地；当前玩法是否开放未核实。'},
 'orzice:p1489':{maps:legacyFiveMaps,note:'肯德基联动历史路线：活动期间五张烽火地带地图的鸟窝、旅行包均可能产出；活动已结束，返场未核实。'},
 'orzice:p1496':{maps:legacyFiveMaps,note:'2026 猛攻节藏宝堆历史路线：当时五张烽火地带地图均有藏宝堆；活动已结束，当前掉落未核实。'},
 'orzice:p1499':{maps:legacyFiveMaps,note:'古墓丽影联动期间从藏宝堆获取钥匙；当时五张地图均有藏宝堆。历史活动范围，不代表当前仍可获取。'},
 'orzice:p1500':{maps:legacyFiveMaps,note:'古墓丽影联动期间从藏宝堆获取钥匙；当时五张地图均有藏宝堆。历史活动范围，不代表当前仍可获取。'},
 'orzice:p1501':{maps:legacyFiveMaps,note:'古墓丽影联动期间从藏宝堆获取钥匙；当时五张地图均有藏宝堆。历史活动范围，不代表当前仍可获取。'},
 'orzice:p1502':{maps:legacyFiveMaps,note:'古墓丽影联动期间从藏宝堆获取钥匙；当时五张地图均有藏宝堆。历史活动范围，不代表当前仍可获取。'},
 'orzice:p1503':{maps:legacyFiveMaps,note:'古墓丽影联动期间从藏宝堆获取钥匙；当时五张地图均有藏宝堆。历史活动范围，不代表当前仍可获取。'},
 'orzice:p1504':{maps:legacyFiveMaps,note:'古墓丽影联动期间从藏宝堆获取钥匙；当时五张地图均有藏宝堆。历史活动范围，不代表当前仍可获取。'},
 'orzice:p1488':{maps:['零号大坝','长弓溪谷','巴克什','航天基地'],note:'契约之钥兑换点为牛角之神雕像；雕像分布于这四张地图。历史活动点位，当前活动状态未核实。'},
 'orzice:p1498':{maps:['零号大坝','长弓溪谷','巴克什','航天基地'],note:'普通劳拉手办可在这四张地图的牛角之神雕像处兑换；大坝水泥厂是攻略记录的其中一个点位。历史活动点位，当前活动状态未核实。'},
 'orzice:p189':{maps:['零号大坝','长弓溪谷','巴克什','航天基地','AZ-3'],note:'二周年哈夫克保险小队历史地图：零号大坝、长弓溪谷、巴克什、航天基地、AZ-3；不含潮汐监狱及零号大坝黑夜行动。活动已于 2026-10-08 结束。'},
 'orzice:p187':{maps:legacyFiveMaps,note:'2026 猛攻节大红砖返场历史地图：活动期间五张烽火地带地图均可参与；活动已结束，其他返场未核实。'},
 'orzice:p1089':{maps:legacyFiveMaps,note:'2026 猛攻节大红砖返场历史地图：活动期间五张烽火地带地图均可参与；活动已结束，其他返场未核实。'},
 'orzice:p1249':{maps:legacyFiveMaps,note:'2026 猛攻节大红砖返场历史地图：活动期间五张烽火地带地图均可参与；活动已结束，其他返场未核实。'},
 'orzice:1061':{maps:['潮汐监狱'],note:'潮汐监狱系列地图收藏品；旧赛季资料记载仅在潮汐监狱产出，当前掉落状态未实机复核。'},
 'orzice:1054':{maps:['潮汐监狱'],note:'潮汐监狱系列地图收藏品；旧赛季资料记载仅在潮汐监狱产出，当前掉落状态未实机复核。'},
 'orzice:1056':{maps:['潮汐监狱'],note:'潮汐监狱系列地图收藏品；旧赛季资料记载仅在潮汐监狱产出，当前掉落状态未实机复核。'},
 'orzice:1062':{maps:['潮汐监狱'],note:'潮汐监狱系列地图收藏品；旧赛季资料记载仅在潮汐监狱产出，当前掉落状态未实机复核。'},
 'orzice:955':{maps:['潮汐监狱'],note:'旧赛季资料记载为潮汐监狱首领渡鸦掉落；当前掉落状态未实机复核。'},
 'orzice:964':{maps:['潮汐监狱'],note:'旧赛季资料记载为潮汐监狱产出；当前掉落状态未实机复核。'},
 'orzice:1204':{maps:['潮汐监狱'],note:'旧赛季资料将潮汐监狱列为主要产出地图；特殊兵种补给等跨图说法未核实。'},
 'orzice:962':{maps:['航天基地','长弓溪谷'],note:'S5 赛季资料记载的主要产出地图；当前掉落状态未实机复核。'},
 'orzice:1064':{maps:['航天基地','零号大坝'],note:'S5 赛季资料记载的主要产出地图；当前掉落状态未实机复核。'},
 'orzice:978':{maps:['航天基地','长弓溪谷'],note:'S5 赛季资料记载的主要产出地图；当前掉落状态未实机复核。'},
 'orzice:1284':{maps:['零号大坝','航天基地'],note:'资料记载零号大坝水泥厂及航天基地可产出；当前掉落状态未实机复核。'},
 'orzice:1257':{maps:['航天基地','零号大坝'],note:'资料记载航天基地核心区、零号大坝行政区可产出；当前掉落状态未实机复核。'},
 'orzice:p1455':{maps:['巴克什'],note:'旧赛季资料记录的固定刷新点在巴克什；其他地图容器随机产出的说法相互冲突，未纳入确认范围。'},
 'orzice:1283':{maps:legacyFiveMaps,note:'S9 赛季资料记载的工具刷新范围为当时五张烽火地带地图；属于旧赛季范围，新增地图及当前掉落未核实。'},
 'orzice:1218':{maps:['航天基地','长弓溪谷'],note:'S6 赛季资料记载的主要产出地图；当前掉落状态未实机复核。'},
 'orzice:p1338':{maps:legacyFiveMaps,note:'2026 年 1 月限时活动：当时五张烽火地带地图的鸟窝可能产出；活动已结束，返场未核实。'},
 'orzice:1217':{maps:['所有地图（历史资料）'],note:'S6 赛季资料记载为全地图产出；属于旧赛季记录，当前范围未实机复核。'},
 'orzice:1199':{maps:['潮汐监狱'],note:'S6 赛季资料记载主要产自潮汐监狱；当前掉落状态未实机复核。'},
 'orzice:1200':{maps:['潮汐监狱'],note:'S6 赛季资料记载主要产自潮汐监狱；当前掉落状态未实机复核。'},
 'orzice:1207':{maps:['航天基地','零号大坝'],note:'S6 赛季资料记载的产出地图；当前掉落状态未实机复核。'},
 'orzice:1203':{maps:['航天基地','长弓溪谷'],note:'S6 赛季资料记载的产出地图；当前掉落状态未实机复核。'},
 'orzice:1201':{maps:['所有地图（历史资料）'],note:'S6 资料有全地图产出的记录，也有攻略称主要产自航天基地、长弓溪谷；具体范围存在分歧，当前未实机复核。'},
 'orzice:1202':{maps:['航天基地','零号大坝'],note:'S6 赛季资料记载的主要产出地图；当前掉落状态未实机复核。'},
 'orzice:1205':{maps:['潮汐监狱'],note:'S6 赛季资料记载为潮汐监狱首领掉落；当前掉落状态未实机复核。'},
 'orzice:1206':{maps:['航天基地','长弓溪谷'],note:'S6 赛季资料记载的主要产出地图；当前掉落状态未实机复核。'},
 'orzice:1209':{maps:['航天基地','零号大坝'],note:'S6 赛季资料记载的主要产出地图；当前掉落状态未实机复核。'},
 'orzice:1208':{maps:['航天基地','零号大坝'],note:'S6 赛季资料记载的主要产出地图；当前掉落状态未实机复核。'},
 'orzice:p1086':{maps:['潮汐监狱'],note:'S5 赛季资料记载仅在潮汐监狱产出；当前掉落状态未实机复核。'},
 'orzice:1065':{maps:['潮汐监狱'],note:'S5 赛季资料记载为潮汐监狱专属；当前掉落状态未实机复核。'},
 'orzice:900':{maps:['航天基地','长弓溪谷'],note:'S5 赛季资料记载的主要产出地图；当前掉落状态未实机复核。'},
 'orzice:902':{maps:['航天基地','长弓溪谷'],note:'S5 赛季资料记载的主要产出地图；当前掉落状态未实机复核。'},
 'orzice:952':{maps:['航天基地','长弓溪谷'],note:'S5 赛季资料记载的主要产出地图；渡鸦首领掉落关联地图未据此额外推断，当前范围未实机复核。'},
 'orzice:1023':{maps:["长弓溪谷","航天基地"],note:"公开物品资料标注搜索区域：长弓溪谷-钻石皇后酒店、航天基地-核心区；这是搜索线索，不代表唯一产出点或当前赛季完整范围，当前掉落未实机复核。"},
 'orzice:1037':{maps:["长弓溪谷","航天基地"],note:"公开物品资料标注搜索区域：长弓溪谷-钻石皇后酒店、航天基地-宿舍区；这是搜索线索，不代表唯一产出点或当前赛季完整范围，当前掉落未实机复核。"},
 'orzice:1038':{maps:["长弓溪谷","航天基地"],note:"公开物品资料标注搜索区域：长弓溪谷-钻石皇后酒店、航天基地-宿舍区；这是搜索线索，不代表唯一产出点或当前赛季完整范围，当前掉落未实机复核。"},
 'orzice:1051':{maps:["零号大坝","航天基地"],note:"公开物品资料标注搜索区域：零号大坝-行政辖区、航天基地-核心区；这是搜索线索，不代表唯一产出点或当前赛季完整范围，当前掉落未实机复核。"},
 'orzice:1018':{maps:["长弓溪谷","航天基地"],note:"公开物品资料标注搜索区域：长弓溪谷-钻石皇后酒店、航天基地-核心区；这是搜索线索，不代表唯一产出点或当前赛季完整范围，当前掉落未实机复核。"},
 'orzice:1063':{maps:["零号大坝","航天基地"],note:"公开物品资料标注搜索区域：零号大坝-行政辖区、航天基地-核心区；这是搜索线索，不代表唯一产出点或当前赛季完整范围，当前掉落未实机复核。"},
 'orzice:949':{maps:["长弓溪谷","航天基地"],note:"公开物品资料标注搜索区域：长弓溪谷-钻石皇后酒店、航天基地-核心区；这是搜索线索，不代表唯一产出点或当前赛季完整范围，当前掉落未实机复核。"},
 'orzice:1045':{maps:["长弓溪谷","航天基地"],note:"公开物品资料标注搜索区域：长弓溪谷-钻石皇后酒店、航天基地-核心区；这是搜索线索，不代表唯一产出点或当前赛季完整范围，当前掉落未实机复核。"},
 'orzice:1041':{maps:["长弓溪谷","航天基地"],note:"公开物品资料标注搜索区域：长弓溪谷-钻石皇后酒店、航天基地-核心区；这是搜索线索，不代表唯一产出点或当前赛季完整范围，当前掉落未实机复核。"},
 'orzice:784':{maps:["长弓溪谷","航天基地"],note:"公开物品资料标注搜索区域：长弓溪谷-哈夫克雷达站、航天基地-核心区；这是搜索线索，不代表唯一产出点或当前赛季完整范围，当前掉落未实机复核。"},
 'orzice:788':{maps:["长弓溪谷","航天基地"],note:"公开物品资料标注搜索区域：长弓溪谷-哈夫克雷达站、航天基地-核心区；这是搜索线索，不代表唯一产出点或当前赛季完整范围，当前掉落未实机复核。"},
 'orzice:783':{maps:["长弓溪谷","航天基地"],note:"公开物品资料标注搜索区域：长弓溪谷-哈夫克雷达站、航天基地-核心区；这是搜索线索，不代表唯一产出点或当前赛季完整范围，当前掉落未实机复核。"},
 'orzice:950':{maps:["长弓溪谷","航天基地"],note:"公开物品资料标注搜索区域：长弓溪谷-钻石皇后酒店、航天基地-宿舍区；这是搜索线索，不代表唯一产出点或当前赛季完整范围，当前掉落未实机复核。"},
 'orzice:948':{maps:["长弓溪谷","航天基地"],note:"公开物品资料标注搜索区域：长弓溪谷-钻石皇后酒店、航天基地-核心区；这是搜索线索，不代表唯一产出点或当前赛季完整范围，当前掉落未实机复核。"},
 'orzice:1044':{maps:["长弓溪谷","航天基地","巴克什"],note:"公开攻略线索：长弓溪谷-钻石皇后酒店、航天基地-核心区、巴克什-巴别塔总裁室附近；不同地图点位可能对应不同刷新方式，不代表唯一或当前赛季完整范围，未实机复核。"},
 'orzice:1046':{maps:["长弓溪谷","航天基地"],note:"公开物品资料标注搜索区域：长弓溪谷-钻石皇后酒店、航天基地-核心区；这是搜索线索，不代表唯一产出点或当前赛季完整范围，当前掉落未实机复核。"},
 'orzice:1049':{maps:["长弓溪谷","航天基地"],note:"公开物品资料标注搜索区域：长弓溪谷-钻石皇后酒店、航天基地-核心区；这是搜索线索，不代表唯一产出点或当前赛季完整范围，当前掉落未实机复核。"},
 'orzice:1055':{maps:["零号大坝","航天基地"],note:"公开物品资料标注搜索区域：零号大坝-行政辖区、航天基地-核心区；这是搜索线索，不代表唯一产出点或当前赛季完整范围，当前掉落未实机复核。"},
 'orzice:1053':{maps:["零号大坝","航天基地"],note:"公开物品资料标注搜索区域：零号大坝-行政辖区、航天基地-核心区；这是搜索线索，不代表唯一产出点或当前赛季完整范围，当前掉落未实机复核。"},
 'orzice:1034':{maps:["长弓溪谷","航天基地"],note:"公开物品资料标注搜索区域：长弓溪谷-钻石皇后酒店、航天基地-宿舍区；这是搜索线索，不代表唯一产出点或当前赛季完整范围，当前掉落未实机复核。"},
 'orzice:1020':{maps:["长弓溪谷","航天基地"],note:"公开物品资料标注搜索区域：长弓溪谷-钻石皇后酒店、航天基地-核心区；这是搜索线索，不代表唯一产出点或当前赛季完整范围，当前掉落未实机复核。"},
 'orzice:1042':{maps:["长弓溪谷","航天基地"],note:"公开物品资料标注搜索区域：长弓溪谷-钻石皇后酒店、航天基地-核心区；这是搜索线索，不代表唯一产出点或当前赛季完整范围，当前掉落未实机复核。"},
 'orzice:781':{maps:["长弓溪谷","航天基地"],note:"公开物品资料标注搜索区域：长弓溪谷-哈夫克雷达站、航天基地-核心区；这是搜索线索，不代表唯一产出点或当前赛季完整范围，当前掉落未实机复核。"},
 'orzice:1031':{maps:["零号大坝","航天基地"],note:"公开物品资料标注搜索区域：零号大坝-水泥厂、航天基地-工业区；这是搜索线索，不代表唯一产出点或当前赛季完整范围，当前掉落未实机复核。"},
 'orzice:782':{maps:["长弓溪谷","航天基地"],note:"公开物品资料标注搜索区域：长弓溪谷-哈夫克雷达站、航天基地-核心区；这是搜索线索，不代表唯一产出点或当前赛季完整范围，当前掉落未实机复核。"},
 'orzice:785':{maps:["长弓溪谷","航天基地"],note:"公开物品资料标注搜索区域：长弓溪谷-哈夫克雷达站、航天基地-核心区；这是搜索线索，不代表唯一产出点或当前赛季完整范围，当前掉落未实机复核。"},
 'orzice:778':{maps:["长弓溪谷","航天基地"],note:"公开物品资料标注搜索区域：长弓溪谷-哈夫克雷达站、航天基地-核心区；这是搜索线索，不代表唯一产出点或当前赛季完整范围，当前掉落未实机复核。"},
 'orzice:789':{maps:["长弓溪谷","航天基地","零号大坝"],note:"公开攻略线索：长弓溪谷-哈夫克雷达站、航天基地-核心区、零号大坝-游客中心二楼小房间；可能为不同赛季或固定点位，不代表唯一或当前赛季完整范围，未实机复核。"},
 'orzice:777':{maps:["长弓溪谷","航天基地"],note:"公开物品资料标注搜索区域：长弓溪谷-哈夫克雷达站、航天基地-核心区；这是搜索线索，不代表唯一产出点或当前赛季完整范围，当前掉落未实机复核。"},
 'orzice:786':{maps:["长弓溪谷","航天基地"],note:"公开物品资料标注搜索区域：长弓溪谷-哈夫克雷达站、航天基地-核心区；这是搜索线索，不代表唯一产出点或当前赛季完整范围，当前掉落未实机复核。"},
 'orzice:787':{maps:["长弓溪谷","航天基地"],note:"公开物品资料标注搜索区域：长弓溪谷-哈夫克雷达站、航天基地-核心区；这是搜索线索，不代表唯一产出点或当前赛季完整范围，当前掉落未实机复核。"},
 'orzice:779':{maps:["长弓溪谷","航天基地"],note:"公开物品资料标注搜索区域：长弓溪谷-哈夫克雷达站、航天基地-核心区；这是搜索线索，不代表唯一产出点或当前赛季完整范围，当前掉落未实机复核。"},
 'orzice:1027':{maps:["零号大坝","航天基地"],note:"公开物品资料标注搜索区域：零号大坝-水泥厂、航天基地-工业区；这是搜索线索，不代表唯一产出点或当前赛季完整范围，当前掉落未实机复核。"},
 'orzice:1043':{maps:["长弓溪谷","航天基地"],note:"公开物品资料标注搜索区域：长弓溪谷-钻石皇后酒店、航天基地-核心区；这是搜索线索，不代表唯一产出点或当前赛季完整范围，当前掉落未实机复核。"},
 'orzice:p232':{maps:["长弓溪谷","航天基地"],note:"公开物品资料标注搜索区域：长弓溪谷-钻石皇后酒店、航天基地-核心区；这是搜索线索，不代表唯一产出点或当前赛季完整范围，当前掉落未实机复核。"},
 'orzice:898':{maps:["零号大坝","航天基地"],note:"公开物品资料标注搜索区域：零号大坝-水泥厂、航天基地-工业区；这是搜索线索，不代表唯一产出点或当前赛季完整范围，当前掉落未实机复核。"},
 'orzice:1058':{maps:["零号大坝","航天基地"],note:"公开物品资料标注搜索区域：零号大坝-行政辖区、航天基地-核心区；这是搜索线索，不代表唯一产出点或当前赛季完整范围，当前掉落未实机复核。"},
 'orzice:901':{maps:["长弓溪谷","航天基地"],note:"公开物品资料标注搜索区域：长弓溪谷-钻石皇后酒店、航天基地-宿舍区；这是搜索线索，不代表唯一产出点或当前赛季完整范围，当前掉落未实机复核。"},
 'orzice:1022':{maps:["长弓溪谷","航天基地"],note:"公开物品资料标注搜索区域：长弓溪谷-钻石皇后酒店、航天基地-核心区；这是搜索线索，不代表唯一产出点或当前赛季完整范围，当前掉落未实机复核。"},
 'orzice:1025':{maps:["长弓溪谷","航天基地"],note:"公开物品资料标注搜索区域：长弓溪谷-钻石皇后酒店、航天基地-核心区；这是搜索线索，不代表唯一产出点或当前赛季完整范围，当前掉落未实机复核。"},
 'orzice:1029':{maps:["零号大坝","航天基地"],note:"公开物品资料标注搜索区域：零号大坝-水泥厂、航天基地-工业区；这是搜索线索，不代表唯一产出点或当前赛季完整范围，当前掉落未实机复核。"},
 'orzice:840':{maps:["长弓溪谷","航天基地"],note:"公开物品资料标注搜索区域：长弓溪谷-钻石皇后酒店、航天基地-核心区；这是搜索线索，不代表唯一产出点或当前赛季完整范围，当前掉落未实机复核。"},
 'orzice:1030':{maps:["零号大坝","航天基地"],note:"公开物品资料标注搜索区域：零号大坝-水泥厂、航天基地-工业区；这是搜索线索，不代表唯一产出点或当前赛季完整范围，当前掉落未实机复核。"},
 'orzice:800':{maps:["长弓溪谷","航天基地"],note:"公开物品资料标注搜索区域：长弓溪谷-哈夫克雷达站、航天基地-核心区；这是搜索线索，不代表唯一产出点或当前赛季完整范围，当前掉落未实机复核。"},
 'orzice:794':{maps:["长弓溪谷","航天基地"],note:"公开物品资料标注搜索区域：长弓溪谷-哈夫克雷达站、航天基地-核心区；这是搜索线索，不代表唯一产出点或当前赛季完整范围，当前掉落未实机复核。"},
 'orzice:793':{maps:["长弓溪谷","航天基地"],note:"公开物品资料标注搜索区域：长弓溪谷-哈夫克雷达站、航天基地-核心区；这是搜索线索，不代表唯一产出点或当前赛季完整范围，当前掉落未实机复核。"},
 'orzice:803':{maps:["长弓溪谷","航天基地"],note:"公开物品资料标注搜索区域：长弓溪谷-哈夫克雷达站、航天基地-核心区；这是搜索线索，不代表唯一产出点或当前赛季完整范围，当前掉落未实机复核。"},
 'orzice:805':{maps:["长弓溪谷","航天基地"],note:"公开物品资料标注搜索区域：长弓溪谷-哈夫克雷达站、航天基地-核心区；这是搜索线索，不代表唯一产出点或当前赛季完整范围，当前掉落未实机复核。"},
 'orzice:1015':{maps:["零号大坝","航天基地"],note:"公开物品资料标注搜索区域：零号大坝-水泥厂、航天基地-工业区；这是搜索线索，不代表唯一产出点或当前赛季完整范围，当前掉落未实机复核。"},
 'orzice:p242':{maps:["零号大坝","航天基地"],note:"公开物品资料标注搜索区域：零号大坝-水泥厂、航天基地-工业区；这是搜索线索，不代表唯一产出点或当前赛季完整范围，当前掉落未实机复核。"},
 'orzice:p237':{maps:["零号大坝","航天基地"],note:"公开物品资料标注搜索区域：零号大坝-水泥厂、航天基地-工业区；这是搜索线索，不代表唯一产出点或当前赛季完整范围，当前掉落未实机复核。"},
 'orzice:1318':{maps:['AZ-3'],note:'S10 核电站地图攻略将反应堆冷却核心列为 AZ-3 专属红色物资，并给出西区、核心区、东区的露天刷新点线索；点位与当前掉落未实机复核。'},
 'orzice:p1515':{maps:['AZ-3'],note:'S10 核电站地图攻略将浓缩铀样本列为 AZ-3 专属红色物资，并给出西区、核心区、东区的露天刷新点线索；点位与当前掉落未实机复核。'},
 'orzice:1247':{maps:['AZ-3','航天基地','零号大坝'],note:'赛季资料范围有差异：较早攻略提到航天基地组装车间二楼卡房、零号大坝行政楼旁工地地面；S10 核电站资料另列 AZ-3 核心区、实验室线索。按历史搜索范围展示，当前赛季和具体刷新未实机复核。'},
 'orzice:1224':{maps:['航天基地','零号大坝'],note:'S7 赛季攻略列出的搜索地图为航天基地、零号大坝；属于历史线索，当前赛季掉落及具体区域未实机复核。'},
 'orzice:790':{maps:['零号大坝'],note:'公开攻略线索指向零号大坝游客中心二楼小房间；另有任务场景线索位于河道东侧，可能是固定任务物件，不能据此断言随机收藏掉落范围。当前点位未实机复核。'},
 'orzice:1050':{maps:['巴克什'],note:'公开攻略列出的搜索线索：巴克什-巴别塔厕所、海洋区跑步机台面；两处为攻略点位说法，不代表唯一刷新点或当前赛季完整范围，未实机复核。'}
};
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
function acquisitionDetails(r){
 var guide=acquisitionGuide(r),sameGame=gameKey(r.game)==='三角洲行动',fact=sameGame&&(guideEntries[r.catalog_item_id]||guideEntries[guideNames[String(r.name||'').trim()]]),personal=!!(r.obtain_method&&String(r.obtain_method).trim());
 var maps=fact&&Array.isArray(fact.map_contexts)?fact.map_contexts.slice():[],difficultyContexts=fact&&Array.isArray(fact.difficulty_contexts)?fact.difficulty_contexts.slice():[],mapNote=fact&&fact.map_note||'',mapChecked=fact&&fact.map_checked||'';
 if(!personal&&fact){
  var evidenceText=[fact.guide&&fact.guide.summary,fact.guide&&fact.guide.text,fact.explicit_source].filter(Boolean).join(' '),mapNames=[['零号大坝','大坝'],['长弓溪谷','长弓'],['航天基地','航天城','航天'],['巴克什'],['潮汐监狱','监狱'],['AZ-3']],mentioned=[];
  mapNames.forEach(function(aliases){if(aliases.some(function(alias){return evidenceText.toLowerCase().indexOf(alias.toLowerCase())>=0})){mentioned.push(aliases[0])}});
  var allMaps=/全地图|所有地图|各地图|全部地图/.test(evidenceText);
  mentioned.forEach(function(name){if(maps.indexOf(name)<0)maps.push(name)});
  if(allMaps&&maps.indexOf('所有地图（历史资料）')<0)maps.unshift('所有地图（历史资料）');
  if(!mapNote&&allMaps)mapNote='资料提及全地图或各地图范围；具体活动期限及当前状态见获取说明。';
  else if(!mapNote&&fact.explicit_source&&/仅限/.test(fact.explicit_source)&&mentioned.length)mapNote='物品说明注明仅限所列地图产出；行动难度和具体刷新点仍待核实。';
  else if(!mapNote&&mentioned.length)mapNote='资料提及的地图线索；不代表仅限这些地图，也不保证当前仍可获取。';
 }
 if(!personal&&fact&&fact.guide&&['orzice:p1390','orzice:p1347','orzice:p1346'].indexOf(r.catalog_item_id)>=0&&maps.indexOf('航天基地')>=0&&guide.text.indexOf('航天基地绝密')>=0)difficultyContexts=['航天基地：绝密'];
 if(!personal&&r.catalog_item_id==='orzice:p188'&&maps.length){difficultyContexts=maps.map(function(n){return n+'：常规 / 机密'})}
 if(!personal&&['orzice:p1628','orzice:p1629','orzice:p1630'].indexOf(r.catalog_item_id)>=0){maps=['航天基地','AZ-3'];difficultyContexts=['航天基地：机密 / 绝密','AZ-3：机密'];mapNote='极星守望限时玩法，开放时间和身份条件见活动说明。'}
 if(!personal&&researchedMapContexts[r.catalog_item_id]){var researched=researchedMapContexts[r.catalog_item_id];maps=researched.maps.slice();mapNote=researched.note;mapChecked='2026-10-12'}
 if(!personal&&maps.length&&!mapChecked)mapChecked=fact&&fact.checked||guide.checked||'2026-10-12';
 return {guide:guide,maps:personal?[]:maps,difficultyContexts:personal?[]:difficultyContexts,mapNote:personal?'个人补充不会作为地图证据':mapNote,mapChecked:mapChecked,containers:!personal&&fact?(fact.containers||[]):[],exchange:!personal&&fact?(fact.exchange||[]):[],tradeable:!personal&&fact?fact.tradeable:null,description:personal||!fact||fact.guide||['orzice:p1628','orzice:p1629','orzice:p1630'].indexOf(r.catalog_item_id)>=0?guide.text:(fact.explicit_source||''),difficulty:'未核实具体行动难度与掉落概率'};
}
function guideCoverage(){var ids=Object.keys(guideEntries),list=ids.map(function(id){return acquisitionGuide({game:'三角洲行动',catalog_item_id:id,name:guideEntries[id].name})}),details=ids.map(function(id){return acquisitionDetails({game:'三角洲行动',catalog_item_id:id,name:guideEntries[id].name})});return {total:list.length,known:list.filter(function(g){return g.summary!=='待核实'}).length,pending:list.filter(function(g){return g.summary==='待核实'}).length,mapsKnown:details.filter(function(d){return d.maps.length}).length,mapsPending:details.filter(function(d){return !d.maps.length}).length,difficultiesKnown:details.filter(function(d){return d.difficultyContexts.length}).length,difficultiesPending:details.filter(function(d){return !d.difficultyContexts.length}).length}}
return {deckItems:function(){return Object.keys(deckNames).map(function(id){return {id:id,name:deckNames[id]}})},plan:plan,group:group,cardName:cardName,deckProgress:deckProgress,acquisitionGuide:acquisitionGuide,acquisitionDetails:acquisitionDetails,guideCoverage:guideCoverage};
});
