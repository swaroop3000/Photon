/** Photon 1.3 map geometry: pure functions with no DOM dependencies.
 * Legacy Photon feature coordinates are 1-based inclusive.
 * Restriction cut positions are zero-based interbase coordinates.
 */
import { restrictionSites, TYPE_II_ENZYMES } from './restriction.mjs';
import { normalizeDNA } from './dna.mjs';

export function splitCircularFeature(feature,length) {
  if (!Number.isSafeInteger(length)||length<1) throw new RangeError('Length must be positive');
  if (!feature||!Number.isSafeInteger(feature.start)||!Number.isSafeInteger(feature.end)||
      feature.start<1||feature.start>length||feature.end<1||feature.end>length)
    throw new RangeError('Feature coordinates must be 1-based and inside the plasmid');
  const {start,end}=feature;
  return start<=end ? [{start,end}] : [{start,end:length},{start:1,end}];
}
/** SVG geometry based on the legacy Photon's fixed viewBoxes.
 * No browser state or unit conversion is used in the engine.
 */
export function mapRestrictionMarkers(sequence,enzymeNames=['EcoRI'],{circular=false,view='circular'}={}) {
  if(!['circular','linear'].includes(view))throw new RangeError('Invalid map view');
  const seq=normalizeDNA(sequence,{allowAmbiguous:false}),length=seq.length;
  if(!length)return [];
  const sites=restrictionSites(seq,enzymeNames,{circular,enzymes:TYPE_II_ENZYMES});
  return sites.map(s=>{
    const fraction=s.topCut/length;
    if(view==='linear'){
      const x=40+540*fraction;
      return {...s,x,y1:160,y2:213,labelX:x,labelY:145};
    }
    const angle=2*Math.PI*fraction-Math.PI/2;
    const radius=145;
    return {...s,
      x1:310+radius*Math.cos(angle),y1:225+radius*Math.sin(angle),
      x2:310+(radius+38)*Math.cos(angle),y2:225+(radius+38)*Math.sin(angle),
      labelX:310+(radius+51)*Math.cos(angle),
      labelY:225+(radius+51)*Math.sin(angle)
    };
  });
}
