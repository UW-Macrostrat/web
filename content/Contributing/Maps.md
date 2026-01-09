# Contributing maps to Macrostrat

## Polygon data fields

### Mandatory fields

- `name`: The name of the feature. This could be the name of a geologic unit, formation, or a more general unit name. If
  no formal name exists, a descriptive name may be used, such as the lithology type. (e.g., "Navajo Sandstone", "Dakota
  Formation", "Upper Member of
  the Morrison Formation", "Unknown Granite", "Alluvium", "Fluvial terrace 1A", "Water").
- `age`: A human-readable description of the age of the feature (e.g., "Cretaceous", "Late Jurassic", "201-145 Ma", "
  probably Late Miocene", "Kimmeridgian–Tithonian(?)").
- `descrip`: A text description for the unit, typically what would be rendered in a map legend.
- `lith`: A comma-separated list of lithologies present in the unit (e.g., "sandstone, shale, conglomerate").
- `b_interval`: The formal base interval of the unit (Macrostrat `interval_id`)
- `t_interval`: The formal top interval of the unit (Macrostrat `interval_id`)

### Commonly used fields

- `orig_id`: A unique identifier for the polygon within the source dataset.
- `comments`: Additional comments about the individual polygon or containing unit
- `strat_name`: The formal stratigraphic name, or comma-separated list of names, for the unit

### Seldomly used fields

- `t_age`: The numeric top age of the unit (in Ma) if known
- `b_age`: The numeric base age of the unit (in Ma) if known

### Not added yet

- `color`: A hex or RGB color code for the unit
- `abbrev`: An abbreviation for the unit name (e.g., "Jm" for Morrison Formation, "K" for Cretaceous, "Qal" for
  Quaternary alluvium)
