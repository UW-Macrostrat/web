var gulp = require('gulp'),
    htmlhint = require('gulp-htmlhint'),
    concat = require('gulp-concat'),
    uglify = require('gulp-uglify'),
    jshint = require('gulp-jshint'),
    minifyCSS = require('gulp-minify-css'),
    browserify = require('browserify'),
    babelify = require('babelify'),
    buffer = require('vinyl-buffer'),
    source = require('vinyl-source-stream');

gulp.task('build', function() {
  gulp.src('./index.html')
    .pipe(htmlhint())
    .pipe(htmlhint.reporter());

  gulp.src(['node_modules/leaflet/dist/leaflet.js'])
    .pipe(concat('leaflet.min.js'))
    .pipe(uglify())
    .pipe(gulp.dest('./dist/js/'));
});

gulp.task('css-min', function() {
  gulp.src(['node_modules/leaflet/dist/leaflet.css', 'src/css/styles.css'])
    .pipe(concat('styles.min.css'))
    .pipe(minifyCSS())
    .pipe(gulp.dest('./dist/css/'));
})

gulp.task('watch', function() {
    gulp.watch('src/js/components/*.jsx', ['browserify-babel']);
    gulp.watch('src/js/**/*.jsx', ['browserify-babel']);
    gulp.watch('src/css/*.css', ['css-min']);
    gulp.watch('index.html', ['build']);
});

gulp.task('browserify-babel', function() {
  browserify({
    entries: 'src/js/index.js',
    extensions: ['.jsx', '.js'],
    debug: true
  })
  .transform(babelify)
  .bundle()
  .pipe(source('bundle.min.js'))
//  .pipe(buffer())
//  .pipe(uglify())
  .pipe(gulp.dest('./dist/js'))

});

gulp.task('default', ['build', 'css-min', 'browserify-babel']);
