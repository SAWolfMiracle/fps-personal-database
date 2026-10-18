/* Progressive motion: presentation only, with immediate reduced-motion fallback. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.ArcaMotion=factory()})(typeof window==='object'?window:this,function(){
'use strict';
function create(win){
 var active=new Map(),media=win.matchMedia?win.matchMedia('(prefers-reduced-motion: reduce)'):null;
 function reduced(){return !!(media&&media.matches)}
 function stop(node,finish){var state=active.get(node);if(!state)return;active.delete(node);state.animation.cancel();state.cleanup(!!finish)}
 function visible(node){return node&&!node.hidden&&(!node.getClientRects||node.getClientRects().length>0)}
 function play(node,frames,options,cleanup){
  var state;try{state={animation:node.animate(frames,options),cleanup:cleanup||function(){}}}catch(err){if(cleanup)cleanup(true);return null}active.set(node,state);
  state.animation.finished.then(function(){if(active.get(node)!==state)return;active.delete(node);state.cleanup(true)},function(){if(active.get(node)!==state)return;active.delete(node);state.cleanup(false)});return state;
 }
 function disclose(node,open,animated){
  if(!node)return;
  if(animated===false||reduced()||!node.animate||!node.getBoundingClientRect||!win.getComputedStyle){stop(node,false);node.hidden=!open;return}
  var previous=active.get(node);if(previous&&previous.open===open&&animated!==false&&!reduced())return;
  var before=node.hidden?0:node.getBoundingClientRect().height;
  var beforeStyle=win.getComputedStyle?win.getComputedStyle(node):null;
  var beforeBox=beforeStyle?{opacity:beforeStyle.opacity,paddingTop:beforeStyle.paddingTop,paddingBottom:beforeStyle.paddingBottom,marginTop:beforeStyle.marginTop,marginBottom:beforeStyle.marginBottom}:{};
  stop(node,false);
  if(!open&&node.hidden)return;
  node.hidden=false;
  var style=win.getComputedStyle(node),full=node.getBoundingClientRect().height,overflow=node.style.overflow,oldInert=node.inert;
  node.style.overflow='hidden';node.inert=!open;
  var expanded={height:full+'px',opacity:1,paddingTop:style.paddingTop,paddingBottom:style.paddingBottom,marginTop:style.marginTop,marginBottom:style.marginBottom};
  var collapsed={height:'0px',opacity:0,paddingTop:'0px',paddingBottom:'0px',marginTop:'0px',marginBottom:'0px'};
  var start=before?Object.assign({},expanded,beforeBox,{height:before+'px'}):collapsed;
  var state=play(node,[start,open?expanded:collapsed],{duration:open?240:200,easing:'cubic-bezier(.2,.8,.2,1)'},function(finished){node.style.overflow=overflow;node.inert=oldInert;if(finished)node.hidden=!open});
  if(state)state.open=open;
 }
 function effect(node,frames,duration){if(!visible(node))return;stop(node,false);if(reduced()||!node.animate)return;play(node,frames,{duration:duration,easing:'cubic-bezier(.2,.8,.2,1)'});}
 function page(node){effect(node,[{opacity:.35,transform:'translateY(6px)'},{opacity:1,transform:'translateY(0)'}],160)}
 function reveal(node){effect(node,[{opacity:.3,transform:'translateY(8px) scale(.985)'},{opacity:1,transform:'translateY(0) scale(1)'}],260)}
 function pulse(node){effect(node,[{transform:'scale(1)'},{transform:'scale(1.055)',offset:.4},{transform:'scale(1)'}],320)}
 function progress(node,from,to){if(from===to)return;effect(node,[{width:from},{width:to}],320)}
 function settle(){Array.from(active.keys()).forEach(function(node){stop(node,true)})}
 function changed(){if(reduced())settle()}
 if(media){if(media.addEventListener)media.addEventListener('change',changed);else if(media.addListener)media.addListener(changed)}
 return {disclose:disclose,page:page,reveal:reveal,pulse:pulse,progress:progress,settle:settle,reduced:reduced};
}
return {create:create};
});
