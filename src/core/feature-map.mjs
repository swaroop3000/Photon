/** Photon 2.0 — origin-crossing annotation geometry.
 * Legacy annotation coordinates: 1-based inclusive.
 * One origin-spanning feature (start > end) is rendered as two disjoint
 * segments, but remains one logical feature with a single feature index.
 */
import {splitCircularFeature} from './plasmid-map.mjs';
export function featureMapSegments(feature,length,{view='circular'}={}){
 if(!['circular','linear'].includes(view))throw new RangeError('Unknown map view');
 const intervals=splitCircularFeature(feature,length);
 return intervals.map(({start,end})=>{
   const a=(start-1)/length,b=end/length;
   if(view==='linear')return {start,end,x:40+540*a,width:540*(b-a),startFraction:a,endFraction:b};
   return {start,end,startAngle:360*a,endAngle:360*b,startFraction:a,endFraction:b};
 });
}
export function arcSectorPath({startAngle,endAngle}, {cx=310,cy=225,
  inner=151,outer=166}={}){
 if(!Number.isFinite(startAngle)||!Number.isFinite(endAngle)||
   endAngle<=startAngle||endAngle-startAngle>360)
   throw new RangeError('Invalid feature arc');
 if(![cx,cy,inner,outer].every(Number.isFinite)||inner<=0||outer<=inner)
   throw new RangeError('Invalid arc radius');
 const polar=(r,d)=>{
   const t=(d-90)*Math.PI/180;
   return [cx+r*Math.cos(t),cy+r*Math.sin(t)];
 };
 // Full circle requires two 180-degree arcs rather than a degenerate SVG arc.
 const parts=endAngle-startAngle===360
   ?[{startAngle,endAngle:startAngle+180},{startAngle:startAngle+180,endAngle}]
   : [{startAngle,endAngle}];
 return parts.map(({startAngle:a,endAngle:b})=>{
   const [xo0,yo0]=polar(outer,a),[xo1,yo1]=polar(outer,b),
         [xi1,yi1]=polar(inner,b),[xi0,yi0]=polar(inner,a);
   const large=b-a>180?1:0;
   return 'M'+xo0+' '+yo0+' A'+outer+' '+outer+' 0 '+large+
     ' 1 '+xo1+' '+yo1+' L'+xi1+' '+yi1+
     ' A'+inner+' '+inner+' 0 '+large+' 0 '+xi0+' '+yi0+' Z';
 }).join(' ');
}
