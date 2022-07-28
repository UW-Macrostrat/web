import React, { useState, useEffect } from "react";
import { Dialog } from "@blueprintjs/core";
import { MAP_MODES } from "../../context";

interface VoronoiHelpDialogProps {
  mode: MAP_MODES;
}

function VoronoiHelpDialog(props: VoronoiHelpDialogProps) {
  const { mode } = props;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (mode == MAP_MODES.voronoi) {
      setOpen(true);
    }
  }, [mode]);

  const onClose = () => setOpen(false);

  return (
    <Dialog isOpen={open} title="Tessellation Mode" onClose={onClose}>
      <h1>Welcome to Tessellation Mode</h1>
      <p>Help text for Tessellation mode</p>
    </Dialog>
  );
}

export { VoronoiHelpDialog };
