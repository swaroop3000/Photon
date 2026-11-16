import test from 'node:test';import assert from 'node:assert/strict';
import {bundlePath,crc32,applicationZip,validateAppManifest} from '../src/core/application-bundle.mjs';
test('ZIP CRC follows the independent standard check vector',()=>{
 assert.equal(crc32(new TextEncoder().encode('123456789')),0xcbf43926);
 assert.equal(crc32(new Uint8Array()),0);
});
test('application packaging refuses unsafe paths, duplicate names and incomplete manifests',()=>{
 for(const path of ['../secret','/index.html','a/../b','a\\b','https://x','./x','a//b'])assert.throws(()=>bundlePath(path));
 assert.equal(bundlePath('src/core/dna.mjs'),'src/core/dna.mjs');
 assert.throws(()=>applicationZip([{path:'index.html',bytes:new Uint8Array()},{path:'index.html',bytes:new Uint8Array()}]),/duplicate/);
 assert.throws(()=>validateAppManifest({format:'photon/application-bundle/1',files:[]}),/manifest/);
 assert.throws(()=>validateAppManifest({format:'photon/application-bundle/1',files:[{path:'index.html',bytes:0,sha256:'0'.repeat(64)}]}),/Incomplete/);
});
