const { pathsToModuleNameMapper } = require('ts-jest/utils');
const { compilerOptions } = require('./tsconfig');

module.exports = {
    preset: 'jest-preset-angular',
    roots: ['<rootDir>/app/src/'],
    testMatch: ['**/+(*.)+(spec).+(ts)'],
    setupFiles: ['@angular/localize/init'],
    setupFilesAfterEnv: ['<rootDir>/app/setupJest.ts'],
    collectCoverage: true,
    coverageReporters: ['html'],
    coverageDirectory: 'coverage/cloud_portal',
    moduleNameMapper: {
        ...pathsToModuleNameMapper(compilerOptions.paths || {}, {
            prefix: '<rootDir>/app'
        }),
        '\\.scss$': 'identity-obj-proxy'
    },
    modulePathIgnorePatterns: [
        "<rootDir>/app/src/pages/systems/view/components/camera-timeline/"
    ]
};
    // might use in future
    // transform: {
    //     "^.+\\.jsx?$": "babel-jest",
    //     "^.+\\.tsx?$": "ts-jest"
    // },
    // globals: {
    //     'babel-jest': { babelrcFile: '<rootDir>/.babelrc' }
    // },
