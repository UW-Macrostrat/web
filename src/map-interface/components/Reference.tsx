import React, { Component } from "react";

class Reference extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    if (
      !this.props.reference ||
      Object.keys(this.props.reference).length === 0
    ) {
      return null;
    }
    return (
      <div className="reference map-source-attr">
        <span className="attr">Source: </span>
        {this.props.reference.authors},
        {this.props.reference.ref_year.length
          ? " " + this.props.reference.ref_year + ", "
          : ""}
        <a className="ref-link" href={this.props.reference.url} target="_blank">
          {this.props.reference.ref_title}
        </a>
        {this.props.reference.ref_source.length
          ? ": " + this.props.reference.ref_source
          : ""}
        {this.props.reference.isbn_doi.length
          ? ", " + this.props.reference.isbn_doi
          : ""}
        . {this.props.reference.source_id} / {this.props.reference.map_id}
      </div>
    );
  }
}

export default Reference;
