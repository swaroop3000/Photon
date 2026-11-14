/** Photon 2.1 GenBank codec, restricted supported round-trip subset.
 * Imported arbitrary GenBank continues through the legacy parser.
 */
import {serializeGenbank,parseGenbank,circularFeatureSequence} from '../core/feature-io.mjs';
import {parseGenbankCollection,serializeGenbankCollection} from '../core/genbank-collection.mjs';
import {serializePhotonSbol,parsePhotonSbol} from '../core/sbol-io.mjs';
globalThis.PhotonFeatureIO={
 serialize:serializeGenbank,
 parse:parseGenbank,
 parseCollection:parseGenbankCollection,
 serializeCollection:serializeGenbankCollection,
 featureSequence:circularFeatureSequence,
 serializeSbol:serializePhotonSbol,
 parseSbol:parsePhotonSbol
};
