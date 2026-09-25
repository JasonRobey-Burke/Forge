import type { SourceMeta } from '@shared/types/source';
import { CommonArtifactFields } from './ArtifactFields';
export default function ExpectationFields({source}:{source:SourceMeta}) { return <CommonArtifactFields type="expectations" source={source}/>; }
