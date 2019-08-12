(function() {

    'use strict';

    angular
        .module('cloudApp')
        .controller('AccountCtrl', AccountCtrl);

    AccountCtrl.$inject = [ '$scope', '$base64', '$location', 'cloudApi', 'process', '$routeParams', 'account', 'languageService',
        'systemsProvider', 'authorizationCheckService', '$localStorage', 'dialogs', 'nxPageService' ];

    function AccountCtrl($scope, $base64, $location, cloudApi, process, $routeParams, account, languageService,
                         systemsProvider, authorizationCheckService, $localStorage, dialogs, nxPageService) {

        $scope.lang = languageService.lang;
        var currentLanguageCode = $scope.lang.language;

        if ($localStorage && $localStorage.langChanged) {
            $localStorage.langChanged = false;
            dialogs.notify(languageService.lang.account.accountSavedSuccess, 'success', false);
        }
    
        $scope.accountMode = $routeParams.accountMode;
        $scope.passwordMode = $routeParams.passwordMode;

        var auth;
        if ($routeParams.auth) {
            try {
                auth = $base64.decode($routeParams.auth);
            } catch (exception) {
                auth = false;
                console.error(exception);
            }
            if (auth) {
                const index = auth.indexOf(':');
                const tempLogin = auth.substring(0, index);
                const tempPassword = auth.substring(index + 1);
            
                authorizationCheckService
                    .login(tempLogin, tempPassword, false)
                    .then(function () {
                        $scope.userEmail = account.getEmail();
                        account.get().then(function (result) {
                            $scope.account = result;
                        });
                    })
                    .finally(function () {
                        $location.search('auth', undefined);
                    });
            }
        } else {
            authorizationCheckService
                .checkLoginState()
                .then(function () {
                    account.get().then(function (result) {
                        $scope.account = result;
                    });
                    $scope.userEmail = account.getEmail();
                }, function () {
                    dialogs.login(true);
                })
        }
    
        if ($scope.accountMode) {
            nxPageService.setPageTitle($scope.lang.pageTitles.account);
        }
    
        if ($scope.passwordMode) {
            nxPageService.setPageTitle($scope.lang.pageTitles.changePassword);
        }
    
        $scope.pass = {
            password   : '',
            newPassword: ''
        };

        $scope.changeLanguage = function (langCode) {
            currentLanguageCode = langCode;
        };

        $scope.save = process.init(function () {

            return cloudApi.accountPost($scope.account)
                .then(function (result) {
                    if (languageService.lang.language !== currentLanguageCode) {
                        cloudApi
                            .changeLanguage(currentLanguageCode)
                            .then(() => {
                                $localStorage.langChanged = true;
                                window.location.reload(); // reload window to catch new language
                            });
                    } else {
                        systemsProvider.forceUpdateSystems();
                    }

                    return result;
                });
        }, {
            successMessage : languageService.lang.account.accountSavedSuccess,
            errorPrefix    : languageService.lang.errorCodes.cantChangeAccountPrefix,
            logoutForbidden: true
        });

        $scope.changePassword = process.init(function () {
            return cloudApi.changePassword($scope.pass.newPassword, $scope.pass.password);
        }, {
            errorCodes        : {
                notAuthorized   : languageService.lang.errorCodes.oldPasswordMistmatch,
                wrongOldPassword: languageService.lang.errorCodes.oldPasswordMistmatch
            },
            successMessage    : languageService.lang.account.passwordChangedSuccess,
            errorPrefix       : languageService.lang.errorCodes.cantChangePasswordPrefix,
            ignoreUnauthorized: true
        });
    }
})();
