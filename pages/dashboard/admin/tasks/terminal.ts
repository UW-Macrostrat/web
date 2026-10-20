/** A run's terminal output, drawn by xterm.js from the API's event stream.
 *
 * The worker renders the task into a 120-column colour terminal and streams
 * the raw output; the browser only has to draw it. `EventSource` replays the
 * run from the start (or the archive, once the stream has expired), follows it
 * live, and resumes from `Last-Event-ID` by itself after a disconnect. Client
 * only: xterm.js needs a DOM, so it is imported in the effect.
 */
import hyper from "@macrostrat/hyper";
import { Spinner, Tag } from "@blueprintjs/core";
import { useEffect, useRef, useState } from "react";
import { runOutputURL, type RunState } from "./api";
import styles from "./main.module.sass";

const h = hyper.styled(styles);

export const TERMINAL_COLUMNS = 120;
export const TERMINAL_ROWS = 40;

type StreamStatus = "connecting" | "streaming" | "ended" | "error";

export function RunTerminal({
  runId,
  onEnd,
}: {
  runId: string;
  onEnd?(state: RunState): void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<StreamStatus>("connecting");

  useEffect(() => {
    if (host.current == null) return;
    let disposed = false;
    let terminal: any = null;
    let source: EventSource | null = null;

    (async () => {
      const { Terminal } = await import("@xterm/xterm");
      await import("@xterm/xterm/css/xterm.css");
      if (disposed || host.current == null) return;
      terminal = new Terminal({
        cols: TERMINAL_COLUMNS,
        rows: TERMINAL_ROWS,
        // Rich ends lines with a bare newline; a terminal wants the carriage return too.
        convertEol: true,
        disableStdin: true,
        scrollback: 50000,
        fontSize: 13,
      });
      terminal.open(host.current);

      source = new EventSource(runOutputURL(runId), { withCredentials: true });
      source.onmessage = (event) => {
        terminal.write(JSON.parse(event.data).d);
        setStatus("streaming");
      };
      source.addEventListener("end", (event: MessageEvent) => {
        setStatus("ended");
        source?.close();
        onEnd?.(JSON.parse(event.data).state);
      });
      source.onerror = () => {
        // CONNECTING is the browser retrying, with Last-Event-ID; CLOSED is final.
        if (source?.readyState === EventSource.CLOSED) setStatus("error");
      };
    })();

    return () => {
      disposed = true;
      source?.close();
      terminal?.dispose();
    };
  }, [runId]);

  return h("div.run-terminal", [
    h("div.terminal-host", { ref: host }),
    h(StreamStatusLine, { status }),
  ]);
}

function StreamStatusLine({ status }: { status: StreamStatus }) {
  if (status === "connecting") {
    return h("div.stream-status", [h(Spinner, { size: 12 }), "Connecting…"]);
  }
  if (status === "streaming") {
    return h("div.stream-status", [h(Spinner, { size: 12 }), "Live"]);
  }
  if (status === "error") {
    return h("div.stream-status", [
      h(Tag, { minimal: true, intent: "danger" }, "Stream closed"),
      "Reload the page to reconnect.",
    ]);
  }
  return h("div.stream-status", [h(Tag, { minimal: true }, "Complete")]);
}
