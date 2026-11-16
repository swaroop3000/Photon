import test from 'node:test';
import assert from 'node:assert/strict';
import {createProjectCommands} from '../src/core/project-commands.mjs';
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
test('save acknowledgements wait for the backend and snapshots do not alias callers',async()=>{
 const ack=deferred(),seen=[],events=[];
 const commands=createProjectCommands({store:{save:async data=>{seen.push(data);await ack.promise;},rollback:()=>({old:true})},
  onBusy:value=>events.push(value),onIdle:error=>events.push(error??'committed')});
 const data={seq:'ACGT'},saved=commands.save(data);data.seq='changed';let complete=false;
 saved.then(()=>{complete=true;});await Promise.resolve();
 assert.equal(complete,false);assert.equal(commands.busy,true);assert.deepEqual(seen,[{seq:'ACGT'}]);
 const idle=commands.whenIdle();ack.resolve();await saved;await idle;
 assert.equal(commands.busy,false);assert.equal(complete,true);assert.equal(events.at(-1),'committed');
});
test('failed writes abandon queued candidates and preserve the last committed checkpoint',async()=>{
 const ack=deferred();let calls=0;const failures=[];
 const commands=createProjectCommands({store:{save:async()=>{calls++;await ack.promise;},rollback:()=>({seq:'original'})},
  onFailure:(error,snapshot,kind)=>failures.push({message:error.message,snapshot,kind})});
 const first=commands.save({seq:'first'}),second=commands.save({seq:'second'}),idle=commands.whenIdle();
 ack.reject(new Error('transaction aborted'));
 await assert.rejects(first,/aborted/);await assert.rejects(second,/aborted/);await assert.rejects(idle,/aborted/);
 assert.equal(calls,1);assert.deepEqual(failures,[{message:'transaction aborted',snapshot:{seq:'original'},kind:'projects'}]);
 assert.equal(commands.busy,false);
});
test('project and library commands share one sequential commit barrier',async()=>{
 const order=[];const commands=createProjectCommands({store:{save:async data=>{order.push(data.seq);},
  saveLibrary:async(key,raw)=>{order.push(key+':'+raw);},rollback:()=>({})}});
 await Promise.all([commands.save({seq:'DNA'}),commands.saveLibrary('parts','library'),commands.save({seq:'DNA2'})]);
 await commands.whenIdle();assert.deepEqual(order,['DNA','parts:library','DNA2']);
});
test('serialization failure reaches rollback without calling the backend',async()=>{
 let calls=0,rolledBack=false;
 const commands=createProjectCommands({store:{save:async()=>{calls++;},rollback:()=>({seq:'safe'})},onFailure:()=>{rolledBack=true;}});
 const cyclic={};cyclic.self=cyclic;
 await assert.rejects(commands.save(cyclic),/circular/i);
 assert.equal(calls,0);assert.equal(rolledBack,true);
});
test('restore cannot be followed by a stale candidate queued during its commit',async()=>{
 const ack=deferred(),saved=[];
 const commands=createProjectCommands({store:{save:async data=>{await ack.promise;saved.push(data);},rollback:()=>saved.at(-1)??{seq:'old'}}});
 const restore=commands.save({seq:'restored'},{restore:true}),stale=commands.save({seq:'stale'});
 ack.resolve();await restore;await assert.rejects(stale,/restore is saving/);
 assert.deepEqual(saved,[{seq:'restored'}]);
});
test('consecutive synchronous legacy saves commit only their final snapshot',async()=>{
 const seen=[];const commands=createProjectCommands({store:{save:async data=>{seen.push(data);},rollback:()=>({})}});
 await Promise.all([commands.save({seq:'same',tab:'code'}),commands.save({seq:'same',tab:'commits'})]);
 assert.deepEqual(seen,[{seq:'same',tab:'commits'}]);
});
