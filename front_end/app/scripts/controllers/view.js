(function () {

    'use strict';

    angular
        .module('cloudApp')
        .controller('ViewPageCtrl', [ '$rootScope', '$scope', '$window', 'nxAccountService', 'system', '$routeParams', 'systemAPI', 'nxDialogsService',
            '$location', '$q', '$poll', 'camerasProvider',
            'nxConfigService', 'languageService', 'nxAppStateService', 'nxPageService',

            function ($rootScope, $scope, $window, nxAccountService, system, $routeParams, systemAPI, nxDialogsService,
                      $location, $q, $poll, camerasProvider,
                      nxConfigService, languageService, nxAppStateService, nxPageService) {
    
                const CONFIG = nxConfigService.getConfig();
                const LANG = languageService.lang;

                nxPageService.setPageTitle(LANG.pageTitles.view);
                
                $scope.systemReady = false;
                $scope.hasCameras = false;
    
                // Check if page is displayed inside an iframe
                $scope.isInIframe = ($window.location !== $window.parent.location);
    
                function delayedUpdateSystemInfo() {
                    var pollingSystemUpdate = $poll(function () {
                        return $scope.currentSystem.update();
                    }, CONFIG.updateInterval);
        
                    $scope.$on('$destroy', function () {
                        $poll.cancel(pollingSystemUpdate);
                    });
                }

                nxAppStateService.setFooterVisibility(false);
                
                // Check if page is displayed inside an iframe
                $scope.isInIframe = ($window.location !== $window.parent.location);
                
                if ($scope.isInIframe) {
                    $rootScope.$emit('nx.layout.header', {
                        state: true, // hide it
                        loc: 'ViewPageCtrl - inIframe'
                    });
                    nxAppStateService.setFooterVisibility(false);
                }
    
                function systemError () {
                    $scope.unreachable = true;
                }
    
                nxAccountService
                    .requireLogin()
                    .then(function (account) {
                        $scope.unreachable = false;
                        $scope.currentSystem = system($routeParams.systemId, account.email);
                        var systemInfoRequest = $scope.currentSystem.getInfo();
                        var systemAuthRequest = $scope.currentSystem.updateSystemAuth();
    
                        $q.all([systemInfoRequest, systemAuthRequest]).then(function (result) {
                            $scope.system = $scope.currentSystem.mediaserver;
                            $scope.hasCameras = false;
        
                            if ($scope.currentSystem.isOnline) {
                                $scope.camerasProvider = camerasProvider.getProvider($scope.system);
                                $scope.camerasProvider
                                    .requestResources()
                                    .then(function () {
                                        $scope.system.getCameras().then(function (cameras) {
                                            $scope.camerasProvider.getCameras(cameras.data);
                                            $scope.systemReady = true;
                                            $scope.hasCameras = (Object.keys($scope.camerasProvider.cameras).length);
                        
                                            if ($scope.hasCameras) {
                                                delayedUpdateSystemInfo();
                                            }
                                        }, systemError);
                                    }, systemError);
                            } else {
                                $scope.systemReady = true;
                            }
                        }, systemError);
                    });

                

                var cancelSubscription = $scope.$on('unauthorized_' + $routeParams.systemId, function () {
                    nxDialogsService.notify(LANG.errorCodes.lostConnection.replace('{{systemName}}',
                        $scope.currentSystem.info.name || LANG.errorCodes.thisSystem), 'warning');
    
                    if ($scope.isInIframe) {
                        $location.path('/404');
                    } else {
                        $location.path('/systems');
                    }
                });

                $scope.$on('$destroy', function () {
                    cancelSubscription();
                    // Reset visibility state
                    if (!$scope.isInIframe) {
                        $rootScope.$emit('nx.layout.header', {state: false});
                        nxAppStateService.setFooterVisibility(true);
                    }
                });
            }]);
})();
