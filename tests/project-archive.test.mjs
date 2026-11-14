import test from 'node:test';
import assert from 'node:assert/strict';
import {captureProjectStorage,createBrowserArchive,parseBrowserArchive,sha256} from '../src/core/project-archive.mjs';
function source(){
 const snap={name:'fixture',seq:'ACGT',topology:'linear',features:[]};
 const db={cur:'r1',tab:'code',repos:{r1:{id:'r1',name:'fixture',stars:0,created:0,working:snap,
  branch:'main',branches:{main:{head:'c1'}},commits:{c1:{id:'c1',parents:[],branch:'main',msg:'initial',author:'you',time:0,snap}},
  tags:[],pulls:[],issues:[],wiki:[{title:'Home',body:'fixture'}]}}};
 return new Map([['locusPro_v1',JSON.stringify(db,null,2)],['photon.parts.2.7:r1:main:c1','part A ACGT\n'],
  ['photon.backbones.3.1:r1:main:c1','{"format":"photon/backbones/1","entries":{}}'],['other-app','secret'],['photonTheme','dark']]);
}
const storage=map=>({get length(){return map.size;},key:i=>[...map.keys()][i]??null,getItem:key=>map.get(key)??null});
test('archive captures exact project/library source bytes and leaves other keys out',async()=>{
 const map=source(),before=[...map],entries=captureProjectStorage(storage(map));
 assert.equal(entries.length,3);
 const archive=await createBrowserArchive(entries,{createdAt:'2026-11-14T17:00:00Z'});
 assert.deepEqual(await parseBrowserArchive(JSON.stringify(archive)),archive);
 for(const entry of archive.entries)assert.equal(entry.raw,map.get(entry.key));
 assert.deepEqual([...map],before);
 assert.equal(archive.sha256,(await createBrowserArchive([...entries].reverse())).sha256);
});
test('archive tampering, invalid projects and extra namespaces fail closed',async()=>{
 const entries=captureProjectStorage(storage(source())),archive=await createBrowserArchive(entries);
 const changed=structuredClone(archive);changed.entries.at(-1).raw+='changed';
 await assert.rejects(parseBrowserArchive(JSON.stringify(changed)),/checksum/);
 await assert.rejects(createBrowserArchive([...entries,{key:'other-app',raw:'do not copy'}]),/Invalid/);
 await assert.rejects(createBrowserArchive([...entries,entries[0]]),/duplicate/);
 await assert.rejects(createBrowserArchive(entries.filter(e=>e.key!=='locusPro_v1')),/requires saved/);
 const malformed=entries.map(e=>e.key==='locusPro_v1'?{...e,raw:'{}'}:e);
 await assert.rejects(createBrowserArchive(malformed));
 const noDate={...archive};delete noDate.createdAt;
 await assert.rejects(parseBrowserArchive(JSON.stringify(noDate)),/format/);
 await assert.rejects(parseBrowserArchive('{"format":"future"}'),/format/);
});
test('unreadable/mid-capture disappearing data never produces a successful archive',()=>{
 const map=source();map.delete('locusPro_v1');assert.throws(()=>captureProjectStorage(storage(map)),/requires saved/);
 assert.throws(()=>captureProjectStorage({length:1,key:()=> 'locusPro_v1',getItem:()=>null}),/changed/);
 assert.throws(()=>captureProjectStorage({get length(){throw new Error('denied');}}),/denied/);
});
test('SHA-256 agrees with the published empty-string reference vector',async()=>{
 assert.equal(await sha256(''),'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
});
