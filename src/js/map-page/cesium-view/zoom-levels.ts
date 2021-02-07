var zoomLevelHeights = getZoomLevelHeights(1);

function getZoomLevelHeights(precision) {
    precision = precision || 10;

    var step = 100000.0;

    var result = [];
    var currentZoomLevel = 0;
    for (var height = 100000000.0; height > step; height = height - step) {
        var level = detectZoomLevel(height);
        if (level === null) {
            break;
        }

        if (level !== currentZoomLevel) {
            var minHeight = height;
            var maxHeight = height + step;
            while (maxHeight - minHeight > precision) {
                height = minHeight + (maxHeight - minHeight) / 2;
                if (detectZoomLevel(height) === level) {
                    minHeight = height;
                }
                else {
                    maxHeight = height;
                }
            }

            result.push({
                level: level,
                height: Math.round(height)
            });

            currentZoomLevel = level;

            if (result.length >= 2) {
                step = (result[result.length - 2].height - height) / 1000.0;
            }
        }
    }

    return result;
}

function detectZoomLevel(distance) {
    var scene = cesiumWidget.scene;
    var tileProvider = scene.globe._surface.tileProvider;
    var quadtree = tileProvider._quadtree;
    var drawingBufferHeight = cesiumWidget.canvas.height;
    var sseDenominator = cesiumWidget.camera.frustum.sseDenominator;

    for (var level = 0; level <= 19; level++) {
        var maxGeometricError = tileProvider.getLevelMaximumGeometricError(level);
        var error = (maxGeometricError * drawingBufferHeight) / (distance * sseDenominator);
        if (error < quadtree.maximumScreenSpaceError) {
            return level;
        }
    }

    return null;
}

export {zoomLevelHeights, detectZoomLevel}
