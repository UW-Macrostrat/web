/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
import h from "~/hyper";
import { Button } from "@blueprintjs/core";

const PanelHeader = function(props) {
  const { title, onClose, children } = props;
  return h("div.panel-header", [
    h.if(title != null)("h1.title", null, title),
    h.if(children != null)([h("div.expander"), children]),
    h("div.expander"),
    h(Button, { minimal: true, icon: "cross", onClick: onClose })
  ]);
};

const Panel = function(props) {
  const { children, className, style, ...rest } = props;
  return h("div.panel-column", [
    h("div.panel-container", [
      h("div.panel-container-inner", [
        h("div.panel-outer", [
          h("div.panel", { className, style }, [
            h(PanelHeader, rest),
            h("div.panel-content", null, children)
          ]),
          h("div.expander")
        ])
      ])
    ])
  ]);
};

const ContentPanel = props => h("div.content-panel", props);

export { Panel, PanelHeader, ContentPanel };
