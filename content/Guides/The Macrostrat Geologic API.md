[[Macrostrat]] maintains a robust, stable, and widely-used API for geologic
information ([https://macrostrat.org/api](https://macrostrat.org/api/v2)). The
API endpoint attempts to provide basic “self-documenting” information at each
route, but we don’t yet provide a human-readable guide to our basic
capabilities, outside of the description of the data system’s structure given in
[Peters et al., 2018](https://doi.org/10.1029/2018GC007467).

This document seeks to fill that gap so [[CriticalMAAS]] performers can explore
and use some of our “out-of-the-box” capabilities while we extend our online
documentation and build extensions tailored to critical minerals. Please leave
comments if you have any questions, or contact Daven Quinn and Shanan Peters on
the Macrostrat team.

> [!note] the default version of Macrostrat’s API is “v2” and
> [https://macrostrat.org/api](https://macrostrat.org/api) and
> [https://macrostrat.org/api/v2](https://macrostrat.org/api/v2) are
> interchangeable.

## Key points for CriticalMAAS TA1 and TA2:

- Information tied to geologic entities will often be associated with references
  to
  [stratigraphic names](https://docs.google.com/document/d/13uLxrS0sI9qmLIERtVvegwXa6_063V5Mz82DzJ9LArw/edit#heading=h.8hd1oky9a4vx)
  and
  [time intervals](https://docs.google.com/document/d/13uLxrS0sI9qmLIERtVvegwXa6_063V5Mz82DzJ9LArw/edit#heading=h.kh0vn4j1fx8s)
  that are housed in our data dictionaries. We will ask that such information be
  compiled and included in TA1 and TA2 outputs where possible.
- As part of Macrostrat’s Critical minerals integration, we’re working on more
  API endpoints and filtering options, as well as links to other data types not
  currently available in the API (mineral resource sites, geochemistry, MinDat
  mineral information, etc.). Let us know if you have capabilities you wish to
  see.

# Data definitions and standardized dictionaries

[https://macrostrat.org/api/defs](https://macrostrat.org/api/defs)

Macrostrat has compiled and curated lists of named geological attributes and
features that might be present in literature, maps, etc. These can be useful for
guiding extraction of geological data from unstructured sources (maps, tables,
literature text, etc.)

## Stratigraphic names

Stratigraphic names represent geological entities that can span across columns,
maps and other sources of information. They loosely represent a collection of
geologic conditions that led to deposition of an identifiable and spatially and
temporally coherent body of rock. Critically, stratigraphic names are how
geologists usually identify “rock units” in maps and scientific literature.
Thus, they are a natural key for linking geological information from different
sources.

On geologic maps, rock units are often (but not always) described in the legend
with a known stratigraphic name.

[https://macrostrat.org/api/defs/strat_names](https://macrostrat.org/api/defs/strat_names)

### Find a specific stratigraphic name

[https://macrostrat.org/api/defs/strat_names?strat_name_like=Bonneterre](https://macrostrat.org/api/defs/strat_names?strat_name_like=Bonneterre)

Right now, the primary way to spatially filter stratigraphic names is to go via
the
[Units](https://docs.google.com/document/d/13uLxrS0sI9qmLIERtVvegwXa6_063V5Mz82DzJ9LArw/edit#heading=h.eb8xc1dot2wv)
representation, which expresses geologic units within a certain geologic area.

[https://macrostrat.org/api/v2/units?lat=43&lng=-102&adjacents](https://macrostrat.org/api/v2/units?lat=43&lng=-102&adjacents)

## Timescales and Intervals

Geologists often use names to describe intervals of time (ex., the t-rex lived
in Cretaceous time) because these divisions can be inferred from the ordering of
geologic events in many cases where the absolute ages cannot be determined. In
fact, for much of the history of geology before isotope dating became
commonplace in the 1980s, numerical ages were essentially never discussed.
Consequently, there has arisen a rich lexicon of time periods that comprise the
geologic timescale.

Macrostrat’s API contains definitions of “timescales” (organizational schemes
for geologic time) at the
[https://macrostrat.org/api/v2/defs/timescales?all](https://macrostrat.org/api/v2/defs/timescales?all)
route. These range from widely recognized (intervals from the internationally
recognized
[Geologic Time Scale](https://www.sciencedirect.com/book/9780128243602/geologic-time-scale-2020))
to highly context-dependent (New Zealand ages or “calcareous nanofossil zones”).

Timescales are composed of “intervals”
[https://macrostrat.org/api/v2/defs/intervals](https://macrostrat.org/api/v2/defs/intervals),
which are units of geologic time. Within Macrostrat, the relevant intervals for
most geologic problems are found in timescale_id=11, which contains
“international intervals” through geologic time.

[https://macrostrat.org/api/v2/defs/intervals?timescale_id=11](https://macrostrat.org/api/v2/defs/intervals?timescale_id=11)

Note: timescale 11 is essentially a union of “international ages”
(timescale_id=1), “international epochs” (2), “international periods” (3),
“international eras” (13), and “international eons” (14), which are divisions at
different levels of specificity covering all of Earth history.

On geologic maps, rock units are typically described in the legend with a time
interval.
