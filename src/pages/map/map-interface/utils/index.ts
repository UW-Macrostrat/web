export const addCommas = (x) => {
  x = parseInt(x);
  var parts = x.toString().split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
};

export const sum = (data, prop) => {
  if (!data || !data.length) {
    return [];
  }
  return data
    .map((d) => {
      return d[prop];
    })
    .reduce((a, b) => {
      return a + b;
    }, 0);
};

export const hexToRgb = (hex, opacity) => {
  if (!hex) {
    return "rgba(0,0,0,0.3)";
  }
  hex = hex.replace("#", "");
  let bigint = parseInt(hex, 16);
  let r = (bigint >> 16) & 255;
  let g = (bigint >> 8) & 255;
  let b = bigint & 255;
  return `rgba(${r},${g},${b},${opacity || 0.8})`;
};

export type TimescaleDivision = {
  name: string;
  abbrev: string;
  t_age: number;
  b_age: number;
  color: string;
};

export const timescale: TimescaleDivision[] = [
  { name: "Quaternary", abbrev: "Q", t_age: 0, b_age: 2.588, color: "#F9F97F" },
  {
    name: "Neogene",
    abbrev: "Ng",
    t_age: 2.588,
    b_age: 23.03,
    color: "#FFE619",
  },
  {
    name: "Paleogene",
    abbrev: "Pg",
    t_age: 23.03,
    b_age: 66,
    color: "#FD9A52",
  },
  { name: "Cretaceous", abbrev: "K", t_age: 66, b_age: 145, color: "#7FC64E" },
  { name: "Jurassic", abbrev: "J", t_age: 145, b_age: 201.3, color: "#34B2C9" },
  {
    name: "Triassic",
    abbrev: "Tr",
    t_age: 201.3,
    b_age: 252.17,
    color: "#812B92",
  },
  {
    name: "Permian",
    abbrev: "P",
    t_age: 252.17,
    b_age: 298.9,
    color: "#F04028",
  },
  {
    name: "Carboniferous",
    abbrev: "C",
    t_age: 298.9,
    b_age: 358.9,
    color: "#67A599",
  },
  {
    name: "Devonian",
    abbrev: "D",
    t_age: 358.9,
    b_age: 419.2,
    color: "#CB8C37",
  },
  {
    name: "Silurian",
    abbrev: "S",
    t_age: 419.2,
    b_age: 443.8,
    color: "#B3E1B6",
  },
  {
    name: "Ordovician",
    abbrev: "O",
    t_age: 443.8,
    b_age: 485.4,
    color: "#009270",
  },
  {
    name: "Cambrian",
    abbrev: "Cm",
    t_age: 485.4,
    b_age: 541,
    color: "#7FA056",
  },
  { name: "Ediacaran", abbrev: "E", t_age: 541, b_age: 635, color: "#FFC3E1" },
  {
    name: "Cryogenian",
    abbrev: "Cr",
    t_age: 635,
    b_age: 720,
    color: "#FFAFD7",
  },
  { name: "Tonian", abbrev: "T", t_age: 720, b_age: 1000, color: "#FFA5D2" },
  { name: "Stenian", abbrev: "St", t_age: 1000, b_age: 1200, color: "#FFA5D2" },
  {
    name: "Ectasian",
    abbrev: "Ec",
    t_age: 1200,
    b_age: 1400,
    color: "#FF98CC",
  },
  {
    name: "Calymmian",
    abbrev: "Ca",
    t_age: 1400,
    b_age: 1600,
    color: "#FF8BC5",
  },
  {
    name: "Statherian",
    abbrev: "St",
    t_age: 1600,
    b_age: 1800,
    color: "#EE93C1",
  },
  {
    name: "Orosirian",
    abbrev: "Or",
    t_age: 1800,
    b_age: 2050,
    color: "#E874AF",
  },
  { name: "Rhyacian", abbrev: "R", t_age: 2050, b_age: 2300, color: "#EB84B8" },
  {
    name: "Siderian",
    abbrev: "Sd",
    t_age: 2300,
    b_age: 2500,
    color: "#E874AF",
  },
];

export * from "./fossils";
export * from "./formatting";
