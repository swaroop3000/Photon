import test from 'node:test';
import assert from 'node:assert/strict';
import {parseProjectBackup, PROJECT_BACKUP_FORMAT} from '../src/core/project-backup.mjs';

function fixture() {
  const snap = {name:'plasmid', seq:'ACGTACGT', topology:'circular', features:[
    {name:'wrapped', type:'CDS', start:7, end:2, strand:-1,
      qualifiers:{note:'original', provenance:{source:['reference']}}}
  ]};
  return {format:PROJECT_BACKUP_FORMAT, data:{cur:'r1', tab:'code', repos:{r1:{
    id:'r1', name:'project', created:0, stars:0, branch:'main',
    working:structuredClone(snap), branches:{main:{head:'c2'}},
    commits:{c1:{id:'c1', parents:[], branch:'main', msg:'initial', author:'you', time:0, snap},
      c2:{id:'c2', parents:['c1'], branch:'main', msg:'update', author:'you', time:1,
        snap:structuredClone(snap)}}, tags:[], pulls:[], issues:[], wiki:[{title:'Home', body:'# project'}]
  }}}};
}
test('backup preserves wrapped features, nested metadata, empty projects and disconnected commits', () => {
  const payload = fixture();
  assert.deepEqual(parseProjectBackup(JSON.stringify(payload)), payload.data);
  payload.data.repos.r1.working = {name:'empty', seq:'', topology:'linear', features:[]};
  assert.deepEqual(parseProjectBackup(JSON.stringify(payload)), payload.data);
});
const cases = {
  'missing branch head': r => {r.branches.main.head = 'missing';},
  'missing active branch': r => {r.branch = 'missing';},
  'missing parent': r => {r.commits.c2.parents = ['missing'];},
  'commit cycle': r => {r.commits.c1.parents = ['c2'];},
  'commit id mismatch': r => {r.commits.c1.id = 'other';},
  'invalid historic sequence': r => {r.commits.c1.snap.seq = 'AC?T';},
  'out of bounds annotation': r => {r.working.features[0].end = 9;},
  'linear wrapped annotation': r => {r.working.topology = 'linear';},
  'non-string label': r => {r.working.features[0].name = {};},
  'empty wiki': r => {r.wiki = [];},
  'missing tag commit': r => {r.tags = [{name:'v1', note:'', time:0, commitId:'missing'}];},
  'invalid review list': r => {r.pulls = [{id:'p1', title:'PR', desc:'', from:'main', to:'main',
    status:'open', created:0, reviews:{}}];},
  'invalid issue label': r => {r.issues = [{id:'i1', title:'issue', status:'open', created:0,
    labels:[{}], comments:[]}];},
  'unsafe branch name': r => {r.branches['bad"branch'] = {head:'c1'};}
};
for (const [name, mutate] of Object.entries(cases)) test('rejects ' + name, () => {
  const payload = fixture(); mutate(payload.data.repos.r1);
  assert.throws(() => parseProjectBackup(JSON.stringify(payload)), RangeError);
});
test('rejects prototype keys, deep metadata, malformed UI state and oversize input', () => {
  const text = JSON.stringify(fixture());
  assert.throws(() => parseProjectBackup(text.replace('"note":"original"', '"__proto__":{}')));
  const payload = fixture();
  payload.data._wiki = -1;
  assert.throws(() => parseProjectBackup(JSON.stringify(payload)));
  delete payload.data._wiki;
  let metadata = {};
  for (let i=0; i<65; i++) metadata = {nested:metadata};
  payload.data.repos.r1.working.features[0].qualifiers = metadata;
  assert.throws(() => parseProjectBackup(JSON.stringify(payload)), /nesting/);
  assert.throws(() => parseProjectBackup(' '.repeat(20_000_001)), /20 MB/);
});
test('validates long histories without recursive traversal and accepts merge DAGs', () => {
  const payload = fixture(), r = payload.data.repos.r1;
  for (let i=3; i<=12000; i++) r.commits['c'+i] = {...r.commits.c2, id:'c'+i, parents:['c'+(i-1)]};
  r.branches.main.head = 'c12000';
  r.commits.c12000.parents.push('c1');
  assert.equal(Object.keys(parseProjectBackup(JSON.stringify(payload)).repos.r1.commits).length, 12000);
});
