/** The manifest the renderer writes beside the images, and the site reads to
 * find them. Keyed by `mapSnapshotKey`. */
export interface MapSnapshotManifestEntry {
  width: number;
  height: number;
  /** Pixel ratio → file, relative to the snapshot base. */
  files: Record<string, string>;
  renderedAt: string;
}

export interface MapSnapshotManifest {
  version: 1;
  generatedAt: string;
  entries: Record<string, MapSnapshotManifestEntry>;
}
