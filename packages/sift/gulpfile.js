var gulp = require('gulp'),
    concat = require('gulp-concat'),
    uglify = require('gulp-uglify'),
    minifyCSS = require('gulp-minify-css'),
    watch = require('gulp-watch');

gulp.task('uglifyJS', function() {
  gulp.src(['js/lib/jquery-2.1.3.min.js', 'js/lib/fastclick.min.js', 'js/lib/leaflet.js', 'js/lib/leaflet-hash.js', 'js/lib/mustache.min.js', 'js/lib/typeahead.bundle.min.js', 'js/lib/topojson.min.js', 'js/lib/underscore.min.js'])
    .pipe(concat('libs.js'))
    .pipe(uglify())
    .pipe(gulp.dest('./js/'));
});

gulp.task('minifyCSS', function() {
  gulp.src(['css/lib/normalize.css', 'css/lib/skeleton.css', 'css/lib/leaflet.css', 'css/common.css', 'css/lib/typeahead.css'])
    .pipe(concat('styles.min.css'))
    .pipe(minifyCSS())
    .pipe(gulp.dest('./css/'));
})

gulp.task('default', ['uglifyJS', 'minifyCSS']);

// Rerun the task when a file changes
gulp.task('watch', function() {
  gulp.watch('css/*', ['minifyCSS']);
  gulp.watch('js/*', ['uglifyJS']);
});
