import h from "./main.module.scss";
import { useAPIResult } from "@macrostrat/ui-components";
import { SETTINGS } from "@macrostrat-web/settings";
import { PageHeader, Link, AssistantLinks, DevLinkButton, PageBreadcrumbs } from "~/components";
import { Card, Icon, Popover, Divider, RangeSlider } from "@blueprintjs/core";
import { ContentPage } from "~/layouts";
import { usePageContext } from 'vike-react/usePageContext';
import { ColumnMap, BlankImage } from "../index";
import { navigate } from "vike/client/router";
import { useState, useCallback } from "react";

export function titleCase(str) {
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function IndividualPage(id, type, header) {
    const intRes = useAPIResult(SETTINGS.apiV2Prefix + "/defs/" + header + "?" + type + "=" + id)?.success.data[0];
    const fossilResult = useAPIResult(SETTINGS.apiV2Prefix + "/fossils?" + type + "=" + id)?.success;
    const colDataResult = useAPIResult(SETTINGS.apiV2Prefix + "/columns?" + type + "=" + id + "&response=long&format=geojson")?.success;
    const fossilRes = fossilResult?.data;
    const colData = colDataResult?.data;
    const cols = colData?.features.map((feature) => feature.properties.col_id).join(',')
    const taxaData = useAPIResult("https://paleobiodb.org/data1.2/occs/prevalence.json?limit=5&coll_id=" + cols)


    // data for charts
    const liths = summarizeAttributes(colData?.features, 'lith')
    const environs = summarizeAttributes(colData?.features, 'environ')
    const econs = summarizeAttributes(colData?.features, 'econ')
    const summary = summarize(colData?.features);

    /*
    const onSelectColumn = useCallback(
        (col_id: number) => {
        // do nothing
        // We could probably find a more elegant way to do this
        setSelectedUnitID(null);
        navigate(`/columns/${col_id}`, {
            overwriteLastHistoryEntry: true,
        });
        },
        [setSelectedUnitID]
    );
    */

    const onSelectColumn = (e) => {
        console.log("selected", e)
    }

    if (!intRes || !fossilRes) return h("div", "Loading...");

    const { name, color, abbrev, b_age, int_id, t_age, timescales, int_type } = intRes;

    const { t_units, t_sections, t_int_name, pbdb_collections, b_int_name, max_thick, col_area } = summary
    const area = parseInt(col_area.toString().split('.')[0]);

    return h(ContentPage, { className: 'int-page'}, [
        h(PageBreadcrumbs, { title: "#" + int_id }),
        h('div.int-header', [
            h('div.int-names', [
                h('div.int-name', { style: { "backgroundColor": color, "color": getContrastTextColor(color)} }, name),
                abbrev ? h('div.int-abbrev', [
                    h('p', " aka "),
                    h('div.int-abbrev-item', { style: { "backgroundColor": color, "color": getContrastTextColor(color)} }, abbrev)
                ]) : null,
            ]),
            h('div.sift-link', [
                h('p', "This page is is in development."),
                h('a', { href: "/sift/interval/" + int_id, target: "_blank" }, "View in Sift")
            ]),
        ]),
        h('div.table', [
            h('div.table-content', [
                h('div.thickness', "≤ " + max_thick.toLocaleString() + 'm thick'),
                h(Divider, { className: 'divider' }),
                h('div.units', t_units.toLocaleString() + ' units'),
                h(Divider, { className: 'divider' }),
                h('div.collections', pbdb_collections.toLocaleString() + ' collections'),
                h(Divider, { className: 'divider' }),
                h('div.interval', b_int_name.toLocaleString() + " - " + t_int_name),
                h(Divider, { className: 'divider' }),
                h('div.packages', t_sections.toLocaleString() + " packages"),
                h(Divider, { className: 'divider' }),

                h('div.area', [
                  h('p', area.toLocaleString() + " km"),
                  h('sup', "2"),
                ]),
                h(Divider, { className: 'divider' }),
                h('div.int-type', "Type: " + UpperCase(int_type)),
                h(Divider, { className: 'divider' }),
                h('div.int-age', b_age + " - " + t_age + " Ma"),
            ]),
            colData ? h(Map, { id: int_id, onSelectColumn, data: colData }) : h('div.loading', "loading"),
        ]),
        h('div.charts', [
            h('div.chart', [
                h('h3', "Lithologies"),
                h('div.legend', liths?.map((lith) => ChartLegend(lith, "lithologies")))
            ]),
            h('div.chart', [
                h('h3', "Economics"),
                h('div.legend', econs?.map((econ) => ChartLegend(econ, "economics")))
            ]),
            h('div.chart', [
                h('h3', "Environments"),
                h('div.legend', environs?.map((environ) => ChartLegend(environ, "environments")))
            ]),
        ]),

        h(PrevalentTaxa, { data: taxaData}),
        timescales[0].name ? h('div.int-timescales', [
            h('h3', "Timescales"),
            h('ul', timescales.map((t) => h('li', h(Link, { href: "/lex/timescales/" + t.timescale_id}, titleCase(t.name))))),
        ]) : null,
        h(References, { res1: fossilResult, res2: colDataResult}),
    ]);
}

function getContrastTextColor(bgColor) {
  // Remove '#' if present
  const color = bgColor.replace('#', '');

  // Parse r, g, b
  const r = parseInt(color.substr(0, 2), 16);
  const g = parseInt(color.substr(2, 2), 16);
  const b = parseInt(color.substr(4, 2), 16);

  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // Return black or white depending on luminance
  return luminance > 0.6 ? '#000000' : '#FFFFFF';
}

function UpperCase(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function References({ res1, res2 }) {
    if (res1 == null || res2 == null) return h("div", "Loading...");

    const refArray1 = Object.values(res1.refs);
    const refArray2 = Object.values(res2.refs);
    const refs = [...refArray1, ...refArray2];

    return h('div.int-references', [
        h('h3', "Primary Sources"),
        h(Divider),
        h('ol.ref-list', refs.map((r) => h('li.ref-item', r))),
    ]);
}

function Map({id, onSelectColumn, data}) {
    return h("div.page-container", [
          h(ColumnMap, {
            className: "column-map",
            inProcess: true,
            projectID: null,
            selectedColumn: null,
            onSelectColumn,
            columns: data.features,
          }),
        ])
}

function PrevalentTaxa({data}) {
    const records = data?.records;

    return h(Card, { className: 'prevalent-taxa-container' }, [
            h('div.taxa-header', [
                h('h3', "Prevalent Taxa"),
                h('div.link', [
                    h('p', 'via'),
                    h('a', { href: "https://paleobiodb.org/#/" }, "PaleoBioDB")
                ]),
            ]),
            records?.map((record) => Taxa(record))
    ])
}

function Taxa(record) {
    const imgUrl = "https://paleobiodb.org/data1.2/taxa/thumb.png?id=";

    return h('div.taxa', [
        h(BlankImage, { src: imgUrl + record.img}),
        h('p.name', record.nam)
    ])
}

function ChartLegend(data, route) {
    return h('div.legend-item', [
        h('div.box', { style: { "background-color": data.color}}), 
        h('a', { href: "/lex/" + route+ "/" + data.id}, data.label)
    ]);
}

export function summarizeAttributes(data, type) {
    var index = {};
    if(!data) return null

    for (var i = 0; i < data.length; i++) {
      for (var j = 0; j < data[i].properties[type].length; j++) {
        // If we have seen this attribute ID before, add to the summary
        if (index[data[i].properties[type][j][type + "_id"]]) {
          index[data[i].properties[type][j][type + "_id"]].prop +=
            data[i].properties[type][j].prop;
        } else {
          index[data[i].properties[type][j][type + "_id"]] =
            data[i].properties[type][j];
        }
      }
    }
    

    var parsed = Object.keys(index).map((d) => {
      index[d].prop = index[d].prop / data.length;
      return index[d];
    });

    return parseAttributes(type, parsed);
  }

export function summarize(data) {
  const summary = {
    col_area: 0,
    max_thick: 0,
    min_min_thick: Infinity,
    b_age: 0,
    t_age: Infinity,
    b_int_name: "",
    t_int_name: "",
    pbdb_collections: 0,
    t_units: 0,
    t_sections: 0,
  };

  if (!Array.isArray(data)) return summary;

  for (const { properties } of data) {
    const {
      col_area,
      max_thick,
      min_min_thick,
      b_age,
      t_age,
      b_int_name,
      t_int_name,
      pbdb_collections,
      t_units,
      t_sections,
    } = properties;

    summary.col_area += col_area;
    summary.pbdb_collections += pbdb_collections;
    summary.t_units += t_units;
    summary.t_sections += t_sections;

    if (max_thick > summary.max_thick) summary.max_thick = max_thick;
    if (min_min_thick < summary.min_min_thick) summary.min_min_thick = min_min_thick;
    if (b_age > summary.b_age) {
      summary.b_age = b_age;
      summary.b_int_name = b_int_name;
    }
    if (t_age < summary.t_age) {
      summary.t_age = t_age;
      summary.t_int_name = t_int_name;
    }
  }

  return summary;
}

const typeLookup = {
  environ: "environment",
  lith: "lithology",
  econ: "economic",
};

var Config = {

  // http://color.hailpixel.com/#366EA6,F9D862,DD98BC,111111,C96566,3D9970,D06CAD,6D3B22,D76433,BD3239,AB6836,
  lithColors: {
    carbonate: "#366EA6",
    siliciclastic: "#F9D862",
    evaporite: "#DD98BC",
    organic: "#111111",
    chemical: "#c96566",
    volcanic: "#3D9970",
    plutonic: "#D06CAD",
    metamorphic: "#6D3B22",
    sedimentary: "#D76433",
    igneous: "#BD3239",
    metasedimentary: "#AB6836",
    "1": "#FFF400",
    "2": "#FFAB00",
    "3": "#FFCA00",
    "4": "#919AA3",
    "5": "#A7ACB0",
    "6": "#B2B5B7",
    "7": "#9CA3AA",
    "8": "#7B8896",
    "9": "#86919D",
    "10": "#FFD500",
    "11": "#FFEA00",
    "12": "#FFDF00",
    "14": "#FFC000",
    "15": "#FFB500",
    "16": "#FF9600",
    "17": "#0000FF",
    "18": "#0508FD",
    "19": "#0B11FC",
    "20": "#111AFB",
    "21": "#1723FA",
    "22": "#1D2BF9",
    "23": "#2334F8",
    "24": "#293DF7",
    "25": "#2F46F6",
    "26": "#344EF5",
    "27": "#3A57F4",
    "28": "#4060F3",
    "29": "#4669F2",
    "30": "#4C71F1",
    "31": "#527AF0",
    "32": "#5883EF",
    "33": "#5E8CEE",
    "34": "#FFB6C1",
    "35": "#F9AFBA",
    "36": "#F3A8B3",
    "37": "#EEA2AD",
    "38": "#000000",
    "39": "#090F0F",
    "40": "#121F1F",
    "43": "#1C2F2F",
    "44": "#253F3F",
    "45": "#CD5C5C",
    "46": "#C96566",
    "47": "#C66F70",
    "48": "#C37879",
    "49": "#FFFF00",
    "52": "#FF4500",
    "53": "#FF4208",
    "54": "#FF3F11",
    "55": "#FF3C19",
    "56": "#FF3922",
    "57": "#FF362B",
    "58": "#FF3333",
    "59": "#FF303C",
    "60": "#FF2D45",
    "61": "#FF2B4D",
    "62": "#FF2856",
    "63": "#006400",
    "64": "#096C09",
    "65": "#127512",
    "66": "#1B7D1B",
    "67": "#248624",
    "68": "#2C8F2C",
    "69": "#369736",
    "70": "#3FA03F",
    "71": "#48A948",
    "72": "#51B151",
    "73": "#59BA59",
    "74": "#63C263",
    "75": "#6CCB6C",
    "76": "#75D475",
    "77": "#7EDC7E",
    "78": "#8B4513",
    "79": "#8E491B",
    "80": "#914E23",
    "81": "#94532B",
    "82": "#985834",
    "83": "#9B5D3C",
    "84": "#9E6244",
    "85": "#A1674C",
    "86": "#A56C55",
    "87": "#A8715D",
    "88": "#AB7665",
    "89": "#AE7B6D",
    "90": "#B28076",
    "91": "#708090",
    "92": "#6495ED",
    "93": "#BEBEBE",
    "94": "#FF255F",
    "95": "#FF0000",
    "96": "#87E587",
    "97": "#FFA000",
    "98": "#B5857E",
    "99": "#FF2267",
    "100": "#FF1F70",
    "101": "#FF1C79",
    "102": "#90EE90",
    "103": "#BF8283",
    "104": "#BC8B8E",
    "105": "#FF1981",
    "106": "#B99598",
    "107": "#FF168A",
    "108": "#FF1493",
    "109": "#B88A86",
    "110": "#BC8F8F",
    "111": "#FF8C00",
    "112": null,
    "113": "#FFDF00",
    "114": "#527AF0",
  },

  // http://color.hailpixel.com/#366EA6,F9D862,33A373,31909B,635A21,BFECF3,B8794C,366EA6,635A21,
  environColors: {
    carbonate: "#366EA6",
    siliciclastic: "#F9D862",
    fluvial: "#33A373",
    lacustrine: "#31909B",
    landscape: "#635A21",
    glacial: "#BFECF3",
    eolian: "#B8794C",
    marine: "#366EA6",
    "non-marine": "#635A21",
    Unknown: "#777777",
    "1": "#B8B8E6",
    "2": "#3399FF",
    "3": "#3399FF",
    "4": "#B8B8E6",
    "5": "#5CADFF",
    "6": "#33CCFF",
    "7": "#33CCFF",
    "8": "#33CCFF",
    "9": "#2EB8E6",
    "10": "#2EB8E6",
    "11": "#297ACC",
    "12": "#297ACC",
    "13": "#246BB2",
    "14": "#246BB2",
    "15": "#246BB2",
    "16": "#1F5C99",
    "17": "#1F5C99",
    "18": "#1F5C99",
    "19": "#1A4C80",
    "20": "#1A4C80",
    "21": "#007A5C",
    "22": "#007A5C",
    "23": "#007A5C",
    "24": "#007A5C",
    "25": "#33D6AD",
    "26": "#99EBD6",
    "27": "#80E6CC",
    "28": "#B2F0E0",
    "29": "#19D1A3",
    "30": "#19D1A3",
    "31": "#00B88A",
    "32": "#00CC99",
    "33": "#00CC99",
    "34": "#00523D",
    "35": "#00291F",
    "36": "#00291F",
    "37": "#00664C",
    "38": "#CCFFFF",
    "39": "#00B88A",
    "41": "#FFD6AD",
    "42": "#FFD6AD",
    "43": "#FFCC99",
    "44": "#FFEAD6",
    "45": "#669900",
    "46": "#75A319",
    "47": "#669900",
    "48": "#5C8A00",
    "49": "#5C8A00",
    "52": "#A3C266",
    "55": "#94B84D",
    "56": "#94B84D",
    "57": "#669900",
    "58": "#75A319",
    "59": "#75A319",
    "61": "#00B88A",
    "62": "#D6D6FF",
    "63": "#DBDBFF",
    "64": "#DBDBFF",
    "65": "#DBDBFF",
    "66": "#DBDBFF",
    "67": "#DBDBFF",
    "68": "#8AE68A",
    "69": "#8AE68A",
    "70": "#8AE68A",
    "71": "#8AE68A",
    "72": "#EBFFEB",
    "73": "#ADFFAD",
    "74": "#6BB26B",
    "75": "#7ACC7A",
    "76": "#A3FFA3",
    "77": "#ADFFAD",
    "78": "#E0FFE0",
    "79": "#D6D6C2",
    "80": "#D6D6C2",
    "81": "#3D3D29",
    "82": "#999966",
    "83": "#B8B894",
    "84": "#6B6B47",
    "85": "#F5F5F0",
    "86": "#6B6B47",
    "87": "#D6D6C2",
    "88": "#CCFFCC",
    "89": "#74CDCD",
    "90": "#B8B894",
    "91": "#00664C",
    "92": "#CCF5EB",
    "93": "#D6F5FF",
  },

  // http://color.hailpixel.com/#4B89C3,000000,B4903C,543A1C,5A7728,
  econColors: {
    mineral: "#5A7728",
    hydrocarbon: "#543A1C",
    construction: "#777777",
    nuclear: "#B4903C",
    coal: "#000000",
    aquifer: "#4B89C3",
    "1": "#33334C",
    "2": "#A3A3C2",
    "3": "#666699",
    "4": "#33334C",
    "5": "#A3A3C2",
    "6": "#666699",
    "7": "#666699",
    "8": "#A3A3C2",
    "9": "#33334C",
    "10": "#7A007A",
    "11": "#000066",
    "12": "#333300",
    "13": "#000000",
    "14": "#E6E600",
    "15": "#999966",
    "16": "#E6E600",
    "17": "#3385FF",
    "18": "#99C2FF",
    "19": "#85ADAD",
    "20": "#5C8A8A",
    "21": "#3385FF",
    "22": "#990033",
    "23": "#FFFF99",
  },
};

function parseAttributes(type, data) {
    var parsed = [];

    if (data.length > 5) {
      var types = {};
      data.forEach((d) => {
        if (types[d.type]) {
          types[d.type].value += d.prop;
        } else {
          types[d.type || d.class] = {
            id: d[type + "_id"],
            type: typeLookup[type],
            value: d.prop,
            label:
              type === "environ"
                ? d.class + ": " + (d.type || d.class)
                : d.type || d.class,
            color: Config[type + "Colors"][d.type || d.class],
          };
        }
      });

      Object.keys(types).forEach((d) => {
        parsed.push(types[d]);
      });
    } else {
      data.forEach((d) => {
        parsed.push({
          id: d[type + "_id"],
          type: typeLookup[type],
          value: d.prop || 1 / data.length,
          label: type === "environ" ? d.class + ": " + d.name : d.name,
          color: Config[type + "Colors"][d[type + "_id"]],
        });
      });
    }

    return parsed;
  }