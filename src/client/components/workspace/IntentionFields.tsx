import type { SourceMeta } from '@shared/types/source';
import { CommonArtifactFields } from './ArtifactFields';
export default function IntentionFields({source}:{source:SourceMeta}) { return <><CommonArtifactFields type="intentions" source={source}/><p className="text-xs text-stone-600">Dependencies must refer to this product's intentions. Self links, duplicates and cycles cannot be added. Existing links remain available for inspection.</p></>; }
