# Map Editing Interface

Created as part of Macrostrat's mapping pipeline for the CriticalMAAS project to facilitate the consumption and validation of TA1 maps.

Table interface built for quick reconciliation of outside geometries with Macrostrats map representation.

Features:

- Hide and Copy columns
- Standard Filter and Grouping
- Purpose built interfaces for certain columns ( Example: Selection interface for all valid age intervals )
- View of running operations, as well as push and clear functionality
- Virtualized 'infinite' scrolling of table data to keep data downloads web friendly
- Group based auth to prevent outside changes


## Using the Editing Interface

- [Overview](#overview)
- [Starred Column Descriptions](#starred-column-description)
- [Table Commands](#table-commands)

### Overview

This ingestion interface is used to clean/transform ingested maps legend data. 

The starred columns (★) denote the columns
that are intended to be populated by the non-star columns which are populated via the ingestion process.

### Starred Column Description

All the columns in addition to these are filled in from the ingested map and can typically be transformed via the
table interface to populate these values. Otherwise, we provide the original .zip file that was ingested to help locate the
appropriate README files.

#### orig_id

This columns is composed of ids for each polygon. The best way to populate this is to copy and paste the column from
the ingestion that most closely resembles a list of discrete values.

#### descrip

This column is the description of the polygon.

#### ready

This column is a **True/False** column used to denote a row as "Ready". These "Ready" rows can then be removed by a column filter.

#### name

Name of the polygon, typically taken from the ingestion.

#### strat_name

Name of the stratigraphy.

#### age

Age of the polygon.

#### comments

Any comments that you would like to make can be entered here.

#### t_interval

?

#### b_interval

?

#### lith

?

### Table Commands

**tab/shift + tab**

Navigate Cells Horizontally

**enter/shift + enter**

Navigate Cells Vertically

**shift + h ( Well a column is selected )**

Hide a column

**cmd + c ( Well a column is selected )**

Copy a column

**cmd + v ( Well a column is selected )**

Paste a column

