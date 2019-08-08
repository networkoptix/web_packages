(function () {

    "use strict";

    angular
        .module('cloudApp')
        .controller('StartPageCtrl', StartPage);

    StartPage.$inject = [ '$scope', 'cloudApi', '$location', '$routeParams',
        'dialogs', 'nxAccountService',
        'languageService', 'nxPageService', '$base64' ];

    function StartPage($scope, cloudApi, $location, $routeParams,
                       dialogs, nxAccountService,
                       languageService, nxPageService, $base64) {

        if ($routeParams.callLogin) {
            nxAccountService
                .checkLoginState()
                .then(function() {
                    nxAccountService.redirectAuthorised();
    
                })
                .catch(function () {
                    nxPageService.setPageTitle(languageService.lang.pageTitles.login);
                    dialogs.login(false);
                });
            
            
        } else {
            var search = $location.search(),
                auth;
    
            if (search.auth) {
                try {
                    auth = $base64.decode(search.auth);
                } catch (exception) {
                    auth = false;
                    console.error(exception);
                }
                if (auth) {
                    const index = auth.indexOf(':');
                    const tempLogin = auth.substring(0, index);
                    const tempPassword = auth.substring(index + 1);
    
                    nxAccountService
                        .login(tempLogin, tempPassword, false)
                        .then(function () {
                            $scope.userEmail = nxAccountService.getEmail();
                            nxAccountService.redirectAuthorised();
                        })
                        .finally(function () {
                            $location.search('auth', undefined);
                        });
                }
            } else {
                nxAccountService
                    .checkLoginState()
                    .then(function () {
                        $scope.userEmail = nxAccountService.getEmail();
                        nxAccountService.redirectAuthorised();
                    })
            }
        }
    }
})();
