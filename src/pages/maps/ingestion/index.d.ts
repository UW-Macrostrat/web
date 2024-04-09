interface IngestProcess {
  id: number;
  source: Source;
  tags: string[];

}

interface Source {
  source_id: number;
  slug: string;
  name: string;
  scale: number;
  raster_url?: string;
}