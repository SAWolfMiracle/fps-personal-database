const test = require("node:test");
const assert = require("node:assert/strict");
const model = require("../collection-model.js");

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
