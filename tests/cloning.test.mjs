import test from 'node:test';
import assert from 'node:assert/strict';
import {cutEnds,compatibleEnds,digestFragments,ligateFragments,rejoinSingleCut} from '../src/core/cloning.mjs';
import {restrictionSites} from '../src/core/restriction.mjs';

test('EcoRI sticky ends are complementary on opposite sides of the cut',()=>{
 const seq='TTGAATTCAA',[site]=restrictionSites(seq,['EcoRI']);
 const ends=cutEnds(seq,site);
 assert.equal(ends.rightEnd.kind,'5-prime');
 assert.equal(ends.rightEnd.overhang,'AATT');
 assert.equal(ends.leftEnd.overhang,'AATT');
 assert.equal(ends.rightEnd.protruding,'bottom');
 assert.equal(ends.leftEnd.protruding,'top');
 assert.equal(compatibleEnds(ends.rightEnd,ends.leftEnd),true);
});
test('PstI 3-prime ends and EcoRV blunt ends have distinct chemistries',()=>{
 const pst=cutEnds('CTGCAG',restrictionSites('CTGCAG',['PstI'])[0]);
 assert.deepEqual([pst.rightEnd.kind,pst.rightEnd.overhang],['3-prime','TGCA']);
 const rv=cutEnds('GATATC',restrictionSites('GATATC',['EcoRV'])[0]);
 assert.equal(rv.rightEnd.kind,'blunt');
 assert.equal(rv.rightEnd.overhang,'');
 assert.equal(compatibleEnds(pst.rightEnd,rv.leftEnd),false);
 assert.equal(compatibleEnds(rv.rightEnd,rv.leftEnd),true);
});
test('two linear restriction fragments reconstitute source on ligation',()=>{
 const seq='TTGAATTCAA';
 const frags=digestFragments(seq,['EcoRI']);
 assert.equal(frags.length,2);
 assert.deepEqual(frags.map(f=>f.length),[3,7]);
 assert.equal(ligateFragments(...frags).sequence,seq);
 assert.equal(rejoinSingleCut(seq,'EcoRI').sequence,seq);
});
test('circular one-site digest linearizes without losing bases',()=>{
 const seq='GAATTCGG';
 const frags=digestFragments(seq,['EcoRI'],{circular:true});
 assert.equal(frags.length,1);
 assert.equal(frags[0].circular,false);
 assert.equal(frags[0].sequence.length,seq.length);
 assert.equal(frags[0].sequence,'AATTCGGG');
});
test('unbroken circular substrate remains circular',()=>{
 const frags=digestFragments('AAAAAA',['EcoRI'],{circular:true});
 assert.equal(frags.length,1);assert.equal(frags[0].circular,true);
});
test('incompatible ends rejected without silent joining',()=>{
 const a=digestFragments('GAATTCTT',['EcoRI']);
 const b=digestFragments('GATATCTT',['EcoRV']);
 assert.throws(()=>ligateFragments(a[0],b[1]),/Incompatible/);
 assert.equal(compatibleEnds({kind:'5-prime',overhang:'AATT',protruding:'top'},
   {kind:'5-prime',overhang:'AATT',protruding:'top'}),false);
});
test('ligation cannot circularize when the outside termini are uncut natural ends',()=>{
 const frags=digestFragments('TTGAATTCAA',['EcoRI']);
 assert.throws(()=>ligateFragments(...frags,{circularize:true}),/Outer ends/);
});
test('cutting across circular origin uses the correct wrapped overhang',()=>{
 const seq='AATTCG';const s=restrictionSites(seq,['EcoRI'],{circular:true})[0];
 assert.equal(s.wrapsOrigin,true);
 const ends=cutEnds(seq,s,{circular:true});
 assert.equal(ends.rightEnd.overhang,'AATT');
 const frags=digestFragments(seq,['EcoRI'],{circular:true});
 assert.equal(frags.length,1);assert.equal(frags[0].length,6);
 assert.equal(frags[0].circular,false);
 assert.equal(frags[0].sequence,'AATTCG');
});
