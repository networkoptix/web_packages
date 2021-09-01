'use strict';

angular.module('webadminApp', [
    'nxCommon',
    'ngResource',
    'ngSanitize',
    'ngRoute',
    'ui.bootstrap',
    'ngStorage'
]).config(['$httpProvider', function ($httpProvider) {
    $httpProvider.defaults.xsrfCookieName = 'x-runtime-guid';
    $httpProvider.defaults.xsrfHeaderName = 'X-Runtime-Guid';
}]).config(['$routeProvider', '$locationProvider', function ($routeProvider, $locationProvider) {

    var universalResolves = {
        currentUser: ['mediaserver',function(mediaserver){
            return mediaserver.resolveNewSystemAndUser();
        }]
    };

    var customRouteProvider = angular.extend({}, $routeProvider, {
        when: function(path, route) {
            route.resolve = (route.resolve) ? route.resolve : {};
            angular.extend(route.resolve, universalResolves);
            $routeProvider.when(path, route);
            return this;
        },
        otherwise:function(route){
            $routeProvider.otherwise( route);
        }
    });

    $locationProvider.html5Mode(true);
    $locationProvider.hashPrefix('');

    customRouteProvider
        .otherwise({
            templateUrl: Config.viewsDir + 'view.html',
            reloadOnSearch: false,
            resolve: {
                test: ['mediaserver', function (mediaserver) {
                    mediaserver.getUser(true);
                }]
            }
        });
}]);
