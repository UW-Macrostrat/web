-- Get surfaces
WITH surfaces AS (
SELECT
	bottom-290 bottom,
	lithology,
	grainsize,
	coalesce(fill_pattern, lithology) pattern,
	covered,
	facies,
	fill_pattern,
	definite_boundary
FROM section.section_lithology
WHERE section='J'
  AND bottom > 290
  AND bottom < 350
),
notes AS (
  SELECT
  	start_height-290 height,
  	end_height-290 top_height,
    coalesce(edited_note, note) note,
    symbol
  FROM section.section_note
  WHERE section='J'
    AND start_height > 290
    AND start_height < 350
)
-- Dump to JSON with psql meta command
SELECT json_build_object(
  'surfaces', (SELECT json_agg(surfaces) FROM surfaces),
  'notes', (SELECT json_agg(notes) FROM notes)
);
