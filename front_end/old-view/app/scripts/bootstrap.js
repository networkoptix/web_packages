'use strict';

/**
    This module prepares to run a bootstrap application: detects language, requests language strings
*/

window.L = {};

window.setLanguage = function(lang){

    function setCookie(cname, cvalue, exdays) {
        var d = new Date();
        d.setTime(d.getTime() + (exdays*24*60*60*1000));
        var expires = "expires="+ d.toUTCString();
        document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
    }

    setCookie("language", lang, 100); // Almost never expiring cookie
};
setTimeout(function LanguageDetect(){

    function getCookie(cname) {
        var name = cname + "=";
        var ca = document.cookie.split(';');
        for(var i = 0; i < ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0) == ' ') {
                c = c.substring(1);
            }
            if (c.indexOf(name) == 0) {
                return c.substring(name.length, c.length);
            }
        }
        return "";
    }

    var userLang = getCookie("language");
    if(!userLang) {
        var match = window.location.href.match(/[?&]lang=([^&#]+)/i);
        if(match){
            userLang = match[1];
        }
    }
    if(!userLang){
        userLang = navigator.language || navigator.userLanguage;
        userLang = userLang.replace('-','_');
        userLang = _.find(Config.supportedLanguages, function(supportedLanguage){
            return supportedLanguage.indexOf(userLang) == 0;
        });
    }
    if(!userLang || Config.supportedLanguages.indexOf(userLang)<0){
        // We weren't able to detect language or detected language is not supported in this customization
        userLang = Config.defaultLanguage;
    }

    function fetchJson(url) {
        return fetch(url).then(function(res) { return res.json(); });
    }

    function processLang(response) {
        L = response;// Fill global L variable
        Config.viewsDir = '/static/lang_' + userLang + '/views/';
        Config.viewsDirCommon =  '/static/lang_' + userLang + '/web_common/views/';
        return fetchJson('/static/lang_' + userLang + '/web_common/commonLanguage.json')
            .then(function(response) {
                L.common = response;
                angular.bootstrap(document, ['webadminApp']);
            });
    }

    fetchJson('/static/lang_' + userLang + '/language.json')
        .then(processLang)
        .catch(function() {
            // Language failed. Attempt to use en_US as a fallback.
            userLang = Config && Config.defaultLanguage || 'en_US';
            fetchJson('/static/lang_' + userLang + '/language.json')
                .then(processLang)
                .catch(function() {
                    angular.bootstrap(document, ['webadminApp']);
                    console.error("Can't get language.json");
                });
        });
});
