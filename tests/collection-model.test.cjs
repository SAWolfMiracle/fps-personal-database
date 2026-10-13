const test = require("node:test");
const assert = require("node:assert/strict");
const {readFileSync}=require("node:fs");
const path=require("node:path");
const model = require("../collection-model.js");
const catalog = require("../collection-catalog.json");

function assertGLBURL(urlValue){
  const url=new URL(urlValue);
  assert.equal(url.origin,"https://sawolfmiracle.github.io");
  const relative=decodeURIComponent(url.pathname).replace(/^\/fps-personal-database\//,"");
  const bytes=readFileSync(path.join(__dirname,"..",relative));
  assert.equal(bytes.toString("ascii",0,4),"glTF");
  assert.equal(bytes.readUInt32LE(8),bytes.length);
  const jsonLength=bytes.readUInt32LE(12);
  assert.equal(bytes.toString("ascii",16,20),"JSON");
  const document=JSON.parse(bytes.toString("utf8",20,20+jsonLength));
  const binaryHeader=20+jsonLength;
  assert.equal(bytes.toString("ascii",binaryHeader+4,binaryHeader+8),"BIN\0");
  assert.equal(binaryHeader+8+bytes.readUInt32LE(binaryHeader),bytes.length);
  assert.ok(document.buffers[0].byteLength<=bytes.readUInt32LE(binaryHeader));
  assert.ok(document.accessors[document.meshes[0].primitives[0].attributes.POSITION].count>0);
}

test("accepts HTTPS links to GLB and GLTF files", () => {
  assert.equal(model.normalizeURL("https://models.example/item.glb"), "https://models.example/item.glb");
  assert.equal(model.normalizeURL("https://models.example/path/item.gltf?token=x"), "https://models.example/path/item.gltf?token=x");
});

test("rejects non-HTTPS, non-model, and non-direct links", () => {
  for (const value of [
    "http://models.example/item.glb",
    "javascript:alert(1)",
    "https://models.example/item.png",
    "https://models.example/item.glb/page",
    "/models/item.glb",
    "data:model/gltf-binary;base64,AAAA"
  ]) assert.equal(model.normalizeURL(value), "");
});

test("local uploads must be a non-empty GLB no larger than 100 MB", () => {
  assert.deepEqual(model.validateFile({name:"item.glb",size:1}), {ok:true,message:""});
  assert.equal(model.validateFile({name:"item.gltf",size:1}).ok, false);
  assert.equal(model.validateFile({name:"item.glb",size:0}).ok, false);
  assert.equal(model.validateFile({name:"item.glb",size:model.maxUploadBytes}).ok, true);
  assert.equal(model.validateFile({name:"item.glb",size:model.maxUploadBytes+1}).ok, false);
});

test("model files are keyed by workspace and item", () => {
  assert.equal(model.storageKey("guest","item-1"), "guest::item-1");
  assert.notEqual(model.storageKey("guest","item-1"), model.storageKey("user-1","item-1"));
});

test("catalog model URLs resolve by stable item ID and reject unsafe or unknown entries", () => {
  const input = {items:[
    {item_id:"orzice:p1",model_url:"https://example.com/first.glb"},
    {item_id:"orzice:p2",model_url:"javascript:alert(1)"}
  ]};
  assert.equal(model.catalogModelURL(input,"orzice:p1"),"https://example.com/first.glb");
  assert.equal(model.catalogModelURL(input,"orzice:p2"),"");
  assert.equal(model.catalogModelURL(input,"missing"),"");
});

test("first-person variants are selectable without changing the default model", () => {
  const input = {items:[{item_id:"orzice:p1",model_url:"https://example.com/main.glb",model_variants:[
    {id:"first-person",label:"第一人称模型",url:"https://example.com/first-person.glb"},
    {id:"unsafe",label:"无效链接",url:"javascript:alert(1)"}
  ]}]};
  assert.deepEqual(model.catalogModelVariants(input,"orzice:p1"),[
    {id:"first-person",label:"第一人称模型",url:"https://example.com/first-person.glb"}
  ]);
  assert.equal(model.catalogModelURL(input,"orzice:p1"),"https://example.com/main.glb");
  assert.equal(model.catalogModelURL(input,"orzice:p1","first-person"),"https://example.com/first-person.glb");
  assert.equal(model.catalogModelURL(input,"orzice:p1","unsafe"),"");
});

test("red-quality mesh export is mapped to all 48 catalog entries with two view variants", () => {
  const modeled = catalog.items.filter(item => item.model_url);
  assert.equal(modeled.length,48);
  assert.ok(modeled.every(item => item.grade === 6));
  for(const item of modeled){
    const url=model.catalogModelURL(catalog,item.item_id);
    assert.ok(url.endsWith(".glb"));
    assertGLBURL(url);
  }
  const variants = catalog.items.flatMap(item => model.catalogModelVariants(catalog,item.item_id));
  assert.equal(variants.length,2);
  for(const variant of variants){assert.equal(variant.id,"first-person");assertGLBURL(variant.url)}
});

