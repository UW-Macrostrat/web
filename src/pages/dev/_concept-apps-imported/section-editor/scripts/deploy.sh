#!/bin/bash

rm -rf dist
npm run build

rsync -azv --delete dist/ davenquinn:static-sites/viz/stratigraphic-column-editor/

