import preset from '@nx/jest/preset';

/* eslint-disable */
export default {
    ...preset,
    displayName: 'nx-icons',
    transform: {
        '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
    },
    moduleFileExtensions: ['ts', 'js', 'html'],
    coverageDirectory: '../../coverage/libs/nx-icons',
    transformIgnorePatterns: ['node_modules/(?!.*\\.mjs$)'],
    moduleNameMapper: {
        'lodash-es': 'lodash',
    },
};
