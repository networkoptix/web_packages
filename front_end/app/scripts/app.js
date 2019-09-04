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
                        // template: '<nx-register-component [uri-param]="uriParam"></nx-register-component>',
                        // controller: ['$scope', 'getParam', function ($scope, getParam) {
                        //     $scope.uriParam = getParam;
                        // }],
                        // resolve: {
                        //     getParam: [function () {
                        //         return 'registerSuccess';
                        //     }]
                        // }
                    })
                    .when('/register/successActivated', {
                        template: ''
                        // template: '<nx-register-component [uri-param]="uriParam"></nx-register-component>',
                        // controller: ['$scope', 'getParam', function ($scope, getParam) {
                        //     $scope.uriParam = getParam;
                        // }],
                        // resolve: {
                        //     getParam: [function () {
                        //         return 'successActivated';
                        //     }]
                        // }
                        // templateUrl: CONFIG.viewsDir + 'regActions.html',
                        // controller: 'RegisterCtrl',
                        // resolve: {
                        //     test: ['$route', function ($route) {
                        //         $route.current.params.registerSuccess = true;
                        //         $route.current.params.activated = true;
                        //     }]
                        // }
                    })
                    .when('/register/:code', {
                        template: ''
                        // template: '<nx-register-component [uri-param]="getParam" [uri-param-code]="getCode"></nx-register-component>',
                        // controller: ['$scope', 'getParam', function ($scope, getParam) {
                        //     $scope.uriParam = getParam;
                        //     $scope.uriParamCode = getCode;
                        // }],
                        // resolve: {
                        //     getParam: [function () {
                        //         return 'code';
                        //     }],
                        //     getCode: ['$route', function ($route) {
                        //         return $route.current.params.code;
                        //     }]
                        // }
                        // templateUrl: CONFIG.viewsDir + 'regActions.html',
                        // controller: 'RegisterCtrl'
                    })
                    // .when('/register', {
                    //     templateUrl: CONFIG.viewsDir + 'regActions.html',
                    //     controller: 'RegisterCtrl'
                    // })
                    .when('/register', {
                        template: ''
                        // template: '<nx-register-component [uri-param]="register"></nx-register-component>'
                    })
                    .when('/account/password', {
                        template: ''
                        // templateUrl: CONFIG.viewsDir + 'account.html',
                        // controller: 'AccountCtrl',
                        // resolve: {
                        //     test: ['$route', function ($route) {
                        //         $route.current.params.passwordMode = true;
                        //     }]
                        // }
                    })
                    .when('/account', {
                        template: ''
                        // templateUrl: CONFIG.viewsDir + 'account.html',
                        // controller: 'AccountCtrl',
                        // resolve: {
                        //     test: ['$route', function ($route) {
                        //         $route.current.params.accountMode = true;
                        //     }]
                        // }
                    })
                    // .when('/systems', {
                    //     templateUrl: CONFIG.viewsDir + 'systems.html',
                    //     controller: 'SystemsCtrl'
                    // })
                    // .when('/systems/:systemId', {
                    //     templateUrl: CONFIG.viewsDir + 'system.html',
                    //     controller: 'SystemCtrl'
                    // })
                    .when('/systems/:systemId/users', {
                        template: ''
                        // template: '<nx-system-settings-component [uri-param-system-id]="uriParamSystemId" [param]="callShare"></nx-system-settings-component>',
                        // controller: ['$scope', 'getSystemId', 'getCallShare', function ($scope, getSystemId, getCallShare) {
                        //     $scope.uriParamSystemId = getSystemId;
                        //     $scope.param = getParam;
                        // }],
                        // resolve: {
                        //     getSystemId: ['$route', function ($route) {
                        //         return $route.current.params.systemId;
                        //     }],
                        //     getparam: ['$route', function ($route) {
                        //         return 'users';
                        //     }]
                        // }
                    })
                    .when('/systems/:systemId/users/:userId', {
                        template: ''
                    })
                    // .when('/systems/:systemId/share', {
                    //     // title: lang.pageTitles.systemShare,
                    //     // templateUrl: CONFIG.viewsDir + 'system.html',
                    //     // controller: 'SystemCtrl',
                    //     // resolve: {
                    //     //     test: ['$route', function ($route) {
                    //     //         $route.current.params.callShare = true;
                    //     //     }]
                    //     // }
                    //     template: '<nx-system-settings-component [uri-param-system-id]="uriParamSystemId" [call-share]="callShare"></nx-system-settings-component>',
                    //     controller: ['$scope', 'getSystemId', 'getCallShare', function ($scope, getSystemId, getCallShare) {
                    //         $scope.uriParamSystemId = getSystemId;
                    //         $scope.callShare = getCallShare;
                    //     }],
                    //     resolve: {
                    //         getSystemId: ['$route', function ($route) {
                    //             return $route.current.params.systemId;
                    //         }],
                    //         getCallShare: ['$route', function ($route) {
                    //             return true;
                    //         }]
                    //     }
                    // })
                    .when('/systems/:systemId/view', {
                        templateUrl: CONFIG.viewsDir + 'view.html',
                        controller: 'ViewPageCtrl'
                    })
                    .when('/systems/:systemId/view/:cameraId', {
                        templateUrl: CONFIG.viewsDir + 'view.html',
                        controller: 'ViewPageCtrl'
                    })
                    .when('/systems/:systemId', {
                        template: ''
                        // template: '<nx-system-settings-component [uri-param-system-id]="uriParamSystemId" ></nx-system-settings-component>',
                        // controller: ['$scope', 'getSystemId', function ($scope, getSystemId) {
                        //     $scope.uriParamSystemId = getSystemId;
                        // }],
                        // resolve: {
                        //     getSystemId: ['$route', function ($route) {
                        //         return $route.current.params.systemId;
                        //     }]
                        // }
                    })
                    .when('/systems', {
                        template: ''
                        // template: '<nx-systems-list-component></nx-systems-list-component>',
                    })
                    .when('/embed/:systemId/view/:cameraId', {
                        templateUrl: CONFIG.viewsDir + 'view.html',
                        controller : 'ViewPageCtrl',
                        resolve: {
                            cleanSlate: [function () {
                                CONFIG.showHeaderAndFooter = false;
                            }]
                        }
                    })
                    
                    
                    .when('/activate', {
                        template: ''
                        // templateUrl: CONFIG.viewsDir + 'activeActions.html',
                        // controller: 'ActivateRestoreCtrl',
                        // resolve: {
                        //     test: ['$route', function ($route) {
                        //         $route.current.params.reactivating = true;
                        //     }]
                        // }
                    })
                    .when('/activate/success', {
                        template: ''
                        // templateUrl: CONFIG.viewsDir + 'activeActions.html',
                        // controller: 'ActivateRestoreCtrl',
                        // resolve: {
                        //     test: ['$route', function ($route) {
                        //         $route.current.params.activationSuccess = true;
                        //     }]
                        // }
                    })
                    .when('/activate/:activateCode', {
                        template: ''
                        // templateUrl: CONFIG.viewsDir + 'activeActions.html',
                        // controller: 'ActivateRestoreCtrl'
                    })
                    
                    
                    
                    .when('/restore_password', {
                        template: ''
                        // templateUrl: CONFIG.viewsDir + 'activeActions.html',
                        // controller: 'ActivateRestoreCtrl',
                        // resolve: {
                        //     test: ['$route', function ($route) {
                        //         $route.current.params.restoring = true;
                        //     }]
                        // }
                    })
                    .when('/restore_password/sent', {
                        template: ''
                        // templateUrl: CONFIG.viewsDir + 'activeActions.html',
                        // controller: 'ActivateRestoreCtrl',
                        // resolve: {
                        //     test: ['$route', function ($route) {
                        //         $route.current.params.restoringSuccess = true;
                        //     }]
                        // }
                    })
                    .when('/restore_password/success', {
                        template: ''
                        // templateUrl: CONFIG.viewsDir + 'activeActions.html',
                        // controller: 'ActivateRestoreCtrl',
                        // resolve: {
                        //     test: ['$route', function ($route) {
                        //         $route.current.params.changeSuccess = true;
                        //     }]
                        // }
                    })
                    .when('/restore_password/:restoreCode', {
                        template: ''
                        // templateUrl: CONFIG.viewsDir + 'activeActions.html',
                        // controller: 'ActivateRestoreCtrl'
                    })
                    
                    
                    
                    .when('/content/:page', {
                        template: '',
                    })
                    .when('/debug', {
                        template: ''
                    })
                    .when('/login', {
                        template: ''
                        // title: lang.pageTitles.login,
                        // templateUrl: CONFIG.viewsDir + 'startPage.html',
                        // controller: 'StartPageCtrl',
                        // resolve: {
                        //     test: ['$route', function ($route) {
                        //         $route.current.params.callLogin = true;
                        //     }]
                        // }
                    })
                    .when('/admin', {
                        resolve: {
                            test: function(){
                                window.location = '/admin/';
                            }
                        }})
                    // for history purpose
                    .when('/downloads/history', {
                        template: '<download-history></download-history>'
                    })
                    .when('/downloads/:param?', {
                        template: '<download-history [route-param]="uriParam"></download-history>',
                        controller: [ '$scope', 'getParam', function ($scope, getParam) {
                            $scope.uriParam = getParam;
                        }],
                        resolve: {
                            getParam: [ '$route', function($route){
                                return $route.current.params.param;
                            }]
                        }
                    })
                    .when('/download', {
                        template: ''
                    })
                    .when('/download/:platform', {
                        template: ''
                    })
                    .when('/browser', {
                        template: '<non-supported-browser></non-supported-browser>'
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
                    .when('/', {
                        // // TODO: keep until we retire AJS
                        template: '<landing-component></landing-component>'
                        // title: ''/*lang.pageTitles.startPage*/,
                        // templateUrl: CONFIG.viewsDir + 'startPage.html',
                        // controller: 'StartPageCtrl'
                    })
                    .otherwise({
                        template: '<nx-404></nx-404>'
                    });
            }]);
})();
