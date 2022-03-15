// Karma configuration
// Generated on Thu Feb 25 2021 17:29:11 GMT-0800 (Pacific Standard Time)

module.exports = function(config) {
    config.set({

        // base path that will be used to resolve all patterns (eg. files, exclude)
        basePath: '',

        // frameworks to use
        // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
        frameworks: ['jasmine', '@angular-devkit/build-angular', 'viewport'],

        plugins: [
            require('karma-jasmine'),
            require('karma-chrome-launcher'),
            require('karma-firefox-launcher'),
            require('karma-safari-launcher'),
            require('karma-jasmine-html-reporter'),
            require('karma-coverage'),
            require('karma-spec-reporter'),
            require('@angular-devkit/build-angular/plugins/karma'),
            require('karma-viewport')
        ],

        // Viewport configuration
        viewport: {
            breakpoints: [
                {
                    name: 'mobile',
                    size: {
                        width: 320,
                        height: 480
                    }
                },
                {
                    name: 'tablet',
                    size: {
                        width: 768,
                        height: 1024
                    }
                },
                {
                    name: 'screen',
                    size: {
                        width: 1440,
                        height: 900
                    }
                }
            ]
        },

        client: {
            clearContext: false, // leave Jasmine Spec Runner output visible in browser
            jasmine: {
                // seed             : '4321',
                // timeoutInterval  : 1000,
                random: false,
                stopSpecOnExpectationFailure: true,
                stopOnSpecFailure: true
            }
        },

        // list of files / patterns to load in the browser
        files: [],

        proxies: {
            '/static/images/': 'images/'
        },

        // list of files / patterns to exclude
        exclude: [],

        // preprocess matching files before serving them to the browser
        // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
        preprocessors: {},

        // test results reporter to use
        // possible values: 'dots', 'progress', 'coverage-istanbul', 'kjhtml', 'spec'
        // available reporters: https://npmjs.org/browse/keyword/karma-reporter
        reporters: ['progress'],
    
        coverageReporter: {
            dir: require('path').join(__dirname, './coverage/test-karma'),
            subdir: '.',
            reporters: [
                { type: 'html' },
                { type: 'text-summary' }
            ],
        },

        // web server port
        port: 9876,

        // enable / disable colors in the output (reporters and logs)
        colors: true,

        // level of logging
        // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO ||
        // config.LOG_DEBUG
        logLevel: config.LOG_INFO,

        // enable / disable watching file and executing tests whenever any file changes
        autoWatch: false,

        // Continuous Integration mode
        // if true, Karma captures browsers, runs the tests and exits
        singleRun: true, // Angular cli doesn't expose this property - this is the reason of having 2 configs --TT

        // start these browsers
        // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
        browsers: ['ChromeHeadlessNoSandbox'],
        customLaunchers: {
            ChromeHeadlessNoSandbox: {
                // This custom launcher is required to allow attaching a debugger to the test
                base: 'ChromeHeadless',
                flags: [
                    '--no-sandbox', // required to run without privileges in docker
                    '--user-data-dir=/tmp/chrome-test-profile',
                    '--disable-web-security',
                    '--remote-debugging-address=0.0.0.0',
                    '--remote-debugging-port=9222'
                ],
                debug: true
            }
        },
        restartOnFileChange: true,

        // Concurrency level
        // how many browser should be started simultaneous
        concurrency: Infinity
    });
};
