import React from "react";
import { Button } from "@blueprintjs/core";

function SaveButton(props) {
  const { onClick, minimal, disabled } = props;

  return (
    <Button
      intent="primary"
      minimal={minimal}
      onClick={onClick}
      disabled={disabled}
    >
      Save
    </Button>
  );
}

function downloadObjectAsJson(exportObj, exportName) {
  var dataStr =
    "data:text/json;charset=utf-8," +
    encodeURIComponent(JSON.stringify(exportObj));
  var downloadAnchorNode = document.createElement("a");
  downloadAnchorNode.setAttribute("href", dataStr);
  downloadAnchorNode.setAttribute("download", exportName + ".json");
  document.body.appendChild(downloadAnchorNode); // required for firefox
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
}

function DownloadButton(props) {
  const { columns } = props;
  const onClick = () => {
    downloadObjectAsJson(columns, "columns");
  };
  return (
    <Button icon="download" intent="primary" onClick={onClick} minimal={true}>
      Download
    </Button>
  );
}

export { SaveButton, DownloadButton };
