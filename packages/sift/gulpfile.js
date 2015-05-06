var gulp = require('gulp'),
    concat = require('gulp-concat'),
    uglify = require('gulp-uglify'),
    minifyCSS = require('gulp-minify-css'),
    watch = require('gulp-watch');

gulp.task('default', function() {
  gulp.src(['js/jquery-2.1.3.min.js', 'js/fastclick.min.js', 'js/leaflet.js', 'js/leaflet-hash.js', 'js/mustache.min.js', 'js/typeahead.bundle.min.js', 'js/topojson.min.js'])
    .pipe(concat('libs.js'))
    .pipe(uglify())
    .pipe(gulp.dest('./js/'));

  gulp.src(['css/normalize.css', 'css/skeleton.css', 'css/leaflet.css', 'css/common.css', 'css/typeahead.css'])
    .pipe(concat('styles.min.css'))
    .pipe(minifyCSS())
    .pipe(gulp.dest('./css/'))
});

// Rerun the task when a file changes
gulp.task('watch', function() {
  gulp.watch('css/*', ['default']);
  gulp.watch('js/*', ['default']);
});
