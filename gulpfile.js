var fs = require('fs')
var gulp = require('gulp')
var source = require('vinyl-source-stream')
var serve = require('gulp-serve')
var rename = require('gulp-rename')
var browserify = require('browserify')
var buffer = require('vinyl-buffer')
var uglify = require('gulp-uglify')
var taskListing = require('gulp-task-listing')
var awspublish = require('gulp-awspublish')
var injectVersion = require('gulp-inject-version')
var derequire = require('gulp-derequire');

var es = require('event-stream')

var sourceTargets = [
  './src/opbeat.js',
  './src/angular-opbeat.js'
]

// Static file server
gulp.task('server', serve({
  root: ['examples', 'dist'],
  port: 7000
}))

gulp.task('build:release', function () {
  var version = require('./package').version;
  var majorVersion = version.match(/^(\d).(\d).(\d)/)[1]

  var path = './dist/' + majorVersion

  var tasks = sourceTargets.map(function (entry) {
    return browserify({
      entries: [entry],
      standalone: ''
    })
      .bundle()
      .pipe(source(entry))
      .pipe(rename({dirname: ''}))
      .pipe(buffer())
      .pipe(injectVersion())
      .pipe(derequire())
      .pipe(gulp.dest(path))
      .pipe(rename({
        extname: '.min.js'
      }))
      .pipe(uglify())
      .pipe(gulp.dest(path))
  })

  return es.merge.apply(null, tasks)

})

gulp.task('build', function () {
  var tasks = sourceTargets.map(function (entry) {
    return browserify({
      entries: [entry],
      standalone: ''
    })
      .bundle()
      .pipe(source(entry))
      .pipe(rename({dirname: ''}))
      .pipe(buffer())
      .pipe(injectVersion())
      .pipe(derequire())
      .pipe(gulp.dest('./dist/'))
  })

  return es.merge.apply(null, tasks)
})

// Development mode
gulp.task('watch', [], function (cb) {
  gulp.run(
    'build',
    'server'
  )

  // Watch JS files
  gulp.watch(['libs/**', 'src/**'], ['build'])
  console.log('\nExample site running on http://localhost:7000/\n')
})

//
// Deploy task
//
gulp.task('deploy', ['build:release'], function () {
  // Load options from file
  awsoptions = JSON.parse(fs.readFileSync('aws.json'))

  // Hardcoded bucketname, to avoid mistakes
  awsoptions.params = {
    Bucket: 'opbeat-js-cdn'
  }

  // Create new publisher
  var publisher = awspublish.create(awsoptions)

  // Set headers
  var headers = {
    'Cache-Control': 'max-age=1800, public'
  }

  return gulp.src('dist/**')
    // Gzip
    .pipe(awspublish.gzip())
    // Publish files with headers
    .pipe(publisher.publish(headers))
    // Create a cache file to speed up consecutive uploads
    .pipe(publisher.cache())
    // Print upload updates to console
    .pipe(awspublish.reporter())
})

gulp.task('default', taskListing)
