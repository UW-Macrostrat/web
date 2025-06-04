import h from "@macrostrat/hyper"

export function Page() {
    const siftUrls = [
        "Intervals",
        "/definitions/intervals",
        "/interval/57",
        "/interval/10",
        "/interval/5",
        "/interval/213",
        "/interval/843",
        "/interval/402",

        "Strat Names (Individual Pages dont work)",
        "/definitions/strat_names",
        "/strat_name/57",
        "/strat_name/101",
        "/strat_name/5",
        "/strat_name/513",
        "/strat_name/1430",
        "/strat_name/902",

        "Columns",
        "/definitions/columns",
        "/column/57",
        "/column/12",
        "/column/3",
        "/column/51",
        "/column/1410",
        "/column/202",

        "Strat Name Concepts",
        "/definitions/strat_name_concepts",
        "/strat_name_concept/57",
        "/strat_name_concept/101",
        "/strat_name_concept/5",
        "/strat_name_concept/513",
        "/strat_name_concept/1430",
        "/strat_name_concept/902",

        "Groups",
        "/definitions/groups",
        "/group/1",
        "/group/2",
        "/group/3", 
        "/group/4",

        "Lithologies",
        "/definitions/lithologies",
        "/lithology/17",
        "/lithology/101",
        "/lithology/9",
        "/lithology/513",
        "/lithology/140",
        "/lithology/902",

        "Environments",
        "/definitions/environments",
        "/environment/17",
        "/environment/1",
        "/environment/9",
        "/environment/13",

        "Economics",
        "/definitions/economics",
        "/economic/17",
        "/economic/1",
        "/economic/9",
        "/economic/13", 
    ]

    const locUrls = [
        "/",
        "/-3/2/",
        "/1/1/column",
        "/2/3/column#z=10&show=columns,geology",
        "/-107.7083/38.5802#x=-107.8909&y=38.7058&z=8.73km&a=132&e=76&show=satellite,geology",
        "/-112.1976/36.0962#strat_name_concepts=11016&x=-112.236&y=36.2119&z=15.61km&a=165&e=42",

    ]

    return h('div.url-list', 
        { style: { display: "flex", flexDirection: "column", margin: "1em 20%", gap: ".5em" } }, 
        [
            h('h1', "Loc URLs"),
            ...locUrls.map(url => {
                return [
                    h('a', { href: "/map/loc" + url }, "/map/loc" + url),
                ]
            }),

            h('h1', 'Sift URLs'),
            ...siftUrls.map(url => {
                if(url.slice(0, 1) != '/') return h('h3', url)
                return [
                    h('a', { href: "/sift#" + url}, "/sift#" + url),
                    h('a', { href: "/sift/#" + url}, "/sift/#" + url),
                ]
            })
        ]
    );
}