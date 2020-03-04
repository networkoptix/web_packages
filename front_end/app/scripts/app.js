angular.module('cloudApp.services', []);
angular.module('cloudApp.controllers', []);
angular.module('cloudApp.directives', []);
angular.module('cloudApp.components', []);
angular.module('cloudApp.animations', []);
angular.module('cloudApp.filters', []);
angular.module('cloudApp.constants', []);
angular.module('cloudApp.templates', []);

window.Config = {};
window.L = {};

(function () {

    'use strict';
    angular
        .module('cloudApp', [
            'ngCookies',
            'ngResource',
            'ngSanitize',
            'ngRoute',
            'ngStorage',
            'base64',
            'nxCommon',
            'angular-clipboard',

            // cloudApp modules
            'cloudApp.animations',
            'cloudApp.controllers',
            'cloudApp.services',
            'cloudApp.directives',
            'cloudApp.filters',
            'cloudApp.constants',
            'cloudApp.templates'

        ])
        .factory('httpResponseInterceptor', ['$q', '$rootScope',
            function($q, $rootScope, nxAccountServiceProvider) {
                return {
                    responseError: function(error) {
                        if (error.status === 401 && nxAccountServiceProvider && nxAccountServiceProvider.loginState !== undefined) {
                            // Session expired - try to trigger browser reload
                            nxAccountServiceProvider.clearLoginState();
                        }
                        return $q.reject(error);
                    }
                };
        }])
        .config(['$httpProvider', function ($httpProvider) {
            $httpProvider.defaults.xsrfCookieName = 'csrftoken';
            $httpProvider.defaults.xsrfHeaderName = 'X-CSRFToken';
            $httpProvider.interceptors.push('httpResponseInterceptor');
        }])
        .config(['$routeProvider', '$locationProvider', '$compileProvider',
            'languageServiceProvider', 'nxConfigServiceProvider',
            function ($routeProvider, $locationProvider, $compileProvider,
                      languageServiceProvider, nxConfigServiceProvider) {

                if (!PRODUCTION) {
                    $compileProvider.debugInfoEnabled(true);
                }

                $locationProvider.html5Mode(true);

                if (!window.SETTINGS) {
                    if (PRODUCTION && error.status >= 500) {
                        window.location.href = '/static/503.html';
                    } else if (PRODUCTION) {
                        window.location.href = '/';
                    }

                    return;
                }

                var CONFIG = nxConfigServiceProvider.$get().getConfig();
                
                if (window.LANG.ajs) {
                    languageServiceProvider.setLanguage(window.LANG.ajs);
                    // set local variables as providers cannot get values in config phase
                    // viewsDir, previewPath, viewsDirCommon and showHeaderAndFooter initialization
                    // is moved to A8 app component
                } else {
                    // Fallback to default language

                    // if request to api/utils/language fails then
                    // cloud_portal is under maintenance
                    // TODO: Causes IOS to not load sometimes but not sure why
                    if (PRODUCTION && error.status >= 500) {
                        window.location.href = '/static/503.html';
                    } else if (PRODUCTION) {
                        window.location.href = '/';
                    }

                    $.ajax({
                            url: 'static/language.json',
                            async: false,
                            dataType: 'json'
                        })
                        .done(function (response) {
                            languageServiceProvider.setLanguage(response);
                        });
                }
                
                var lang = languageServiceProvider.$get().lang;

                // For compatibility with legacy modules *****
                window.L = lang;
                window.Config = CONFIG;
                // *******************************************

                $routeProvider
                    .when('/register/success', {
                        template: ''
                    })
                    .when('/register/successActivated', {
                        template: ''
                    })
                    .when('/register/:code', {
                        template: ''
                    })
                    .when('/register', {
                        template: ''
                    })
                    .when('/account/password', {
                        template: ''
                    })
                    .when('/account', {
                        template: ''
                    })
                    .when('/systems/:systemId/users', {
                        template: ''
                    })
                    .when('/systems/:systemId/users/:userId', {
                        template: ''
                    })
                    .when('/systems/:systemId/view', {
                        templateUrl: CONFIG.viewsDir + 'view.html',
                        controller: 'ViewPageCtrl',
                        resolve: {
                            embed: function () {
                                return false;
                            }
                        }
                    })
                    .when('/systems/:systemId/view/:cameraId', {
                        templateUrl: CONFIG.viewsDir + 'view.html',
                        controller: 'ViewPageCtrl',
                        resolve: {
                            embed: function () {
                                return false;
                            }
                        }
                    })
                    .when('/systems/:systemId/health', {
                        template: ''
                    })
                    .when('/systems/:systemId/health/alerts', {
                        template: ''
                    })
                    .when('/systems/:systemId/health/:metric', {
                        template: ''
                    })
                    .when('/systems/:systemId/share', {
                        template: ''
                    })
                    .when('/systems/:systemId', {
                        template: ''
                    })
                    .when('/systems', {
                        template: ''
                    })
                    .when('/embed/:systemId/view/:cameraId', {
                        templateUrl: CONFIG.viewsDir + 'view.html',
                        controller: 'ViewPageCtrl',
                        resolve: {
                            embed: function () {
                                return true;
                            }
                        }
                    })
                    .when('/embed/ipvd', {
                        template:'',
                    })
                    .when('/activate', {
                        template: ''
                    })
                    .when('/activate/success', {
                        template: ''
                    })
                    .when('/activate/:activateCode', {
                        template: ''
                    })
                    .when('/restore_password', {
                        template: ''
                    })
                    .when('/restore_password/sent', {
                        template: ''
                    })
                    .when('/restore_password/success', {
                        template: ''
                    })
                    .when('/restore_password/:restoreCode', {
                        template: ''
                    })
                    .when('/content/:page', {
                        template: '',
                    })
                    .when('/agreement', {
                        template: '',
                    })
                    .when('/debug', {
                        template: ''
                    })
                    .when('/login', {
                        template: ''
                    })
                    .when('/admin', {
                        resolve: {
                            test: function(){
                                window.location = '/admin/';
                            }
                        }})
                    // for history purpose
                    .when('/downloads/history', {
                        template: ''
                    })
                    .when('/downloads/:param?', {
                        template: ''
                    })
                    .when('/download', {
                        template: ''
                    })
                    .when('/download/:platform', {
                        template: ''
                    })
                    .when('/browser', {
                        template: ''
                    })
                    .when('/ipvd', {
                        template: ''
                    })
                    .when('/sandbox', {
                        template: ''
                    })
                    .when('/integrations/:id?', {
                        template: ''
                    })
                    .when('/integrations/:id/:section', {
                        template: ''
                    })
                    .when('/right', {
                        template: ''
                    })
                    .when('/push-notifications', {
                        template: ''
                    })
                    // **** routes for detail views should state full path ****
                    .when('/main/:route', {
                        template: ''
                    })
                    // ********************************************************
                    .when('/main', {
                        template: ''
                    })
                    .when('/404', {
                        template: ''
                    })
                    .when('/', {
                        // // TODO: keep until we retire AJS
                        template: ''
                        // title: ''/*lang.pageTitles.startPage*/,
                        // templateUrl: CONFIG.viewsDir + 'startPage.html',
                        // controller: 'StartPageCtrl'
                    })
                    .otherwise({
                        resolve: {
                            404: function () {
                                window.location = '/404';
                            }
                        }
                    });
            }]);
})();
