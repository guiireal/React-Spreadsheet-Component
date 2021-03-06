var browserify = require('browserify');
var del        = require('del');
var gulp       = require('gulp');
var source     = require('vinyl-source-stream');

var header     = require('gulp-header');
var jshint     = require('gulp-jshint');
var rename     = require('gulp-rename');
var plumber    = require('gulp-plumber');
var react      = require('gulp-react');
var streamify  = require('gulp-streamify');
var uglify     = require('gulp-uglify');
var gutil      = require('gulp-util');
var connect    = require('gulp-connect');
var babel      = require('gulp-babel');
var babelify   = require('babelify');

var pkg = require('./package.json');
var devBuild = (process.env.NODE_ENV === 'production') ? '' : ' (dev build at ' + (new Date()).toUTCString() + ')';
var distHeader = '/*!\n\
 * <%= pkg.name %> <%= pkg.version %><%= devBuild %> - <%= pkg.homepage %>\n\
 * <%= pkg.license %> Licensed\n\
 */\n';

var jsSrcPaths = './src/*.js*'
var jsLibPaths = './lib/*.js'

gulp.task('clean-lib', function (cb) {
    del(jsLibPaths).then(function () {
        cb();
    });
});

gulp.task('transpile-js', ['clean-lib'], function () {
    return gulp.src(jsSrcPaths)
        .pipe(plumber())
        .pipe(react({harmony: false, es6module: true}))
        .pipe(babel())
        .pipe(gulp.dest('./lib'));
});

gulp.task('lint-js', ['transpile-js'], function () {
    return gulp.src(jsLibPaths)
        .pipe(jshint('./.jshintrc'))
        .pipe(jshint.reporter('jshint-stylish'));
});

gulp.task('bundle-js', ['lint-js'], function () {
    var b = browserify(pkg.main, {
        debug: !!gutil.env.debug
        , standalone: pkg.standalone
        , detectGlobals: false
    });
    
    b.transform('browserify-shim')
    
    var stream = b.bundle()
        .pipe(source('spreadsheet.js'))
        .pipe(streamify(header(distHeader, { pkg: pkg, devBuild: devBuild })))
        .pipe(gulp.dest('./dist'));
        
    if (process.env.NODE_ENV === 'production') {
        stream = stream
            .pipe(rename('spreadsheet.min.js'))
            .pipe(streamify(uglify()))
            .pipe(streamify(header(distHeader, { pkg: pkg, devBuild: devBuild })))
            .pipe(gulp.dest('./dist'));
    }

    return stream;
});

gulp.task('watch', function () {
    gulp.watch(jsSrcPaths, ['bundle-js']);
});

gulp.task('connect', function () {
    connect.server();
    
    gutil.log('--------------------------------------------')
    gutil.log(gutil.colors.magenta('To see the example, open up a browser and go'));
    gutil.log(gutil.colors.bold.red('to http://localhost:8080/example'));
    gutil.log('--------------------------------------------');
});

gulp.task('example', ['transpile-js'], function () {
    return browserify('./example.js')
        .transform("babelify", {presets: ["es2015", "react"]})
        .bundle()
        .pipe(source('bundle.js'))
        .pipe(gulp.dest('./example'));
});

gulp.task('default', ['bundle-js', 'connect', 'watch']);
