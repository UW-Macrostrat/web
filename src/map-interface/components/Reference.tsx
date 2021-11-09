import React from "react";

function Reference(props) {
  if (!props.reference || Object.keys(props.reference).length === 0) {
    return null;
  }
  return (
    <div className="reference map-source-attr">
      <span className="attr">Source: </span>
      {props.reference.authors},
      {props.reference.ref_year.length
        ? " " + props.reference.ref_year + ", "
        : ""}
      <a className="ref-link" href={props.reference.url} target="_blank">
        {props.reference.ref_title}
      </a>
      {props.reference.ref_source.length
        ? ": " + props.reference.ref_source
        : ""}
      {props.reference.isbn_doi.length ? ", " + props.reference.isbn_doi : ""}.{" "}
      {props.reference.source_id} / {props.reference.map_id}
    </div>
  );
}

export default Reference;
