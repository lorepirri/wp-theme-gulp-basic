// Gulp.js configuration
'use strict';

const

  // ** change these two to yours **
  wordpress_project_name = 'your-site-folder', // root folder in Vagrant
  theme_name = 'your-site-theme-name',
  browserSyncProxy = 'http://local.your-site.test/', // or e.g. localhost:3000

  // source and build folders, ** change this to yours **
  dir = {
    src         : 'src/',
    build       : `../../vagrant-local/www/${wordpress_project_name}/public_html/wp-content/themes/${theme_name}/`
  },

  // Gulp and plugins
  { src, dest, series, parallel, watch } = require('gulp'),
  noop          = require("gulp-noop"),
  newer         = require('gulp-newer'),
  imagemin      = require('gulp-imagemin'),
  sass          = require('gulp-sass'),
  postcss       = require('gulp-postcss'),
  concat        = require('gulp-concat'),
  stripdebug    = require('gulp-strip-debug'),
  uglify        = require('gulp-uglify'),
  browserSync   = require('browser-sync').create(),
  log           = require('fancy-log')
;

const reload = (cb) => { browserSync.reload(); cb(); };

// theme files settings
const themefiles_settings = {
  src           : dir.src + 'theme/**/*',
  build         : dir.build
};

// copy theme files
const themefiles = function() {
  return src(themefiles_settings.src)
    .pipe(newer(themefiles_settings.build))
    .pipe(dest(themefiles_settings.build));
};

exports.themefiles = themefiles;
// ---

// image settings
const images_path = 'assets/images/';
const images_settings = {
  src         : dir.src + 'images/**/*',
  build       : dir.build + images_path
};

// image processing
const images = function() {
  return src(images_settings.src)
    .pipe(newer(images_settings.build))
    .pipe(imagemin())    
    .pipe(dest(images_settings.build));
};

exports.images = images;
// ---

// CSS settings
var scss_settings = {
  src         : dir.src + 'scss/style.scss',
  watch       : dir.src + 'scss/**/*',
  build       : dir.build,
  sassOpts: {
    outputStyle     : 'nested',
    imagePath       : images_settings.build,
    precision       : 3,
    errLogToConsole : true
  },
  processors: [
    require('postcss-assets')({
      loadPaths: [images_path],
      basePath: dir.build,
      baseUrl: `/wp-content/themes/${theme_name}/`
    }),
    require('autoprefixer')({
      browsers: ['last 2 versions', '> 2%']
    }),
    require('css-mqpacker'),
    require('cssnano')
  ]
};

// SCSS processing
const scss = function() {
  return src(scss_settings.src)
    .pipe(sass(scss_settings.sassOpts))
    .pipe(postcss(scss_settings.processors))
    .pipe(dest(scss_settings.build))
    .pipe(browserSync.active ? browserSync.reload({ stream: true }) : noop());
};
const css = series(images, scss);

exports.css = css;
// ---

// JavaScript settings
const js_settings = {
  src         : dir.src + 'js/**/*',
  build       : dir.build + 'js/',
  filename    : 'scripts.js'
};

// JavaScript processing
const js = function() {

  return src(js_settings.src)
    .pipe(concat(js_settings.filename))
    .pipe(stripdebug())
    .pipe(uglify())
    .pipe(dest(js_settings.build))
    .pipe(browserSync.active ? browserSync.reload({ stream: true }) : noop());
};

exports.js = js;
// ---

// run all tasks
const build = parallel(themefiles, css, js);
exports.build = build;
// ---

// Browsersync options
const syncOpts = {
  proxy       : browserSyncProxy,
  open        : false,
  notify      : false,
  ghostMode   : false,
  watch       : false, // do not refresh on changes automatically
  injectChanges: true, // Inject CSS changes
  ui: {
    port: 8001
  }
};

// watch for file changes
const watch_all = function() {

  log('browserSync init!');

  browserSync.init(syncOpts);

  // page changes
  watch(themefiles_settings.src, series(themefiles, reload));

  // image changes
  watch(images_settings.src, series(images, reload));

  // CSS changes
  watch(scss_settings.watch, css);

  // JavaScript main changes
  watch(js_settings.src, js);
  
  log('watch done!');

};
exports.watch_all = watch_all;

// default task
exports.default = series(build, watch_all);
// ---
