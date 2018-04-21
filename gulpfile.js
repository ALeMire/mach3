const _ = require('lodash')
const del = require('del')
const path = require('path')
const fs = require('fs')
const gulp = require('gulp')
const gulpFM = require('gulp-front-matter')
const metalsmith = require('gulpsmith')
const inPlace = require('metalsmith-in-place')
const sass = require('metalsmith-sass')
const yaml = require('js-yaml')
const connect = require('gulp-connect')
const contentful = require('contentful-metalsmith')
const deploy = require('gulp-gh-pages')

const config = yaml.safeLoad(fs.readFileSync('config.yml', 'utf8'))
const webconfig = yaml.safeLoad(fs.readFileSync(config.src + '/config.yml', 'utf8'))

gulp.task('build::clean', function() {
  return del([
    path.join(config.dest,'/**/*')], {force: true}
  ).then(paths => {
      console.log('Files and folders that were deleted:\n', paths.join('\n'))
})
})

gulp.task('pug::compile', function() {
  return gulp.src(config.src+'/*')
  .pipe(gulpFM()).on('data', function(file) {
    if (!_.isEmpty(file.frontMatter)) {
    _.assign(file, file.frontMatter)
    delete file.frontMatter
    }
  })
  .pipe(metalsmith()
    .metadata({
      typekit_url: webconfig.typekit_url
      }  
    )
    .use(contentful({
      access_token: webconfig.access_token,
      space_id: webconfig.space_id,
      common: webconfig.common
    }))
    .use(inPlace({
      engine: 'pug',
      pattern: '**/*.pug',
      engineOptions: {
        basedir: config.src,
      }
    })))
  .pipe(gulp.dest(config.dest))
})

gulp.task('sass::compile', function() {
  return gulp.src(config.src+'/styles/**/*')
  .pipe(metalsmith()
    .use(sass({
      outputStyle: 'compressed',
      sourceMap: true,
      sourceMapContents: true,
      outputDir: 'css'
    })))
  .pipe(gulp.dest(config.dest))
})

gulp.task('dev::watch', function(done){
  gulp.watch(path.join(config.src,'/**/*'), gulp.series('pug::compile', 'sass::compile'))
  done()
})

gulp.task('dev::server', function(done){
  connect.server({
    root: config.dest,
    host: config.dev_host,
    port: config.dev_port,
    livereload: true
  })
 done() 
})

gulp.task('deploy::gh-pages', function (done){
  gulp.src(config.dest + '/**/*')
  .pipe(deploy())
  done()
})

gulp.task('default', gulp.series('build::clean', 'pug::compile', 'sass::compile'))
gulp.task('deploy', gulp.series('build::clean', 'pug::compile', 'sass::compile', 'deploy::gh-pages'))
gulp.task('develop', gulp.parallel('dev::watch', 'dev::server'))
