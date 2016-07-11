var config = require('./wdio.conf.js').config
config.capabilities = [
  {
    browserName: 'internet explorer',
    maxInstances: 1,
    'platform': 'Windows 7',
    'version': '9.0'
  },
  {
    browserName: 'Safari',
    maxInstances: 1,
    'platformName': 'iOS',
    'deviceName': 'iPhone 5s',
    'platformVersion': '8.4'
  }
]

config.specs = [
  './e2e_test/**/*.failsafe.js'
]

exports.config = config
