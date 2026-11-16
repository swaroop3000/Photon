import fs from 'node:fs';
import assert from 'node:assert/strict';
import {parsePrimer3Result} from '../src/core/primer3-exchange.mjs';
const request=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const result=parsePrimer3Result(fs.readFileSync(process.argv[3],'utf8'),
 {seq:request.sequence,topology:'linear',features:[]});
assert.ok(result.pairs.length>=1,'Actual Primer3 must produce at least one primer pair');
assert.ok(result.pairs.every(p=>p.productSize>=request.options.minProduct&&
 p.productSize<=request.options.maxProduct));
console.log('Real Primer3 pairs cross-validated in Photon:',result.pairs.length);
