import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseGenbank,serializeGenbank,parseGenbankFeatureLocation,genbankFeatureLocation,validateFeature,circularFeatureSequence} from '../src/core/feature-io.mjs';
import {applyExplicitEdits,applySequenceRevision,createEditorHistory} from '../src/core/photon-adapter.mjs';
import {sequenceWindow} from '../src/core/sequence-window.mjs';
import {featureMapSegments} from '../src/core/feature-map.mjs';
import {analyzeAnnotatedCDS} from '../src/core/translation-analysis.mjs';
import {analyzeConstructQC} from '../src/core/construct-qc.mjs';
import {serializeSbol3NTriples} from '../src/core/sbol3-nt.mjs';
import {serializePhotonSbol} from '../src/core/sbol-io.mjs';
import {editSequence,editSequenceBatch} from '../src/core/dna.mjs';
import {circuitIntoCircularBackbone} from '../src/core/circular-backbone.mjs';
import {createPartLibrary,addLibraryPart,addLibraryAssembly} from '../src/core/part-library.mjs';
import {preflightGenbankCollection} from '../src/core/import-preflight.mjs';
const feature={name:'spliced',type:'CDS',start:2,end:16,strand:1,
 segments:[{start:2,end:4},{start:9,end:11},{start:14,end:16}],qualifiers:{note:['one','two'],evidence:{source:'synthetic'}}};
const w={name:'compound',seq:'AATGCCCCAAACCTAAA',topology:'linear',features:[feature]};
const raw=readFileSync(new URL('./fixtures/genbank/V00499.1.gb',import.meta.url),'utf8');

test('exact local exon joins retain authoritative segments in both orientations and serialize canonically',()=>{
 for(const strand of [1,-1]){
  const loc=(strand===-1?'complement(':'')+'join(2..4,9..11,14..16)'+(strand===-1?')':'');
  const f=parseGenbankFeatureLocation(loc,17);
  assert.deepEqual(f,{start:2,end:16,strand,segments:feature.segments});assert.equal(genbankFeatureLocation(f,17),loc);
  assert.equal(circularFeatureSequence(w.seq,f),strand===1?'ATGAAATAA':'TTATTTCAT');
 }
});
test('bad projections, overlapping/out-of-order, mixed/fuzzy/remote/nested joins and excess parts fail closed',()=>{
 for(const loc of ['join(2..4,4..8)','join(9..11,2..4)','join(2..4,complement(9..11))',
  'join(<2..4,9..11)','join(2..4,AB123:9..11)','join(2..4,join(9..11,14..16))',
  'order(2..4,9..11)','join(2..4)','join(2..4,9..99)'])assert.throws(()=>parseGenbankFeatureLocation(loc,17),/Unsupported/);
 assert.throws(()=>validateFeature({...feature,start:1},17),/envelope/);
 assert.throws(()=>validateFeature({...feature,segments:[]},17),/segments/);
 assert.throws(()=>validateFeature({...feature,segments:feature.segments.map(p=>({...p,strand:-1}))},17),/segments/);
 const tooMany=Array.from({length:1001},(_,i)=>String(i+1));
 assert.throws(()=>parseGenbankFeatureLocation('join('+tooMany.join(',')+')',2000),/segment count/);
});
test('public beta-globin record retains all seven non-source features and its three-exon peptide',()=>{
 const parsed=parseGenbank(raw);assert.equal(parsed.seq.length,2052);assert.equal(parsed.features.length,7);
 const cds=parsed.features.find(f=>f.type==='CDS');
 assert.deepEqual(cds.segments,[{start:154,end:245},{start:376,end:598},{start:1449,end:1577}]);
 const report=analyzeAnnotatedCDS(parsed)[0];assert.equal(report.nucleotideLength,444);
 assert.equal(report.aminoAcidLength,147);assert.equal(report.translationMatches,true);assert.deepEqual(report.flags,[]);
 assert.deepEqual(parseGenbank(serializeGenbank(parsed)),parsed);
 const qc=analyzeConstructQC(parsed);assert.equal(qc.features.find(f=>f.type==='CDS').length,444);
});
test('sequence windows and map geometry display exon intervals without coloring introns',()=>{
 const view=sequenceWindow(w);
 assert.deepEqual(view.annotations.map(p=>[p.start,p.end]),[[1,4],[8,11],[13,16]]);
 const map=featureMapSegments(feature,17,{view:'linear'});assert.equal(map.length,3);
 assert.deepEqual(map.map(p=>[p.start,p.end]),[[2,4],[9,11],[14,16]]);
 assert.ok(map[0].x+map[0].width<map[1].x);
});
test('intronic insertion lifts later exons without affecting peptide or nested metadata',()=>{
 const before=structuredClone(w),result=applyExplicitEdits(w,[{start:6,end:6,insert:'GG'}]);
 assert.deepEqual(result.working.features[0].segments,[{start:2,end:4},{start:11,end:13},{start:16,end:18}]);
 assert.equal(result.working.features[0].affected,undefined);assert.equal(circularFeatureSequence(result.working.seq,result.working.features[0]),'ATGAAATAA');
 result.working.features[0].qualifiers.evidence.source='changed';assert.deepEqual(w,before);
});
test('exonic substitutions flag the full feature and free-text revision uses the same liftover',()=>{
 const proposed=w.seq.slice(0,9)+'G'+w.seq.slice(10);
 const a=applySequenceRevision(w,proposed),b=applyExplicitEdits(w,[{start:9,end:10,insert:'G'}]);
 assert.deepEqual(a.working,b.working);assert.equal(a.working.features[0].affected,true);
 assert.deepEqual(a.working.features[0].segments,feature.segments);
});
test('erased or overlapping exon revisions reject the entire batch and preserve the input',()=>{
 const before=structuredClone(w);
 assert.throws(()=>applyExplicitEdits(w,[{start:1,end:4,insert:''},{start:16,end:17,insert:'C'}]),/erase/);
 assert.throws(()=>applyExplicitEdits(w,[{start:2,end:10,insert:'C'}]),/segments/);
 assert.deepEqual(w,before);
});
test('history snapshots preserve complete segment metadata across undo and redo',()=>{
 const history=createEditorHistory(w),original=structuredClone(w);
 const changed=w.seq.slice(0,6)+'GG'+w.seq.slice(6);
 history.apply(changed);const edited=history.current;
 assert.deepEqual(history.undo(),original);assert.deepEqual(history.redo(),edited);
 edited.features[0].segments[0].start=1;assert.equal(history.current.features[0].segments[0].start,2);
});
test('unsupported coordinate-model consumers refuse compound features instead of flattening them',()=>{
 for(const serialize of [serializeSbol3NTriples,serializePhotonSbol])assert.throws(()=>serialize(w),/Compound/);
 assert.throws(()=>editSequence(w.seq,[feature],{start:1,end:1,insert:'A'}),/compound edit adapter/);
 assert.throws(()=>editSequenceBatch(w.seq,[feature],[{start:1,end:1,insert:'A'}]),/compound edit adapter/);
 const mixed={...w,topology:'circular',features:[feature,{name:'wrap',type:'misc_feature',start:16,end:1}]};
 assert.throws(()=>applyExplicitEdits(mixed,[{start:6,end:6,insert:'G'}]),/mixed compound/);
 assert.equal(applySequenceRevision(mixed,mixed.seq).changed,false);
});
test('circular backbone insertion outside compound envelope shifts every segment; internal boundaries remain refused',()=>{
 let library=addLibraryPart(createPartLibrary(),{id:'part',sequence:'GG'});
 library=addLibraryAssembly(library,{id:'root',placements:[{ref:'part',strand:1}]});
 const circle={...w,topology:'circular'};
 const result=circuitIntoCircularBackbone(library,'root',circle,{boundary:0});
 assert.deepEqual(result.features[0].segments,[{start:4,end:6},{start:11,end:13},{start:16,end:18}]);
 assert.equal(circularFeatureSequence(result.seq,result.features[0],{circular:true}),'ATGAAATAA');
 assert.throws(()=>circuitIntoCircularBackbone(library,'root',circle,{boundary:6}),/split backbone feature/);
});
test('collection budgets count compound annotation parts rather than only envelopes',()=>{
 assert.throws(()=>preflightGenbankCollection([w],{maxFeatureParts:2}),/annotation-part/);
 assert.equal(preflightGenbankCollection([w]).totalFeatureParts,3);
});

test('compound backups, archives and saved backbones declare version 2 while plain metadata remains version 1',async()=>{
 const {projectBackupFormat,parseProjectBackup}=await import('../src/core/project-backup.mjs');
 const {hasCompoundAnnotations}=await import('../src/core/feature-capabilities.mjs');
 const {createBrowserArchive,parseBrowserArchive}=await import('../src/core/project-archive.mjs');
 const {createBackboneLibrary,addBackbone,serializeBackboneLibrary,parseBackboneLibrary,getBackbone}=await import('../src/core/backbone-library.mjs');
 const snap=structuredClone(w);
 const db={cur:'r',tab:'code',repos:{r:{id:'r',name:'fixture',stars:0,created:0,working:{...snap,features:[]},
  branch:'main',branches:{main:{head:'c'}},commits:{c:{id:'c',parents:[],branch:'main',msg:'initial',author:'you',time:0,snap}},
  tags:[],pulls:[],issues:[],wiki:[{title:'Home',body:'fixture'}]}}};
 assert.equal(projectBackupFormat(db),'photon/local-project-backup/2');
 assert.deepEqual(parseProjectBackup(JSON.stringify({format:projectBackupFormat(db),data:db})),db);
 const archive=await createBrowserArchive([{key:'locusPro_v1',raw:JSON.stringify(db)}]);
 assert.equal(archive.format,'photon/browser-storage-archive/2');assert.deepEqual(await parseBrowserArchive(JSON.stringify(archive)),archive);
 const backbone={...snap,topology:'circular'},library=addBackbone(createBackboneLibrary(),'compound',backbone);
 assert.equal(library.format,'photon/backbones/2');
 assert.deepEqual(getBackbone(parseBackboneLibrary(serializeBackboneLibrary(library)),'compound'),backbone);
 db.repos.r.commits.c.snap={...snap,features:[]};db.metadata={segments:['unrelated']};
 assert.equal(projectBackupFormat(db),'photon/local-project-backup/1');
 assert.equal(hasCompoundAnnotations(db),false);
 const withLibrary=await createBrowserArchive([{key:'locusPro_v1',raw:JSON.stringify(db)},
  {key:'photon.backbones.3.1:r:main',raw:serializeBackboneLibrary(library)}]);
 assert.equal(withLibrary.format,'photon/browser-storage-archive/2');
});
