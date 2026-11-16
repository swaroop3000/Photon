/** Conservative compatibility fence for persisted compound annotation models.
 * Includes historic snapshots and saved backbones; does not infer biology.
 */
export function hasCompoundAnnotations(value){
 if(typeof value==='string'){
  if(!/"segments"\s*:/.test(value))return false;
  try{value=JSON.parse(value);}catch{return false;}
 }
 const stack=[value],seen=new WeakSet();
 while(stack.length){
  const item=stack.pop();
  if(!item||typeof item!=='object'||seen.has(item))continue;
  seen.add(item);
  if(Array.isArray(item.features)&&item.features.some(f=>f&&Object.hasOwn(f,'segments')))return true;
  for(const child of Object.values(item))if(child&&typeof child==='object')stack.push(child);
 }
 return false;
}
