const {test}=require('node:test');
const assert=require('node:assert/strict');
const {parse}=require('../ocr-import.js');
test('explicit bilingual fields preserve zero and negative net profit',()=>{
 assert.deepEqual(parse('三角洲行动\n撤离成功\n击杀：0\nDeaths: 1\n助攻: 2\n净收益: -1,200\n带出价值: 90,000'),{game:'三角洲行动',result:'撤离',kills:0,deaths:1,assists:2,profit:-1200});
});
test('conflicts, missing values and ambiguous amounts are not fabricated',()=>{
 const value=parse('Delta Force\n撤离成功\n阵亡\nKills: 5\nKills: 6\nDeaths: 1.5\n花费: -5\n数量: 2万\nHK416\n带出价值: 300000');
 assert.deepEqual(value,{game:'三角洲行动'});assert.deepEqual(parse(null),{});
});
test('collection snapshot extracts explicit name and quantity, never acquisition history',()=>{
 assert.deepEqual(parse('Game: Delta Force\nItem name: OCR TEST ITEM\nQuantity: 3\nCategory: Collectible'),{game:'Delta Force',name:'OCR TEST ITEM',quantity:3,category:'Collectible'});
});
