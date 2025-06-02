import h from "@macrostrat/hyper";
import { PostgrestPage } from "../../PostgrestPage"
import { LinkCard } from "~/components/cards";

export function Page() {
    return h(PostgrestPage, {
        table: "strat_name_concepts",
        order_col: "concept_id",
        filter_col: "name",
        pageSize: 20,
        ItemList,
    });
}

function ItemList({ data }) {
    console.log("ItemList data", data);
    return h("div", { className: "item-list" }, data.map(item => h(Item, { key: item.id, data: item })));
}

function Item({ data }) {
    const { name, concept_id } = data;    
    return h(LinkCard, { href: "/lex/strat-name-concepts/" + concept_id }, name)
}