var Opbeat = require('./opbeat')
var utils = require('./instrumentation/utils')
var logger = require('./lib/logger')

function ngOpbeatProvider () {
  this.config = function config (properties) {
    Opbeat.config(properties)
  }

  this.install = function install () {
    Opbeat.install()
  }

  this.$get = [function () {
    return {
      captureException: function captureException (exception, cause) {
        Opbeat.captureException(exception, cause)
      },

      setUserContext: function setUser (user) {
        Opbeat.setUserContext(user)
      },

      setExtraContext: function setExtraContext (data) {
        Opbeat.setExtraContext(data)
      }
    }
  }]
}

function $opbeatErrorProvider ($provide) {
  $provide.decorator('$exceptionHandler', ['$delegate', '$opbeat', function $ExceptionHandlerDecorator ($delegate, $opbeat) {
    return function $ExceptionHandler (exception, cause) {
      $opbeat.captureException(exception)
      return $delegate(exception, cause)
    }
  }])
}

function $opbeatInstrumentationProvider ($provide) {

  // Route controller Instrumentation
  $provide.decorator('$controller', function ($delegate, $location, $rootScope) {
    $rootScope._opbeatTransactions = {}

    var onRouteChange = function(e, current) {
      var routeControllerTarget = current.controller
      logger.log('opbeat.decorator.controller.onRouteChange')
      var transaction = $rootScope._opbeatTransactions[$location.absUrl()]
      if (!transaction) {
        transaction = Opbeat.startTransaction('app.angular.controller.' + routeControllerTarget, 'transaction')
        transaction.metadata.controllerName = routeControllerTarget

        $rootScope._opbeatTransactions[$location.absUrl()] = transaction
      }

    }

    $rootScope.$on('$routeChangeStart', onRouteChange) // ng-router
    $rootScope.$on('$stateChangeSuccess', onRouteChange) // ui-router

    return function () {
      logger.log('opbeat.decorator.controller.ctor')

      var args = Array.prototype.slice.call(arguments)
      var transaction = $rootScope._opbeatTransactions[$location.absUrl()]
      var controllerInfo = utils.getControllerInfoFromArgs(args)
      var controllerName = controllerInfo.name
      var controllerScope = controllerInfo.scope
      var isRouteController = controllerName && transaction && transaction.metadata.controllerName === controllerName

      var result = $delegate.apply(this, args)

      if (isRouteController && controllerScope) {
        logger.log('opbeat.angular.controller', controllerName)

        // Instrument controller scope functions
        utils.getObjectFunctions(controllerScope).forEach(function (funcScope) {
          utils.instrumentMethod(funcScope.scope, funcScope.property, transaction, 'app.angular.controller', {
            override: true
          })
        })

        controllerScope.$on('$destroy', function () {
          logger.log('opbeat.angular.controller.destroy')
        })

        controllerScope.$on('$viewContentLoaded', function (event) {

          logger.log('opbeat.angular.controller.$viewContentLoaded')

          // Transaction clean up
          transaction.end()
          $rootScope._opbeatTransactions[$location.absUrl()] = null

          if (controllerScope) {
            // Uninstrument controller scope functions
            utils.getObjectFunctions(controllerScope).forEach(function (funcScope) {
              utils.uninstrumentMethod(funcScope.scope, funcScope.property)
            })
          }

        })
      }

      logger.log('opbeat.decorator.controller.end')
      return result
    }
  })

  // Controller Instrumentation
  $provide.decorator('$controller', function ($delegate, $injector) {

    return function () {
      var $rootScope = $injector.get('$rootScope')
      var $location = $injector.get('$location')

      var args = Array.prototype.slice.call(arguments)
      var controllerInfo = utils.getControllerInfoFromArgs(args)
      var transaction = $rootScope._opbeatTransactions && $rootScope._opbeatTransactions[$location.absUrl()]

      if (controllerInfo.name) {
        if (transaction && transaction.metadata.controllerName !== controllerInfo.name) {
          return utils.instrumentModule($delegate, $injector, {
            type: 'template.angular.controller',
            prefix: 'controller.' + controllerInfo.name
          }).apply(this, arguments)
        }
      }

      return $delegate.apply(this, args)
    }

  })

  // Template Compile Instrumentation
  $provide.decorator('$compile', function ($delegate, $injector) {
    return utils.instrumentModule($delegate, $injector, {
      type: 'template.angular.$compile',
      prefix: '$compile'
    })
  })

  // Template Request Instrumentation
  $provide.decorator('$templateRequest', function ($delegate, $injector) {
    return utils.instrumentModule($delegate, $injector, {
      type: 'template.angular.request',
      prefix: '$templateRequest'
    })
  })

  // HTTP Instrumentation
  $provide.decorator('$http', function ($delegate, $injector) {
    return utils.instrumentModule($delegate, $injector, {
      type: 'ext.http.request',
      prefix: 'angular.$http',
      signatureFormatter: function(key, args) {
        return key.toUpperCase() + ' ' + args[0]
      }
    })
  })

  // Core directive instrumentation
  var coreDirectives = ['ngBind', 'ngClass', 'ngModel', 'ngIf', 'ngInclude', 'ngRepeat', 'ngSrc', 'ngStyle', 'ngSwitch', 'ngTransclude']
  coreDirectives.forEach(function(name) {
    var directiveName = name + 'Directive'
    $provide.decorator(directiveName, function ($delegate, $injector) {
      utils.instrumentObject($delegate[0], $injector, {
        type: 'template.angular.directive',
        prefix: directiveName
      })
      return $delegate
    })
  })

}

window.angular.module('ngOpbeat', [])
  .provider('$opbeat', ngOpbeatProvider)
  .config(['$provide', $opbeatErrorProvider])
  .config(['$provide', $opbeatInstrumentationProvider])

window.angular.module('angular-opbeat', ['ngOpbeat'])
