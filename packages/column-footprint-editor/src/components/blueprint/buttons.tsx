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

export { SaveButton };
