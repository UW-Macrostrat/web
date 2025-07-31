import h from "@macrostrat/hyper";

type MacrostratMatchData = {
  /** Data for Macrostrat matches from the matching service */
  strat_name_id?: number;
  lith_id?: number;
  lith_att_id?: number;
};

export function MatchedEntityLink({ data }: { data: MacrostratMatchData }) {
  if (data == null) return null;
  const href = buildHref(data);
  return h([" ", h("a.match", { href }, `#${matchID(data)}`)]);
}

function buildHref(match) {
  /** Build a URL for a matched term
   * TODO: this is specific to Macrostrat's UI
   * */
  if (match == null) return null;

  if (match.strat_name_id != null) {
    return `/lex/strat-name/${match.strat_name_id}`;
  }

  if (match.lith_id != null) {
    return `/lex/lithologies`;
  }

  if (match.lith_att_id != null) {
    return `/lex/lithologies`;
  }

  return null;
}

function matchID(match: MacrostratMatchData) {
  if (match == null) return null;

  for (const id of ["strat_name_id", "lith_id", "lith_att_id"]) {
    if (match[id]) {
      return match[id];
    }
  }
  return null;
}
