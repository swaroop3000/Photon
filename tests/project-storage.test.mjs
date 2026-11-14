import test from 'node:test';
import assert from 'node:assert/strict';
import {createProjectStorage,ProjectStorageError} from '../src/core/project-storage.mjs';

function fixture(){
 const snap={name:'test',seq:'ACGT',topology:'linear',features:[
  {name:'gene',type:'CDS',start:1,end:4,strand:1,qualifiers:{note:{sources:['synthetic']}}}]};
 return {cur:'r1',tab:'code',repos:{r1:{id:'r1',name:'test',stars:0,created:0,
  branch:'main',branches:{main:{head:'c1'}},working:structuredClone(snap),
  commits:{c1:{id:'c1',parents:[],branch:'main',msg:'initial',author:'you',time:0,snap}},
  tags:[],pulls:[],issues:[],wiki:[{title:'Home',body:'test'}]}}};
}
function backend(raw=null){
 return {raw,writes:0,failRead:false,failWrite:false,
  getItem(){if(this.failRead)throw new Error('storage denied');return this.raw;},
  setItem(key,value){if(this.failWrite)throw new Error('quota exceeded');this.raw=value;this.writes++;}};
}
const open=(driver)=>driver.open({create:fixture});
test('opening existing projects validates without rewriting the original bytes',()=>{
 const data=fixture(),raw=JSON.stringify(data,null,2),storage=backend(raw);
 const driver=createProjectStorage(storage);
 assert.deepEqual(open(driver).data,data);
 assert.equal(storage.raw,raw);assert.equal(storage.writes,0);
 driver.save(data);assert.equal(storage.writes,1);
});
test('fresh profiles seed through exactly one validated atomic write',()=>{
 const storage=backend(),driver=createProjectStorage(storage),result=open(driver);
 assert.equal(result.issue,null);assert.equal(storage.writes,1);
 assert.deepEqual(JSON.parse(storage.raw),result.data);
 assert.throws(()=>open(driver),/already opened/);
});
for(const raw of ['{truncated','null','{}',JSON.stringify({...fixture(),cur:'missing'})]){
 test('invalid startup data is retained byte-for-byte: '+raw.slice(0,20),()=>{
  const storage=backend(raw),driver=createProjectStorage(storage),result=open(driver);
  assert.ok(result.issue instanceof ProjectStorageError);
  assert.equal(driver.status.blocked,true);
  assert.equal(driver.status.recoveryRaw,raw);
  assert.equal(driver.status.recoveryKind,'original');
  assert.throws(()=>driver.save(fixture()),/blocked/);
  assert.equal(storage.writes,0);assert.equal(storage.raw,raw);
  driver.save(fixture(),{restore:true});
  assert.equal(storage.writes,1);assert.equal(driver.status.blocked,false);
 });
}
test('unavailable storage never permits an unverified overwrite',()=>{
 const storage=backend('preserve me');storage.failRead=true;
 const driver=createProjectStorage(storage);assert.ok(open(driver).issue);
 storage.failRead=false;
 assert.throws(()=>driver.save(fixture(),{restore:true}),/Cannot verify/);
 assert.equal(storage.raw,'preserve me');assert.equal(storage.writes,0);
});
test('quota failure preserves saved bytes and returns an isolated rollback snapshot',()=>{
 const storage=backend(),driver=createProjectStorage(storage),{data}=open(driver);
 const before=storage.raw;data.repos.r1.working.seq='AGGT';storage.failWrite=true;
 assert.throws(()=>driver.save(data),/quota exceeded/);
 assert.equal(storage.raw,before);
 assert.equal(driver.status.recoveryKind,'unsaved');
 assert.deepEqual(JSON.parse(driver.status.recoveryRaw),data);
 assert.deepEqual(driver.rollback(),JSON.parse(before));
 const rollback=driver.rollback();rollback.repos.r1.working.features[0].qualifiers.note.sources.push('mutated');
 assert.deepEqual(driver.rollback().repos.r1.working.features[0].qualifiers.note.sources,['synthetic']);
 storage.failWrite=false;driver.save(data);assert.equal(driver.status.issue,null);
 assert.deepEqual(JSON.parse(storage.raw),data);
});
test('an initial write failure leaves an empty profile empty',()=>{
 const storage=backend();storage.failWrite=true;
 const driver=createProjectStorage(storage),result=open(driver);
 assert.ok(result.issue);assert.equal(storage.raw,null);assert.equal(storage.writes,0);
 assert.deepEqual(driver.rollback(),result.data);
});
test('validation and serialization errors cannot corrupt persisted projects',()=>{
 const storage=backend(),driver=createProjectStorage(storage),{data}=open(driver);
 const before=storage.raw;data.repos.r1.branches.main.head='missing';
 assert.throws(()=>driver.save(data),/head missing/);
 assert.equal(storage.raw,before);
 const cyclic=driver.rollback();cyclic.cyclic=cyclic;
 assert.throws(()=>driver.save(cyclic),/circular/i);
 assert.equal(storage.raw,before);
});
test('observed changes from another tab are rejected, including confirmed restore',()=>{
 const storage=backend(),a=createProjectStorage(storage),b=createProjectStorage(storage);
 const old=open(a).data,newer=open(b).data;
 newer.repos.r1.name='newer tab';b.save(newer);const before=storage.raw;
 old.repos.r1.name='stale tab';
 assert.throws(()=>a.save(old),/another tab/);
 assert.throws(()=>a.save(old,{restore:true}),/another tab/);
 assert.equal(storage.raw,before);
 assert.equal(JSON.parse(a.status.recoveryRaw).repos.r1.name,'stale tab');
});
test('legacy migration is in-memory until the next successful save',()=>{
 const data=fixture();delete data.repos.r1.issues;
 const raw=JSON.stringify(data),storage=backend(raw),driver=createProjectStorage(storage);
 const result=driver.open({create:fixture,migrate:db=>{db.repos.r1.issues??=[];}});
 assert.equal(result.issue,null);assert.deepEqual(result.data.repos.r1.issues,[]);
 assert.equal(storage.raw,raw);assert.equal(storage.writes,0);
});
