/** Row shapes for the `macrostrat_api.kg_*` PostgREST views that drive the
 * extraction/feedback pages. The views are defined in the `macrostrat` repo
 * (`schema/development/0006-macrostrat_kg_api.sql` and the `macrostrat_api`
 * chunk); column names here are a cross-repo contract with that SQL. */

export interface KGEntityType {
  id: number;
  name: string;
  description?: string | null;
  color: string;
}

export interface KGModel {
  id: number;
  name: string;
  description?: string | null;
  url?: string | null;
  first_run: string | null;
  last_run: string | null;
  n_runs: number;
  n_entities: number;
  n_matches: number;
  n_strat_names: number;
}

/** `kg_source_text`: one paragraph of source text plus run statistics. */
export interface KGSourceText {
  id: number;
  paper_id: string | null;
  paragraph_text: string;
  source_text_type?: string | null;
  map_legend_id?: number | null;
  n_runs: number;
  n_entities: number;
  n_matches: number;
  n_strat_names: number;
  created: string;
  last_update: string;
}

/** `kg_context_entities`: one model run over one source text, with its entity
 * tree. `user_id` is set for human feedback runs and null for model runs. */
export interface KGRun {
  source_text: number;
  paper_id: string | null;
  model_run: number;
  entities: any[];
  paragraph_text: string;
  model_id: number;
  version_id: number | null;
  user_id: string | null;
}

export interface KGCitationAuthor {
  name: string;
}

export interface KGCitationIdentifier {
  id: string;
  type: string;
}

/** The xDD citation blob stored on `macrostrat_kg.publication`. */
export interface KGCitation {
  title?: string;
  author?: KGCitationAuthor[];
  journal?: string;
  year?: string;
  volume?: string;
  number?: string;
  doi?: string;
  identifier?: KGCitationIdentifier[];
}

/** `kg_publication_entities` (without the heavy `entities` column). */
export interface KGPublication {
  paper_id: string;
  citation: KGCitation | null;
  n_matches: number | null;
  models: number[] | null;
}

export interface KGFeedbackType {
  type_id: number;
  type: string;
}

/** `extraction_feedback_combined`: the note and categories attached to a
 * human feedback run. */
export interface KGFeedbackNote {
  feedback_id: number;
  date: string;
  note: string | null;
  types: KGFeedbackType[];
}
