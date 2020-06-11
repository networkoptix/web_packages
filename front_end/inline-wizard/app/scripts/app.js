'use strict';

angular.module('webInlineWizard', [
    'ngResource',
    'ngSanitize',
    'ngRoute',
    'ui.bootstrap',
    'ngStorage'
]).config(['$httpProvider', function ($httpProvider) {
    $httpProvider.defaults.xsrfCookieName = 'x-runtime-guid';
    $httpProvider.defaults.xsrfHeaderName = 'X-Runtime-Guid';
}]).config(['$routeProvider', function ($routeProvider) {
    $routeProvider
        .when('/setup', {
            templateUrl: Config.viewsDir + 'dialogs/setup-inline.html',
            controller: 'SetupCtrl'
        })
        .otherwise({
            redirectTo: '/setup'
        });
}]);
