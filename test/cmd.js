const assert = require('assert')
const AppRunner = require('./support/app-runner')
const exec = require('child_process').exec
const fs = require('fs')
const mkdirp = require('mkdirp')
const path = require('path')
const request = require('supertest')
const rimraf = require('rimraf')
const spawn = require('child_process').spawn
const utils = require('./support/utils')
const validateNpmName = require('validate-npm-package-name')

const APP_START_STOP_TIMEOUT = 10000
const PKG_PATH = path.resolve(__dirname, '..', 'package.json')
const BIN_PATH = path.resolve(
  path.dirname(PKG_PATH),
  require(PKG_PATH).bin.express
)
const NPM_INSTALL_TIMEOUT = 300000 // 5 minutes
const TEMP_DIR = utils.tmpDir()

describe('express(1)', function () {
  after(function (done) {
    this.timeout(30000)
    rimraf(TEMP_DIR, done)
  })

  describe('(no args)', function () {
    const ctx = setupTestEnvironment(this.fullTitle())

    it('should create basic app', function (done) {
      runRaw(ctx.dir, [], function (err, code, stdout, stderr) {
        if (err) {
          return done(err)
        }
        ctx.files = utils.parseCreatedFiles(stdout, ctx.dir)
        ctx.stderr = stderr
        ctx.stdout = stdout
        assert.strictEqual(ctx.files.length, 16)
        done()
      })
    })

    it('should print jade view warning', function () {
      assert.strictEqual(
        ctx.stderr,
        "\n  warning: the default view engine will not be jade in future releases\n  warning: use `--view=jade' or `--help' for additional options\n\n"
      )
    })

    it('should provide debug instructions', function () {
      assert.ok(/DEBUG=express-1-no-args:\* (?:& )?npm start/.test(ctx.stdout))
    })

    checkBasicFiles(ctx)

    it('should have jade templates', function () {
      assert.notStrictEqual(ctx.files.indexOf('views/error.jade'), -1)
      assert.notStrictEqual(ctx.files.indexOf('views/index.jade'), -1)
      assert.notStrictEqual(ctx.files.indexOf('views/layout.jade'), -1)
    })

    it('should have a package.json file', function () {
      const file = path.resolve(ctx.dir, 'package.json')
      const contents = fs.readFileSync(file, 'utf8')
      assert.strictEqual(
        contents,
        '{\n' +
          '  "name": "express-1-no-args",\n' +
          '  "version": "0.0.0",\n' +
          '  "private": true,\n' +
          '  "scripts": {\n' +
          '    "start": "node ./bin/www"\n' +
          '  },\n' +
          '  "dependencies": {\n' +
          '    "cookie-parser": "~1.4.4",\n' +
          '    "debug": "~2.6.9",\n' +
          '    "express": "~4.16.1",\n' +
          '    "http-errors": "~1.6.3",\n' +
          '    "jade": "~1.11.0",\n' +
          '    "morgan": "~1.9.1"\n' +
          '  }\n' +
          '}\n'
      )
    })

    it('should have installable dependencies', function (done) {
      this.timeout(NPM_INSTALL_TIMEOUT)
      npmInstall(ctx.dir, done)
    })

    it('should export an express app from app.js', function () {
      const file = path.resolve(ctx.dir, 'app.js')
      const app = require(file)
      assert.strictEqual(typeof app, 'function')
      assert.strictEqual(typeof app.handle, 'function')
    })

    describe('npm start', function () {
      before('start app', function () {
        this.app = new AppRunner(ctx.dir)
      })

      after('stop app', function (done) {
        this.timeout(APP_START_STOP_TIMEOUT)
        this.app.stop(done)
      })

      it('should start app', function (done) {
        this.timeout(APP_START_STOP_TIMEOUT)
        this.app.start(done)
      })

      it('should respond to HTTP request', function (done) {
        request(this.app)
          .get('/')
          .expect(200, /<title>Express<\/title>/, done)
      })

      it('should generate a 404', function (done) {
        request(this.app)
          .get('/does_not_exist')
          .expect(404, /<h1>Not Found<\/h1>/, done)
      })
    })

    describe('when directory contains spaces', function () {
      const ctx0 = setupTestEnvironment('foo bar (BAZ!)')

      it('should create basic app', function (done) {
        run(ctx0.dir, [], function (err, output) {
          if (err) {
            return done(err)
          }
          assert.strictEqual(
            utils.parseCreatedFiles(output, ctx0.dir).length,
            16
          )
          done()
        })
      })

      it('should have a valid npm package name', function () {
        const file = path.resolve(ctx0.dir, 'package.json')
        const contents = fs.readFileSync(file, 'utf8')
        const name = JSON.parse(contents).name
        assert.ok(
          validateNpmName(name).validForNewPackages,
          'package name "' + name + '" is valid'
        )
        assert.strictEqual(name, 'foo-bar-baz')
      })
    })

    describe('when directory is not a valid name', function () {
      const ctx1 = setupTestEnvironment('_')

      it('should create basic app', function (done) {
        run(ctx1.dir, [], function (err, output) {
          if (err) {
            return done(err)
          }
          assert.strictEqual(
            utils.parseCreatedFiles(output, ctx1.dir).length,
            16
          )
          done()
        })
      })

      it('should default to name "hello-world"', function () {
        const file = path.resolve(ctx1.dir, 'package.json')
        const contents = fs.readFileSync(file, 'utf8')
        const name = JSON.parse(contents).name
        assert.ok(validateNpmName(name).validForNewPackages)
        assert.strictEqual(name, 'hello-world')
      })
    })
  })

  describe('--es5', function () {
    const ctx = setupTestEnvironment(this.fullTitle())

    it('should create basic app', function (done) {
      runRaw(ctx.dir, ['--es5'], function (err, code, stdout, stderr) {
        if (err) {
          return done(err)
        }
        ctx.files = utils.parseCreatedFiles(stdout, ctx.dir)
        ctx.stderr = stderr
        ctx.stdout = stdout
        assert.strictEqual(ctx.files.length, 16)
        done()
      })
    })

    it('should print jade view warning', function () {
      assert.strictEqual(
        ctx.stderr,
        "\n  warning: the default view engine will not be jade in future releases\n  warning: use `--view=jade' or `--help' for additional options\n\n"
      )
    })

    checkBasicFiles(ctx)

    it('should have jade templates', function () {
      assert.notStrictEqual(ctx.files.indexOf('views/error.jade'), -1)
      assert.notStrictEqual(ctx.files.indexOf('views/index.jade'), -1)
      assert.notStrictEqual(ctx.files.indexOf('views/layout.jade'), -1)
    })

    it('should have a package.json file', function () {
      const file = path.resolve(ctx.dir, 'package.json')
      const contents = fs.readFileSync(file, 'utf8')
      assert.strictEqual(
        contents,
        '{\n' +
          '  "name": "express-1---es5",\n' +
          '  "version": "0.0.0",\n' +
          '  "private": true,\n' +
          '  "scripts": {\n' +
          '    "start": "node ./bin/www"\n' +
          '  },\n' +
          '  "dependencies": {\n' +
          '    "cookie-parser": "~1.4.4",\n' +
          '    "debug": "~2.6.9",\n' +
          '    "express": "~4.16.1",\n' +
          '    "http-errors": "~1.6.3",\n' +
          '    "jade": "~1.11.0",\n' +
          '    "morgan": "~1.9.1"\n' +
          '  }\n' +
          '}\n'
      )
    })

    it('should have installable dependencies', function (done) {
      this.timeout(NPM_INSTALL_TIMEOUT)
      npmInstall(ctx.dir, done)
    })

    it('should export an express app from app.js', function () {
      const file = path.resolve(ctx.dir, 'app.js')
      const app = require(file)
      assert.strictEqual(typeof app, 'function')
      assert.strictEqual(typeof app.handle, 'function')
    })

    describe('npm start', function () {
      before('start app', function () {
        this.app = new AppRunner(ctx.dir)
      })

      after('stop app', function (done) {
        this.timeout(APP_START_STOP_TIMEOUT)
        this.app.stop(done)
      })

      it('should start app', function (done) {
        this.timeout(APP_START_STOP_TIMEOUT)
        this.app.start(done)
      })

      it('should respond to HTTP request', function (done) {
        request(this.app)
          .get('/')
          .expect(200, /<title>Express<\/title>/, done)
      })

      it('should generate a 404', function (done) {
        request(this.app)
          .get('/does_not_exist')
          .expect(404, /<h1>Not Found<\/h1>/, done)
      })
    })

    describe('when directory contains spaces', function () {
      const ctx0 = setupTestEnvironment('foo bar (BAZ!)')

      it('should create basic app', function (done) {
        run(ctx0.dir, [], function (err, output) {
          if (err) {
            return done(err)
          }
          assert.strictEqual(
            utils.parseCreatedFiles(output, ctx0.dir).length,
            16
          )
          done()
        })
      })

      it('should have a valid npm package name', function () {
        const file = path.resolve(ctx0.dir, 'package.json')
        const contents = fs.readFileSync(file, 'utf8')
        const name = JSON.parse(contents).name
        assert.ok(
          validateNpmName(name).validForNewPackages,
          'package name "' + name + '" is valid'
        )
        assert.strictEqual(name, 'foo-bar-baz')
      })
    })

    describe('when directory is not a valid name', function () {
      const ctx1 = setupTestEnvironment('_')

      it('should create basic app', function (done) {
        run(ctx1.dir, [], function (err, output) {
          if (err) {
            return done(err)
          }
          assert.strictEqual(
            utils.parseCreatedFiles(output, ctx1.dir).length,
            16
          )
          done()
        })
      })

      it('should default to name "hello-world"', function () {
        const file = path.resolve(ctx1.dir, 'package.json')
        const contents = fs.readFileSync(file, 'utf8')
        const name = JSON.parse(contents).name
        assert.ok(validateNpmName(name).validForNewPackages)
        assert.strictEqual(name, 'hello-world')
      })
    })
  })

  describe('(unknown args)', function () {
    const ctx = setupTestEnvironment(this.fullTitle())

    checkAppExits(ctx, '--foo')

    checkMessage(ctx, '--foo', { runRaw: true, isUnknownArg: true })

    it('should print unknown option', function (done) {
      runRaw(ctx.dir, ['--foo'], function (err, code, stdout, stderr) {
        if (err) {
          return done(err)
        }
        assert.ok(/error: unknown option/.test(stderr))
        done()
      })
    })
  })

  describe('<dir>', function () {
    const ctx = setupTestEnvironment(this.fullTitle())

    it('should create basic app in directory', function (done) {
      runRaw(ctx.dir, ['foo'], function (err, code, stdout, stderr) {
        if (err) {
          return done(err)
        }
        ctx.files = utils.parseCreatedFiles(stdout, ctx.dir)
        ctx.stderr = stderr
        ctx.stdout = stdout
        assert.strictEqual(ctx.files.length, 17)
        done()
      })
    })

    it('should provide change directory instructions', function () {
      assert.ok(/cd foo/.test(ctx.stdout))
    })

    it('should provide install instructions', function () {
      assert.ok(/npm install/.test(ctx.stdout))
    })

    it('should provide debug instructions', function () {
      assert.ok(/DEBUG=foo:\* (?:& )?npm start/.test(ctx.stdout))
    })

    it('should have basic files', function () {
      assert.notStrictEqual(ctx.files.indexOf('foo/bin/www'), -1)
      assert.notStrictEqual(ctx.files.indexOf('foo/app.js'), -1)
      assert.notStrictEqual(ctx.files.indexOf('foo/package.json'), -1)
    })

    it('should have jade templates', function () {
      assert.notStrictEqual(ctx.files.indexOf('foo/views/error.jade'), -1)
      assert.notStrictEqual(ctx.files.indexOf('foo/views/index.jade'), -1)
      assert.notStrictEqual(ctx.files.indexOf('foo/views/layout.jade'), -1)
    })
  })

  describe('--css <engine>', function () {
    describe('(no engine)', function () {
      const ctx = setupTestEnvironment(this.fullTitle())

      checkAppExits(ctx, '--css')

      checkMessage(ctx, '--css', { runRaw: true })

      it('should print argument missing', function (done) {
        runRaw(ctx.dir, ['--css'], function (err, code, stdout, stderr) {
          if (err) {
            return done(err)
          }
          assert.ok(/error: option .* argument missing/.test(stderr))
          done()
        })
      })
    })

    describe('less', function () {
      const ctx = setupTestEnvironment(this.fullTitle())

      it('should create basic app with less files', function (done) {
        run(ctx.dir, ['--css', 'less'], function (err, stdout) {
          if (err) {
            return done(err)
          }
          ctx.files = utils.parseCreatedFiles(stdout, ctx.dir)
          assert.strictEqual(ctx.files.length, 16, 'should have 16 files')
          done()
        })
      })

      checkBasicFiles(ctx)

      it('should have less files', function () {
        assert.notStrictEqual(
          ctx.files.indexOf('public/stylesheets/style.less'),
          -1,
          'should have style.less file'
        )
      })

      it('should have installable dependencies', function (done) {
        this.timeout(NPM_INSTALL_TIMEOUT)
        npmInstall(ctx.dir, done)
      })

      describe('npm start', function () {
        before('start app', function () {
          this.app = new AppRunner(ctx.dir)
        })

        after('stop app', function (done) {
          this.timeout(APP_START_STOP_TIMEOUT)
          this.app.stop(done)
        })

        it('should start app', function (done) {
          this.timeout(APP_START_STOP_TIMEOUT)
          this.app.start(done)
        })

        it('should respond to HTTP request', function (done) {
          request(this.app)
            .get('/')
            .expect(200, /<title>Express<\/title>/, done)
        })

        it('should respond with stylesheet', function (done) {
          request(this.app)
            .get('/stylesheets/style.css')
            .expect(200, /sans-serif/, done)
        })
      })
    })

    describe('sass', function () {
      const ctx = setupTestEnvironment(this.fullTitle())

      it('should create basic app with sass files', function (done) {
        run(ctx.dir, ['--css', 'sass'], function (err, stdout) {
          if (err) {
            return done(err)
          }
          ctx.files = utils.parseCreatedFiles(stdout, ctx.dir)
          assert.strictEqual(ctx.files.length, 16, 'should have 16 files')
          done()
        })
      })

      checkBasicFiles(ctx)

      it('should have sass files', function () {
        assert.notStrictEqual(
          ctx.files.indexOf('public/stylesheets/style.sass'),
          -1,
          'should have style.sass file'
        )
      })

      it('should have installable dependencies', function (done) {
        this.timeout(NPM_INSTALL_TIMEOUT)
        npmInstall(ctx.dir, done)
      })

      describe('npm start', function () {
        before('start app', function () {
          this.app = new AppRunner(ctx.dir)
        })

        after('stop app', function (done) {
          this.timeout(APP_START_STOP_TIMEOUT)
          this.app.stop(done)
        })

        it('should start app', function (done) {
          this.timeout(APP_START_STOP_TIMEOUT)
          this.app.start(done)
        })

        it('should respond to HTTP request', function (done) {
          request(this.app)
            .get('/')
            .expect(200, /<title>Express<\/title>/, done)
        })

        it('should respond with stylesheet', function (done) {
          request(this.app)
            .get('/stylesheets/style.css')
            .expect(200, /sans-serif/, done)
        })
      })
    })

    describe('stylus', function () {
      const ctx = setupTestEnvironment(this.fullTitle())

      it('should create basic app with stylus files', function (done) {
        run(ctx.dir, ['--css', 'stylus'], function (err, stdout) {
          if (err) {
            return done(err)
          }
          ctx.files = utils.parseCreatedFiles(stdout, ctx.dir)
          assert.strictEqual(ctx.files.length, 16, 'should have 16 files')
          done()
        })
      })

      checkBasicFiles(ctx)

      it('should have stylus files', function () {
        assert.notStrictEqual(
          ctx.files.indexOf('public/stylesheets/style.styl'),
          -1,
          'should have style.styl file'
        )
      })

      it('should have installable dependencies', function (done) {
        this.timeout(NPM_INSTALL_TIMEOUT)
        npmInstall(ctx.dir, done)
      })

      describe('npm start', function () {
        before('start app', function () {
          this.app = new AppRunner(ctx.dir)
        })

        after('stop app', function (done) {
          this.timeout(APP_START_STOP_TIMEOUT)
          this.app.stop(done)
        })

        it('should start app', function (done) {
          this.timeout(APP_START_STOP_TIMEOUT)
          this.app.start(done)
        })

        it('should respond to HTTP request', function (done) {
          request(this.app)
            .get('/')
            .expect(200, /<title>Express<\/title>/, done)
        })

        it('should respond with stylesheet', function (done) {
          request(this.app)
            .get('/stylesheets/style.css')
            .expect(200, /sans-serif/, done)
        })
      })
    })
  })

  describe('--ejs', function () {
    const ctx = setupTestEnvironment(this.fullTitle())

    it('should create basic app with ejs templates', function (done) {
      run(ctx.dir, ['--ejs'], function (err, stdout) {
        if (err) {
          return done(err)
        }
        ctx.files = utils.parseCreatedFiles(stdout, ctx.dir)
        assert.strictEqual(ctx.files.length, 15, 'should have 15 files')
        done()
      })
    })

    checkBasicFiles(ctx)

    it('should have ejs templates', function () {
      assert.notStrictEqual(
        ctx.files.indexOf('views/error.ejs'),
        -1,
        'should have views/error.ejs file'
      )
      assert.notStrictEqual(
        ctx.files.indexOf('views/index.ejs'),
        -1,
        'should have views/index.ejs file'
      )
    })
  })

  describe('--git', function () {
    const ctx = setupTestEnvironment(this.fullTitle())

    it('should create basic app with git files', function (done) {
      run(ctx.dir, ['--git'], function (err, stdout) {
        if (err) {
          return done(err)
        }
        ctx.files = utils.parseCreatedFiles(stdout, ctx.dir)
        assert.strictEqual(ctx.files.length, 17, 'should have 17 files')
        done()
      })
    })

    checkBasicFiles(ctx)

    it('should have .gitignore', function () {
      assert.notStrictEqual(
        ctx.files.indexOf('.gitignore'),
        -1,
        'should have .gitignore file'
      )
    })

    it('should have jade templates', function () {
      assert.notStrictEqual(ctx.files.indexOf('views/error.jade'), -1)
      assert.notStrictEqual(ctx.files.indexOf('views/index.jade'), -1)
      assert.notStrictEqual(ctx.files.indexOf('views/layout.jade'), -1)
    })
  })

  describe('-h', function () {
    const ctx = setupTestEnvironment(this.fullTitle())

    checkMessage(ctx, '-h', { numFiles: 0 })
  })

  describe('--hbs', function () {
    const ctx = setupTestEnvironment(this.fullTitle())

    it('should create basic app with hbs templates', function (done) {
      run(ctx.dir, ['--hbs'], function (err, stdout) {
        if (err) {
          return done(err)
        }
        ctx.files = utils.parseCreatedFiles(stdout, ctx.dir)
        assert.strictEqual(ctx.files.length, 16)
        done()
      })
    })

    checkBasicFiles(ctx)

    it('should have hbs in package dependencies', function () {
      const file = path.resolve(ctx.dir, 'package.json')
      const contents = fs.readFileSync(file, 'utf8')
      const dependencies = JSON.parse(contents).dependencies
      assert.ok(typeof dependencies.hbs === 'string')
    })

    it('should have hbs templates', function () {
      assert.notStrictEqual(ctx.files.indexOf('views/error.hbs'), -1)
      assert.notStrictEqual(ctx.files.indexOf('views/index.hbs'), -1)
      assert.notStrictEqual(ctx.files.indexOf('views/layout.hbs'), -1)
    })
  })

  describe('--help', function () {
    const ctx = setupTestEnvironment(this.fullTitle())

    checkMessage(ctx, '--help', { numFiles: 0 })
  })

  describe('--hogan', function () {
    const ctx = setupTestEnvironment(this.fullTitle())

    it('should create basic app with hogan templates', function (done) {
      run(ctx.dir, ['--hogan'], function (err, stdout) {
        if (err) {
          return done(err)
        }
        ctx.files = utils.parseCreatedFiles(stdout, ctx.dir)
        assert.strictEqual(ctx.files.length, 15)
        done()
      })
    })

    checkBasicFiles(ctx)

    it('should have hjs in package dependencies', function () {
      const file = path.resolve(ctx.dir, 'package.json')
      const contents = fs.readFileSync(file, 'utf8')
      const dependencies = JSON.parse(contents).dependencies
      assert.ok(typeof dependencies.hjs === 'string')
    })

    it('should have hjs templates', function () {
      assert.notStrictEqual(ctx.files.indexOf('views/error.hjs'), -1)
      assert.notStrictEqual(ctx.files.indexOf('views/index.hjs'), -1)
    })
  })

  describe('--no-view', function () {
    const ctx = setupTestEnvironment(this.fullTitle())

    it('should create basic app without view engine', function (done) {
      run(ctx.dir, ['--no-view'], function (err, stdout) {
        if (err) {
          return done(err)
        }
        ctx.files = utils.parseCreatedFiles(stdout, ctx.dir)
        assert.strictEqual(ctx.files.length, 13)
        done()
      })
    })

    checkBasicFiles(ctx)

    it('should not have views directory', function () {
      assert.strictEqual(ctx.files.indexOf('views'), -1)
    })

    it('should have installable dependencies', function (done) {
      this.timeout(NPM_INSTALL_TIMEOUT)
      npmInstall(ctx.dir, done)
    })

    describe('npm start', function () {
      before('start app', function () {
        this.app = new AppRunner(ctx.dir)
      })

      after('stop app', function (done) {
        this.timeout(APP_START_STOP_TIMEOUT)
        this.app.stop(done)
      })

      it('should start app', function (done) {
        this.timeout(APP_START_STOP_TIMEOUT)
        this.app.start(done)
      })

      it('should respond to HTTP request', function (done) {
        request(this.app)
          .get('/')
          .expect(200, /<title>Express<\/title>/, done)
      })

      it('should generate a 404', function (done) {
        request(this.app)
          .get('/does_not_exist')
          .expect(404, /Cannot GET \/does_not_exist/, done)
      })
    })
  })

  describe('--pug', function () {
    const ctx = setupTestEnvironment(this.fullTitle())

    it('should create basic app with pug templates', function (done) {
      run(ctx.dir, ['--pug'], function (err, stdout) {
        if (err) {
          return done(err)
        }
        ctx.files = utils.parseCreatedFiles(stdout, ctx.dir)
        assert.strictEqual(ctx.files.length, 16)
        done()
      })
    })

    checkBasicFiles(ctx)

    it('should have pug in package dependencies', function () {
      const file = path.resolve(ctx.dir, 'package.json')
      const contents = fs.readFileSync(file, 'utf8')
      const dependencies = JSON.parse(contents).dependencies
      assert.ok(typeof dependencies.pug === 'string')
    })

    it('should have pug templates', function () {
      assert.notStrictEqual(ctx.files.indexOf('views/error.pug'), -1)
      assert.notStrictEqual(ctx.files.indexOf('views/index.pug'), -1)
      assert.notStrictEqual(ctx.files.indexOf('views/layout.pug'), -1)
    })
  })

  describe('--view <engine>', function () {
    describe('(no engine)', function () {
      const ctx = setupTestEnvironment(this.fullTitle())

      checkAppExits(ctx, '--view')

      checkMessage(ctx, '--view', { runRaw: true })

      it('should print argument missing', function (done) {
        runRaw(ctx.dir, ['--view'], function (err, code, stdout, stderr) {
          if (err) {
            return done(err)
          }
          assert.ok(/error: option .* argument missing/.test(stderr))
          done()
        })
      })
    })

    describe('dust', function () {
      const ctx = setupTestEnvironment(this.fullTitle())

      it('should create basic app with dust templates', function (done) {
        run(ctx.dir, ['--view', 'dust'], function (err, stdout) {
          if (err) {
            return done(err)
          }
          ctx.files = utils.parseCreatedFiles(stdout, ctx.dir)
          assert.strictEqual(ctx.files.length, 15, 'should have 15 files')
          done()
        })
      })

      checkBasicFiles(ctx)

      it('should have dust templates', function () {
        assert.notStrictEqual(
          ctx.files.indexOf('views/error.dust'),
          -1,
          'should have views/error.dust file'
        )
        assert.notStrictEqual(
          ctx.files.indexOf('views/index.dust'),
          -1,
          'should have views/index.dust file'
        )
      })

      it('should have installable dependencies', function (done) {
        this.timeout(NPM_INSTALL_TIMEOUT)
        npmInstall(ctx.dir, done)
      })

      checkAppStart(ctx)
    })

    describe('ejs', function () {
      const ctx = setupTestEnvironment(this.fullTitle())

      it('should create basic app with ejs templates', function (done) {
        run(ctx.dir, ['--view', 'ejs'], function (err, stdout) {
          if (err) {
            return done(err)
          }
          ctx.files = utils.parseCreatedFiles(stdout, ctx.dir)
          assert.strictEqual(ctx.files.length, 15, 'should have 15 files')
          done()
        })
      })

      checkBasicFiles(ctx)

      it('should have ejs templates', function () {
        assert.notStrictEqual(
          ctx.files.indexOf('views/error.ejs'),
          -1,
          'should have views/error.ejs file'
        )
        assert.notStrictEqual(
          ctx.files.indexOf('views/index.ejs'),
          -1,
          'should have views/index.ejs file'
        )
      })

      it('should have installable dependencies', function (done) {
        this.timeout(NPM_INSTALL_TIMEOUT)
        npmInstall(ctx.dir, done)
      })

      checkAppStart(ctx)
    })

    describe('hbs', function () {
      const ctx = setupTestEnvironment(this.fullTitle())

      it('should create basic app with hbs templates', function (done) {
        run(ctx.dir, ['--view', 'hbs'], function (err, stdout) {
          if (err) {
            return done(err)
          }
          ctx.files = utils.parseCreatedFiles(stdout, ctx.dir)
          assert.strictEqual(ctx.files.length, 16)
          done()
        })
      })

      checkBasicFiles(ctx)

      it('should have hbs in package dependencies', function () {
        const file = path.resolve(ctx.dir, 'package.json')
        const contents = fs.readFileSync(file, 'utf8')
        const dependencies = JSON.parse(contents).dependencies
        assert.ok(typeof dependencies.hbs === 'string')
      })

      it('should have hbs templates', function () {
        assert.notStrictEqual(ctx.files.indexOf('views/error.hbs'), -1)
        assert.notStrictEqual(ctx.files.indexOf('views/index.hbs'), -1)
        assert.notStrictEqual(ctx.files.indexOf('views/layout.hbs'), -1)
      })

      it('should have installable dependencies', function (done) {
        this.timeout(NPM_INSTALL_TIMEOUT)
        npmInstall(ctx.dir, done)
      })

      checkAppStart(ctx)
    })

    describe('hjs', function () {
      const ctx = setupTestEnvironment(this.fullTitle())

      it('should create basic app with hogan templates', function (done) {
        run(ctx.dir, ['--view', 'hjs'], function (err, stdout) {
          if (err) {
            return done(err)
          }
          ctx.files = utils.parseCreatedFiles(stdout, ctx.dir)
          assert.strictEqual(ctx.files.length, 15)
          done()
        })
      })

      checkBasicFiles(ctx)

      it('should have hjs in package dependencies', function () {
        const file = path.resolve(ctx.dir, 'package.json')
        const contents = fs.readFileSync(file, 'utf8')
        const dependencies = JSON.parse(contents).dependencies
        assert.ok(typeof dependencies.hjs === 'string')
      })

      it('should have hjs templates', function () {
        assert.notStrictEqual(ctx.files.indexOf('views/error.hjs'), -1)
        assert.notStrictEqual(ctx.files.indexOf('views/index.hjs'), -1)
      })

      it('should have installable dependencies', function (done) {
        this.timeout(NPM_INSTALL_TIMEOUT)
        npmInstall(ctx.dir, done)
      })

      checkAppStart(ctx)
    })

    describe('pug', function () {
      const ctx = setupTestEnvironment(this.fullTitle())

      it('should create basic app with pug templates', function (done) {
        run(ctx.dir, ['--view', 'pug'], function (err, stdout) {
          if (err) {
            return done(err)
          }
          ctx.files = utils.parseCreatedFiles(stdout, ctx.dir)
          assert.strictEqual(ctx.files.length, 16)
          done()
        })
      })

      checkBasicFiles(ctx)

      it('should have pug in package dependencies', function () {
        const file = path.resolve(ctx.dir, 'package.json')
        const contents = fs.readFileSync(file, 'utf8')
        const dependencies = JSON.parse(contents).dependencies
        assert.ok(typeof dependencies.pug === 'string')
      })

      it('should have pug templates', function () {
        assert.notStrictEqual(ctx.files.indexOf('views/error.pug'), -1)
        assert.notStrictEqual(ctx.files.indexOf('views/index.pug'), -1)
        assert.notStrictEqual(ctx.files.indexOf('views/layout.pug'), -1)
      })

      it('should have installable dependencies', function (done) {
        this.timeout(NPM_INSTALL_TIMEOUT)
        npmInstall(ctx.dir, done)
      })

      checkAppStart(ctx)
    })

    describe('twig', function () {
      const ctx = setupTestEnvironment(this.fullTitle())

      it('should create basic app with twig templates', function (done) {
        run(ctx.dir, ['--view', 'twig'], function (err, stdout) {
          if (err) {
            return done(err)
          }
          ctx.files = utils.parseCreatedFiles(stdout, ctx.dir)
          assert.strictEqual(ctx.files.length, 16)
          done()
        })
      })

      checkBasicFiles(ctx)

      it('should have twig in package dependencies', function () {
        const file = path.resolve(ctx.dir, 'package.json')
        const contents = fs.readFileSync(file, 'utf8')
        const dependencies = JSON.parse(contents).dependencies
        assert.ok(typeof dependencies.twig === 'string')
      })

      it('should have twig templates', function () {
        assert.notStrictEqual(ctx.files.indexOf('views/error.twig'), -1)
        assert.notStrictEqual(ctx.files.indexOf('views/index.twig'), -1)
        assert.notStrictEqual(ctx.files.indexOf('views/layout.twig'), -1)
      })

      it('should have installable dependencies', function (done) {
        this.timeout(NPM_INSTALL_TIMEOUT)
        npmInstall(ctx.dir, done)
      })

      checkAppStart(ctx)
    })

    describe('vash', function () {
      const ctx = setupTestEnvironment(this.fullTitle())

      it('should create basic app with vash templates', function (done) {
        run(ctx.dir, ['--view', 'vash'], function (err, stdout) {
          if (err) {
            return done(err)
          }
          ctx.files = utils.parseCreatedFiles(stdout, ctx.dir)
          assert.strictEqual(ctx.files.length, 16)
          done()
        })
      })

      checkBasicFiles(ctx)

      it('should have vash in package dependencies', function () {
        const file = path.resolve(ctx.dir, 'package.json')
        const contents = fs.readFileSync(file, 'utf8')
        const dependencies = JSON.parse(contents).dependencies
        assert.ok(typeof dependencies.vash === 'string')
      })

      it('should have vash templates', function () {
        assert.notStrictEqual(ctx.files.indexOf('views/error.vash'), -1)
        assert.notStrictEqual(ctx.files.indexOf('views/index.vash'), -1)
        assert.notStrictEqual(ctx.files.indexOf('views/layout.vash'), -1)
      })

      it('should have installable dependencies', function (done) {
        this.timeout(NPM_INSTALL_TIMEOUT)
        npmInstall(ctx.dir, done)
      })

      checkAppStart(ctx)
    })
  })
})

function npmInstall (dir, callback) {
  const env = utils.childEnvironment()

  exec('npm install', { cwd: dir, env: env }, function (err, stderr) {
    if (err) {
      err.message += stderr
      callback(err)
      return
    }

    callback()
  })
}

function run (dir, args, callback) {
  runRaw(dir, args, function (err, code, stdout, stderr) {
    if (err) {
      return callback(err)
    }

    process.stderr.write(utils.stripWarnings(stderr))

    try {
      assert.strictEqual(utils.stripWarnings(stderr), '')
      assert.strictEqual(code, 0)
    } catch (e) {
      return callback(e)
    }

    callback(null, utils.stripColors(stdout))
  })
}

function runRaw (dir, args, callback) {
  const argv = [BIN_PATH].concat(args)
  const binp = process.argv[0]
  let stderr = ''
  let stdout = ''

  const child = spawn(binp, argv, {
    cwd: dir
  })

  child.stdout.setEncoding('utf8')
  child.stdout.on('data', function ondata (str) {
    stdout += str
  })
  child.stderr.setEncoding('utf8')
  child.stderr.on('data', function ondata (str) {
    stderr += str
  })

  child.on('close', onclose)
  child.on('error', callback)

  function onclose (code) {
    callback(null, code, stdout, stderr)
  }
}

function setupTestEnvironment (name) {
  const ctx = {}

  before('create environment', function (done) {
    ctx.dir = path.join(TEMP_DIR, name.replace(/[<>]/g, ''))
    mkdirp(ctx.dir, done)
  })

  after('cleanup environment', function (done) {
    this.timeout(30000)
    rimraf(ctx.dir, done)
  })

  return ctx
}

function checkAppExits (ctx, arg) {
  it('should exit with code 1', function (done) {
    // eslint-disable-next-line no-unused-vars
    runRaw(ctx.dir, [arg], function (err, code, stdout, stderr) {
      if (err) {
        return done(err)
      }
      assert.strictEqual(code, 1)
      done()
    })
  })
}

function checkMessage (ctx, arg, options = {}) {
  it('should print usage', function (done) {
    if (options.runRaw) {
      runRaw(ctx.dir, [arg], function (err, code, stdout, stderr) {
        if (err) {
          return done(err)
        }
        checkMessageContent(ctx, { stdout, stderr }, options)
        done()
      })
    } else {
      run(ctx.dir, [arg], function (err, stdout) {
        if (err) {
          return done(err)
        }
        checkMessageContent(ctx, { stdout }, options)
        done()
      })
    }
  })
}

function checkMessageContent (ctx, { stdout, stderr }, { isUnknownArg = false, expectedFileNum = null }) {
  if (expectedFileNum) {
    const files = utils.parseCreatedFiles(stdout, ctx.dir)
    assert.strictEqual(files.length, expectedFileNum)
  }
  assert.ok(/Usage: express /.test(stdout))
  assert.ok(/--help/.test(stdout))
  assert.ok(/--version/.test(stdout))
  if (isUnknownArg) {
    assert.ok(/error: unknown option/.test(stderr))
  }
}

function checkBasicFiles (ctx) {
  it('should have basic files', function () {
    assert.notStrictEqual(ctx.files.indexOf('bin/www'), -1)
    assert.notStrictEqual(ctx.files.indexOf('app.js'), -1)
    assert.notStrictEqual(ctx.files.indexOf('package.json'), -1)
  })
}

function checkAppStart (ctx) {
  describe('npm start', function () {
    before('start app', function () {
      this.app = new AppRunner(ctx.dir)
    })

    after('stop app', function (done) {
      this.timeout(APP_START_STOP_TIMEOUT)
      this.app.stop(done)
    })

    it('should start app', function (done) {
      this.timeout(APP_START_STOP_TIMEOUT)
      this.app.start(done)
    })

    it('should respond to HTTP request', function (done) {
      request(this.app)
        .get('/')
        .expect(200, /<title>Express<\/title>/, done)
    })

    it('should generate a 404', function (done) {
      request(this.app)
        .get('/does_not_exist')
        .expect(404, /<h1>Not Found<\/h1>/, done)
    })
  })
}
