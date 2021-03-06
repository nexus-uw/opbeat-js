function setup () {
  if (!window.console) {
    window.console = {}
  }
  if (!console.log) {
    console.log = function () {}
  }

  function logError (e) {
    console.log(e)
  }

  var utils = {
    loadDependencies: function loadDependencies (dependencies, callback) {
      var promises = dependencies.map(function (d) {
        return System.import(d)
      })

      return Promise.all(promises).then(function (modules) {
        console.log('Dependencies resolved.')
        callback(modules)
        return modules
      }, logError)
    },
    loadFixture: function loadFixture (fixtureUrl) {
      console.log('Loading fixture')
      var p = System.import(fixtureUrl).then(function () {}, logError)
      return p
    },
    runFixture: function runFixture (path, deps, options) {
      var div = document.createElement('div')
      if (options.useNgApp) {
        div.setAttribute('ng-app', options.appName)
        window.name = 'NG_DEFER_BOOTSTRAP!' + window.name
      }

      if (options.uiRouter) {
        div.innerHTML = '<div ui-view></div>'
      } else {
        div.innerHTML = '<div ng-view></div>'
      }
      document.body.appendChild(div)
      System.import(path).then(function (module) {
        utils.loadDependencies(deps, function (modules) {
          if (options.beforeInit) {
            options.beforeInit(module, modules)
          } else {
            module.init(options.opbeatConfig)
          }
          if (options.useNgApp) {
            window.angular.resumeBootstrap()
          } else {
            module.bootstrap(document)
          }
        })
      })
    },
    getNextTransaction: function getNextTransaction (cb) {
      var cancelFn = window.e2e.transactionService.subscribe(function (tr) {
        cb(tr)
        cancelFn()
      })
    }
  }

  window.loadDependencies = utils.loadDependencies
  window.loadFixture = utils.loadFixture
  window.getNextTransaction = utils.getNextTransaction
  window.runFixture = utils.runFixture

  // window.__httpInterceptor = {
  //   requests: []
  // }
  // var _XHR = window.XMLHttpRequest
  // window.XMLHttpRequest = function () {
  //   var xhr = new _XHR()
  //   var originalOpen = xhr.open
  //   var lastMethod
  //   var lastURL
  //   xhr.open = function () {
  //     lastMethod = arguments[0]
  //     lastURL = arguments[1]
  //     originalOpen.apply(xhr, arguments)
  //   }

  //   // var originalSend = xhr.send
  //   // xhr.send = function(){
  //   //   return originalSend.apply(xhr, arguments)
  //   // }

//   xhr.addEventListener('load', function () {
//     window.__httpInterceptor.requests.push({
//       requestedMethod: lastMethod.toUpperCase(),
//       requestedURL: lastURL,
//       xhr: this
//     })
//   })
//   return xhr
// }
}

setup()
