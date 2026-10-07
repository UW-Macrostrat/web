import hyper from "@macrostrat/hyper";
import styles from "./main.module.sass";
import { LexItemPage, LexItemBodyClient } from "~/components/lex";
import { IntervalTimescales } from "~/components/lex/interval-timescales";
import { useLexItemData } from "~/components/lex/data-loaders.ts";
import { useData } from "vike-react/useData";
import { DataField } from "@macrostrat/data-components";

const h = hyper.styled(styles);

export function Page() {
  const { resData, type, id } = useLexItemData();
  const { windowIntervals } = useData<{ windowIntervals: any[] }>();
  const relatedHref =
    "int_id=" + id + "&color=" + resData?.color + "&name=" + resData?.name;

  return h(LexItemPage, { id, resData, siftLink: "interval" }, [
    h("div.interval-overview", [
      h(IntervalSummary, { resData }),
      h(IntervalTimescales, { resData, windowIntervals }),
    ]),
    h(LexItemBodyClient, {
      type,
      id,
      resData,
      mapUrl: type + "=" + id,
      relatedHref,
      showUnits: true,
      showMaps: true,
      showFossils: true,
    }),
  ]);
}

function IntervalSummary({ resData }) {
  const { b_age, t_age, int_type } = resData ?? {};
  if (b_age == null || t_age == null) return null;
  const type = int_type?.replace(/^\w/, (c) => c.toUpperCase());
  return h("div.interval-summary", [
    h(DataField, { label: "Type", value: type, inline: true }),
    // Formatted as `IntervalField`'s age range is
    h(DataField, {
      label: "Age range",
      value: `${b_age}–${t_age}`,
      unit: "Ma",
      inline: true,
    }),
  ]);
}
