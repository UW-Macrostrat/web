import React from "react";

class Footer extends React.Component {
  render() {
    return (
      <div className={this.props.loading ? "hidden" : "footer"}>
        <div className="footer-left">
          <div className="footer-brand">
            <a href="/">
              <img src="dist/img/logo.png" className="footer-logo" /> Macrostrat{" "}
              <br />
            </a>
            <a href="https://creativecommons.org/licenses/by/4.0/">
              <img src="dist/img/cc-by.png" className="footer-license" />
            </a>
          </div>
        </div>
        <div className="footer-right">
          {this.props.data.length ? (
            <h4 className="footer-source-title">Primary sources</h4>
          ) : (
            ""
          )}
          <ul>
            {this.props.data.map((d, i) => {
              return (
                <li className="reference" key={i}>
                  {d}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    );
  }
}

export default Footer;
