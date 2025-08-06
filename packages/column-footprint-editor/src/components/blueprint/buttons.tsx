import React from "react";
import { Button } from "@blueprintjs/core";
import { useAPIResult } from "@macrostrat/ui-components";
import { base } from "../../context/env";

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
  var dataStr = "data:text/csv;charset=utf-8," + encodeURIComponent(exportObj);
  var downloadAnchorNode = document.createElement("a");
  downloadAnchorNode.setAttribute("href", dataStr);
  downloadAnchorNode.setAttribute("download", exportName + ".csv");
  document.body.appendChild(downloadAnchorNode); // required for firefox
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
}

function DownloadButton(props) {
  const { project_id } = props;
  let data = [];
  if (project_id) {
    data = useAPIResult(base + `${project_id}/csv`);
  }

  const onClick = () => {
    downloadObjectAsJson(data, "columns");
  };
  return (
    <Button
      icon="download"
      intent="primary"
      onClick={onClick}
      minimal={true}
      disabled={project_id == null}
    >
      Download
    </Button>
  );
}

export { SaveButton, DownloadButton };
