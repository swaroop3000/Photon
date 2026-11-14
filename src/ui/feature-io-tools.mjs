/** Photon 2.1 GenBank codec, restricted supported round-trip subset.
 * Imported arbitrary GenBank continues through the legacy parser.
 */
import {serializeGenbank,parseGenbank,circularFeatureSequence} from '../core/feature-io.mjs';
import {serializePhotonSbol,parsePhotonSbol} from '../core/sbol-io.mjs';
globalThis.PhotonFeatureIO={
 serialize:serializeGenbank,
 parse:parseGenbank,
 featureSequence:circularFeatureSequence,
 serializeSbol:serializePhotonSbol,
 parseSbol:parsePhotonSbol
};
