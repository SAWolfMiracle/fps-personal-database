/* Inventory ledger: optional calendar dates never reorder stock operations. */
(function(root,factory){var api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.FPSInventory=api})(typeof window==='object'?window:this,function(){
'use strict';
var labels={sale:'出售',consume:'消耗',loss:'丢失',transfer_out:'转出',transfer_in:'转入',correction:'校正'};
function validDate(value){return !value||(/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value)}
function normalizeEvents(value){
 if(value==null)return [];if(!Array.isArray(value))throw Error('库存历史格式无效');
 var ids=new Set();return value.map(function(e){if(!e||!e.id||ids.has(String(e.id))||!Object.prototype.hasOwnProperty.call(labels,e.type)||!Number.isSafeInteger(e.seq)||e.seq<1||!Number.isSafeInteger(e.quantity)||e.quantity<(e.type==='correction'?0:1)||e.quantity>1000000000||!validDate(String(e.date||'')))throw Error('库存变动类型、数量、日期或顺序无效');ids.add(String(e.id));return {id:String(e.id||''),seq:e.seq,type:e.type,quantity:e.quantity,date:String(e.date||''),note:String(e.note||''),created_at:String(e.created_at||''),voided:e.voided===true}})
}
function nextSequence(r){var seq=0;(r.acquisitions||[]).concat(r.inventory_events||[]).forEach(function(e){seq=Math.max(seq,Number(e.inventory_seq||e.seq)||0)});if(!Number.isSafeInteger(seq+1))throw Error('库存历史过长');return seq+1}
function trace(r){
 var entries=(r.acquisitions||[]).map(function(a,i){return {kind:'acquisition',event:a,seq:a.inventory_seq||0,index:i}}).concat((r.inventory_events||[]).map(function(e,i){return {kind:'movement',event:e,seq:e.seq,index:i}}));
 entries.sort(function(a,b){return a.seq-b.seq||((a.kind===b.kind)?a.index-b.index:a.kind==='acquisition'?-1:1)});
 var quantity=Number(r.starting_quantity)||0;
 return entries.map(function(entry){var e=entry.event,before=quantity;if(entry.kind==='acquisition')quantity+=Number(e.quantity);else if(!e.voided){if(e.type==='correction')quantity=e.quantity;else quantity+=(e.type==='transfer_in'?1:-1)*e.quantity}return {kind:entry.kind,event:e,before:before,after:quantity,delta:quantity-before}})
}
function quantity(r){var rows=trace(r);return rows.length?rows[rows.length-1].after:Number(r.starting_quantity)||0}
function validate(r){
 var seen=new Set();(r.acquisitions||[]).concat(r.inventory_events||[]).forEach(function(e){var seq=e.inventory_seq||e.seq||0;if(seq){if(!Number.isSafeInteger(seq)||seq<1||seen.has(seq))throw Error('库存变动顺序重复或无效');seen.add(seq)}});
 var rows=trace(r);if(!Number.isSafeInteger(Number(r.starting_quantity)||0)||(Number(r.starting_quantity)||0)<0||rows.some(function(e){return !Number.isSafeInteger(e.after)||e.after<0}))throw Error('此操作会造成负库存或无效数量；请先核对后续变动');return true
}
return {labels:labels,validDate:validDate,normalizeEvents:normalizeEvents,nextSequence:nextSequence,trace:trace,quantity:quantity,validate:validate};
});
