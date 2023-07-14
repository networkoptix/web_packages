import { Config } from 'jest';

export const jestConfigFactory = (
    displayName: string,
    preset = '../../jest.preset.js',
): Config => ({
    displayName,
    preset,
    coverageDirectory: `../../coverage/${displayName}`,
    coverageReporters: ['clover', 'json', 'text', 'lcov', 'cobertura'],
    // TODO: There's a bug with jest 29 where reporters aren't being picked up if the coverageDirectory is set
    // junit reports will be broken until this is fixed
    reporters: [
        'default',
        [
            'jest-junit',
            {
                outputDirectory: `junit/${displayName}`,
                outputName: 'junit.xml',
            },
        ],
    ],
});
