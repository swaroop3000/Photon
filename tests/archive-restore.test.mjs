import test from 'node:test';
import assert from 'node:assert/strict';
import {createBrowserArchive,sha256} from '../src/core/project-archive.mjs';
import {reviewArchiveRestore} from '../src/core/archive-restore.mjs';
function fixture(){
 const snap={name:'fixture',seq:'ACGT',topology:'linear',features:[]};
 return {cur:'r1',tab:'code',repos:{r1:{id:'r1',name:'fixture',stars:0,created:0,working:snap,
  branch:'main',branches:{main:{head:'c1'}},commits:{c1:{id:'c1',parents:[],branch:'main',msg:'initial',author:'you',time:0,snap}},
  tags:[],pulls:[],issues:[],wiki:[{title:'Home',body:'fixture'}]}}};
}
const parts='photon.parts.2.7:r1:main',backbones='photon.backbones.3.1:r1:main';
async function archive(libraries=[]){return JSON.stringify(await createBrowserArchive([{key:'locusPro_v1',raw:JSON.stringify(fixture())},...libraries]));}
test('review preserves exact valid library bytes and enumerates absent-key removals without mutating inputs',async()=>{
 const raw='# retained comment\npart A ACGT\nassembly root A-\n';
 const current={revision:8,libraries:[{key:parts,raw:'old'},{key:backbones,raw:'old'}]},before=structuredClone(current);
 const source=[{key:'locusPro_v1',raw:'retained'}];
 const plan=await reviewArchiveRestore(await archive([{key:parts,raw}]),current,source);
 assert.deepEqual(plan.data,fixture());assert.equal(plan.reviewedRevision,8);
 assert.equal(plan.reviewedLegacyHash,await sha256(JSON.stringify(source)));
 assert.deepEqual(plan.libraries,[{key:parts,raw},{key:backbones,raw:null}]);
 assert.equal(plan.projectCount,1);assert.equal(plan.libraryCount,1);assert.equal(plan.removedLibraryCount,1);
 assert.deepEqual(current,before);
});
test('review rejects malformed, cyclic, missing-reference and future-schema libraries even when archive hashes are valid',async()=>{
 for(const [key,raw] of [[parts,'part A ACGX'],[parts,'assembly A A+'],[parts,'assembly A missing+'],
  [backbones,'{"format":"photon/backbones/99","entries":{}}'],[backbones,'not json']]){
  await assert.rejects(reviewArchiveRestore(await archive([{key,raw}]),{revision:1,libraries:[]},[]));
 }
});
test('review refuses tampered files, unknown formats and unverified active snapshots',async()=>{
 const text=await archive();
 await assert.rejects(reviewArchiveRestore(text,{revision:0,libraries:[]},[]),/Verified/);
 const changed=JSON.parse(text);changed.entries[0].raw+=' ';
 await assert.rejects(reviewArchiveRestore(JSON.stringify(changed),{revision:1,libraries:[]},[]),/checksum/);
 changed.format='photon/browser-storage-archive/99';
 await assert.rejects(reviewArchiveRestore(JSON.stringify(changed),{revision:1,libraries:[]},[]),/format/);
});
