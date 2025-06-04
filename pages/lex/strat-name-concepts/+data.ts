import { fetchAPIData } from "~/_utils/fetch-helpers";

export async function data() {
  const res = await fetchAPIData(`/defs/strat_name_concepts`, {
    page_size: 20,
    last_id: 0,
  });
  return { res };
}
