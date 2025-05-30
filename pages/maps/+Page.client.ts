import h from "@macrostrat/hyper";
import { PostgrestPage } from "../PostgrestPage"
import { LinkCard } from "~/components/cards";

export function Page() {
    return h(PostgrestPage, {
        table: "sources",
        order_col: "source_id",
        filter_col: "name",
        pageSize: 20,
        Item,
    });
}

function Item({ data }) {
    const { name, source_id } = data;

    return h(LinkCard, { href: "/lex/strat-names/" + source_id }, name)
}