// The watch config has been updated to allow attaching remote debuggers

// To configure debugger for vs code you'll need to add the configurations below to your launch.json
// Depending on how your have your if your workspaceFolder is not the front_end folder
// or if you don't have workspaces setup you'll probably need to add /front_end to each place
// that ${workspaceFolder} is referenced

// This attaches the debugger to a Karma instance currently running in watch mode
// {
//     'type': 'pwa-chrome',
//     'request': 'attach',
//     'name': 'Debug: Currently running Karma test',
//     'address': 'localhost',
//     'port': 9222,
//     'timeout': 600000,
//     'sourceMaps': true,
//     'webRoot': '${workspaceFolder}',
//     'pathMapping': {
//         '/_karma_webpack_': '${workspaceFolder}'
//     }
// }

// This launches Karma in watch mode with the currently open file.
// To debug, you'll need to also run the debug command.
// {
//     'type': 'node',
//     'request': 'launch',
//     'name': 'Start: Karma tests for currently open spec file',
//     'skipFiles': ['<node_internals>/**'],
//     'console': 'integratedTerminal',
//     'program': '${workspaceFolder}/node_modules/.bin/ng',
//     'args': ['test', '--include', '${relativeFile}', '--karma-config', 'karma.conf.watch.js'],
//     'outFiles': ['${workspaceFolder}/**/*.js']
// }

module.exports = function (config) {
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
            require('@angular-devkit/build-angular/plugins/karma'),
            require('karma-spec-reporter'),
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
                oneFailurePerSpec: true,
                failFast: true
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
        // possible values: 'dots', 'progress'
        // available reporters: https://npmjs.org/browse/keyword/karma-reporter
        reporters: ['spec', 'kjhtml'],

        coverageIstanbulReporter: {
            dir: require('path').join(__dirname, './coverage/test-karma'),
            reports: ['html', 'lcovonly', 'text-summary'],
            fixWebpackSourcePaths: true
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
        autoWatch: true,

        // Continuous Integration mode
        // if true, Karma captures browsers, runs the tests and exits
        singleRun: false, // Angular cli doesn't expose this property - this is the reason of having 2 configs --TT

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
