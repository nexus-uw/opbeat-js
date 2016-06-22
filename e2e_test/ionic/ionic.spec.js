var utils = require('../e2e/utils')

describe('Ionic Blank App', function () {
  it('should load the correct version of ionic', function (done) {
    browser.url('/ionic/www/index.html').execute(function () {
      if (window.ionic) {
        return window.ionic.version
      }
      else {
        return 'none'
      }
    }).then(function (response) {
      console.log('Ionic version: ' + response.value)

      expect(response.value).toBe('1.3.1')

      done()
    })
  })

  xit('should be properly configured for ionic', function(done) {
    //browser.url('/ionic/www/index.html').
  })
})
