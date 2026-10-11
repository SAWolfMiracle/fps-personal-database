const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
test('public-page parser distinguishes recipe output from ingredient and ignores comments',()=>{
 const code=String.raw`
import importlib.util
spec=importlib.util.spec_from_file_location('guide','scripts/collect-obtain-guides.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
item={'name':'目标物品','item_id':'orzice:p1','source_item':'https://orzice.com/v/info/p1'}
page='''<title>【目标物品】</title><div class="ii-desc">故事设定，不是来源。</div><h2>军需处兑换</h2><div class="orz-item-info"><div class="orz-item-tag">30级解锁</div><div class="avatar" title="别的成品 * 1"></div><div class="avatar" title="目标物品 * 2"></div><div class="orz-item-info"><div class="orz-item-tag">40级解锁</div><div class="avatar" title="目标物品 * 1"></div><div class="avatar" title="材料 * 3"></div><h2>刷新容器</h2><h3 class="item-name">保险箱</h3><h3 class="item-name">保险箱</h3><h2>评论</h2><h3 class="item-name">假掉落</h3>'''
r=m.parse(item,page)
assert r['containers']==['保险箱']
assert r['exchange']==[{'unlock':'40级解锁','ingredients':['材料 * 3']}]
assert not r['tradeable']
assert r['explicit_source']==''
try:m.parse(item,'<title>别的物品</title>')
except ValueError:pass
else:raise AssertionError('mismatched page accepted')
print('parser verified')
`;
 const result=spawnSync('python3',['-c',code],{cwd:require('node:path').join(__dirname,'..'),encoding:'utf8'});assert.equal(result.status,0,result.stderr);assert.match(result.stdout,/parser verified/);
});
