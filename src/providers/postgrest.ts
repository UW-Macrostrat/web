import { PostgrestClient } from "@supabase/postgrest-js";
import { postgrestPrefix } from "@macrostrat-web/settings";

const postgrest = new PostgrestClient(postgrestPrefix);

export { postgrest };
