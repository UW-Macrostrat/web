import { useState } from "react";
import { useAsyncEffect } from "@macrostrat/ui-components";
import { postgrest } from "~/_providers";

export type MapInfo = {
  source_id: number;
  slug?: string;
};

export function useLegendData(map: MapInfo): any[] | null {
  /** Hook to return legend data from PostgREST */
  const [data, setData] = useState(null);
  useAsyncEffect(async () => {
    const res = await postgrest
      .from("legend")
      .select(
        "legend_id, name, strat_name, age, lith, descrip, comments, liths, b_interval, t_interval, best_age_bottom, best_age_top, unit_ids, concept_ids, color"
      )
      .eq("source_id", map.source_id)
      .order("legend_id", { ascending: true });
    setData(res.data);
  }, [map.source_id]);
  return data;
}
