(function () {

    'use strict';

    angular
        .module('cloudApp')
        .controller('ViewPageCtrl', [ '$rootScope', '$scope', '$window', 'nxAccountService', 'system', '$routeParams', 'systemAPI', 'nxDialogsService',
            '$location', '$q', '$poll', 'camerasProvider', 'cloudApi',
            'nxConfigService', 'nxLanguageService', 'nxAppStateService', 'nxPageService', 'nxHeaderService', 'embed',

            function ($rootScope, $scope, $window, nxAccountService, system, $routeParams, systemAPI, nxDialogsService,
                      $location, $q, $poll, camerasProvider, cloudApi,
                      nxConfigService, nxLanguageService, nxAppStateService, nxPageService, nxHeaderService, embed) {

                const CONFIG = nxConfigService.getConfig();
                const LANG = nxLanguageService.getTranslations();

                nxPageService.setPageTitle(LANG.pageTitles.view);

                $scope.systemReady = false;
                $scope.hasCameras = false;

                function delayedUpdateSystemInfo() {
                    var pollingSystemUpdate = $poll(function () {
                        return $scope.currentSystem.update();
                    }, CONFIG.updateInterval);

                    $scope.$on('$destroy', function () {
                        $poll.cancel(pollingSystemUpdate);
                    });
                }

                nxAppStateService.setFooterVisibility(false);
                if (embed) {
                    nxAppStateService.setHeaderVisibility(false);
                }

                if (embed && $routeParams.auth) {
                    var credentials = nxAccountService.getCredentialsFromAuth($routeParams.auth);

                    cloudApi
                        .login(credentials[0], credentials[1])
                        .then(function (result) {
                            getSystems(result.data);
                        });
                } else {
                    nxAccountService
                        .requireLogin()
                        .then(function (account) {
                            getSystems(account);
                        });
                }

                function getSystems(account) {
                    $scope.unreachable = false;
                    $scope.currentSystem = system($routeParams.systemId, account.email);

                    $scope.currentSystem.getInfo().then(function (result) {
                        $scope.system = $scope.currentSystem.mediaserver;
                        $scope.hasCameras = false;

                        // Notify header that system was changed (for display purposes)
                        nxHeaderService.systemIdSubject.next($scope.currentSystem.id);

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
                }

                function systemError() {
                    $scope.unreachable = true;
                }

                var cancelSubscription = $scope.$on('unauthorized_' + $routeParams.systemId, function () {
                    nxDialogsService.notify(LANG.errorCodes.lostConnection.replace('{{systemName}}',
                        $scope.currentSystem.info.name || LANG.errorCodes.thisSystem), 'warning');

                    if (embed) {
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
