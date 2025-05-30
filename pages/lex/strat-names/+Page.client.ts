import h from "@macrostrat/hyper";
import { PostgrestPage } from "../../PostgrestPage"
import { LinkCard } from "~/components/cards";

export function Page() {
    return h(PostgrestPage, {
        table: "strat_names",
        order_col: "id",
        filter_col: "strat_name",
        pageSize: 20,
        Item,
    });
}

function Item({ data }) {
    const { strat_name, id } = data;

    return h(LinkCard, { href: "/lex/strat-names/" + id }, strat_name)
}