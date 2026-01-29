import { postgrestPrefix } from "@macrostrat-web/settings";
import type { PageContextServer } from "vike/types";
import type { PostgrestClient } from "@supabase/postgrest-js";
import { useConfig } from "vike-react/useConfig";

const client = new PostgrestClient(postgrestPrefix);

export async function data(pageContext: PageContextServer) {
  const config = useConfig();

  const { id } = pageContext.routeParams;
  const res: any = await client
    .from("sources")
    .select("source_id,slug,name")
    .eq("source_id", id);

  const map = res?.data?.[0];
  const name = map?.name ?? "Unknown map";

  config({
    title: name + "– Legend",
  });

  return map;
}
