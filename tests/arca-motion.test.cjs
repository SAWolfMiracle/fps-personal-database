const test=require('node:test'),assert=require('node:assert/strict'),motion=require('../arca-motion.js');
function fixture(reduce=false){
 const media={matches:reduce,addEventListener(k,fn){this.change=fn}},animations=[];
 const win={matchMedia:()=>media,getComputedStyle:n=>({opacity:'1',paddingTop:'20px',paddingBottom:'20px',marginTop:'0px',marginBottom:'24px'})};
 const node={hidden:true,inert:false,style:{overflow:'visible'},getBoundingClientRect:()=>({height:300}),getClientRects(){return this.hidden?[]:[{}]},animate(frames,options){let resolve,reject;const finished=new Promise((a,b)=>{resolve=a;reject=b});const a={frames,options,finished,finish:resolve,cancel(){this.cancelled=true;reject(Error('cancelled'))}};animations.push(a);return a}};
 return {api:motion.create(win),node,media,animations};
}
test('panels expand and collapse without leaving clipping or inert state behind',async()=>{
 const f=fixture();f.api.disclose(f.node,true,true);assert.equal(f.node.hidden,false);assert.equal(f.node.style.overflow,'hidden');assert.equal(f.animations[0].options.duration,240);f.animations[0].finish();await Promise.resolve();assert.equal(f.node.style.overflow,'visible');
 f.api.disclose(f.node,false,true);assert.equal(f.node.inert,true);assert.equal(f.node.hidden,false);f.animations[1].finish();await Promise.resolve();assert.equal(f.node.hidden,true);assert.equal(f.node.inert,false);
});
test('rapid reversals cancel stale animations so an old close cannot hide a reopened panel',async()=>{
 const f=fixture();f.api.disclose(f.node,true,true);f.api.disclose(f.node,false,true);f.api.disclose(f.node,true,true);assert.ok(f.animations[0].cancelled);assert.ok(f.animations[1].cancelled);f.animations[1].finish();f.animations[2].finish();await Promise.resolve();assert.equal(f.node.hidden,false);assert.equal(f.node.style.overflow,'visible');assert.equal(f.node.inert,false);
});
test('reduced motion skips effects and changing the preference settles running disclosures',async()=>{
 const f=fixture(true);f.api.disclose(f.node,true,true);f.api.pulse(f.node);assert.equal(f.animations.length,0);assert.equal(f.node.hidden,false);
 f.media.matches=false;f.api.disclose(f.node,false,true);f.media.matches=true;f.media.change();await Promise.resolve();assert.equal(f.node.hidden,true);assert.equal(f.node.style.overflow,'visible');assert.equal(f.node.inert,false);
});
test('unsupported or failing Web Animations never blocks a panel operation',()=>{
 const f=fixture();f.node.animate=null;f.api.disclose(f.node,true,true);assert.equal(f.node.hidden,false);f.api.disclose(f.node,false,true);assert.equal(f.node.hidden,true);
 f.node.animate=()=>{throw Error('unsupported')};f.api.disclose(f.node,true,true);assert.equal(f.node.hidden,false);assert.equal(f.node.style.overflow,'visible');
});
test('page and progress effects animate visible content only and leave no permanent transform',async()=>{
 const f=fixture();f.api.page(f.node);assert.equal(f.animations.length,0);f.node.hidden=false;f.api.page(f.node);assert.equal(f.animations[0].options.duration,160);f.api.progress(f.node,'0%','100%');assert.ok(f.animations[0].cancelled);assert.equal(f.animations[1].frames[1].width,'100%');f.animations[1].finish();await Promise.resolve();assert.equal(f.node.style.transform,undefined);f.api.progress(f.node,'100%','100%');assert.equal(f.animations.length,2);
});
