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

var watchify = require('watchify');

gulp.task('build', function() {
  gulp.src('./index.html')
    .pipe(htmlhint())
    .pipe(htmlhint.reporter());

  gulp.src(['node_modules/leaflet/dist/leaflet.js', 'src/js/leaflet-pan-to-offset.js', 'node_modules/leaflet-hash/leaflet-hash.js'])
    .pipe(concat('leaflet.min.js'))
    .pipe(uglify())
    .pipe(gulp.dest('./dist/js/'));
});

gulp.task('css-min', function() {
  gulp.src(['src/css/bootstrap.min.css', 'node_modules/leaflet/dist/leaflet.css', 'src/css/animate.min.css', 'src/css/styles.css'])
    .pipe(concat('styles.min.css'))
    .pipe(minifyCSS())
    .pipe(gulp.dest('./dist/css/'));
})

gulp.task('watch', ['browserify-watch'], function() {
  //  gulp.watch('src/js/components/*.js', ['browserify-babel']);
    gulp.watch('src/css/*.css', ['css-min']);
    gulp.watch('index.html', ['build']);

});

function buildBundle(watch) {
  var bundler = browserify({
    entries: 'src/js/index.js',
    extensions: ['.jsx', '.js'],
    debug: true
  });

  if (watch) {
    bundler = watchify(bundler);
    bundler.on('update', function() {
      bundleShare(bundler);
    });
  }

  bundleShare(bundler);
}

function bundleShare(b) {
  console.log('bundling')
  return b.transform(babelify)
    .bundle()
    .pipe(source('bundle.min.js'))
    .pipe(buffer())
    .pipe(uglify())
    .pipe(gulp.dest('./dist/js'));
}



gulp.task('browserify-watch', function() {
  buildBundle(true);
});
gulp.task('browserify-no-watch', function() {
  buildBundle(false);
});

gulp.task('default', ['build', 'css-min', 'browserify-no-watch']);
