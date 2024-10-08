import { Entity, EntityExt } from "../../../extractions/lib/types";

export { Entity };

export interface InternalEntity extends EntityExt {
  term_type: string;
  txt_range: number[][];
  children: InternalEntity[];
}

export interface TextData {
  preprocessor_id: string;
  extraction_pipeline_id: string;
  model_id: string;
  paper_id: string;
  hashed_text: string;
  weaviate_id: string;
  paragraph_text: string;
}

export interface Result {
  text: TextData;
  entities?: InternalEntity[];
}

export interface TreeData {
  id: number;
  name: string;
  children: TreeData[];
}

export interface ServerRelationship {
  src_name: string;
  dst_name: string;
  relationship_type: string;
}

export interface ServerEntity {
  entity_name: string;
  entity_type: string;
}

export interface ServerResponse {
  text: TextData;
  relationships: ServerRelationship[];
  just_entities: ServerEntity[];
}

export interface RunText {
  preprocessor_id: string;
  paper_id: string;
  hashed_text: string;
  weaviate_id: string;
  paragraph_text: string;
}

export interface RunRelationship {
  src: string;
  dst: string;
  relationship_type: string;
}

export interface RunEntity {
  entity: string;
  entity_type: string;
}

export interface RunSource {
  text: RunText;
  relationships: RunRelationship[];
  just_entities: RunEntity[];
}

export interface RunRecord {
  run_id: string;
  extraction_pipeline_id: string;
  user_name: string;
  model_id: string;
  results: RunSource[];
}
