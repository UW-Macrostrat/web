import h from "./main.module.scss";
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
    const { name, source_id, scale } = data;

    return h(LinkCard, { href: "/maps/" + source_id, title: 
        h('div.item-title', [
            h('p', name),
            h('div', { className: "size " + scale }, scale)
        ])
    })
}