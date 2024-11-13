import { BetaConfiguration } from './beta.types';

import { getBetaConfig, getUserBetaFeatures, getUserEnabledBetaFeatureFlags } from './index';

jest.mock('lodash-es', () => ({
    memoize: jest.fn(fn => fn),
}));

describe('Beta Features', () => {
    it('should get beta config', async () => {
        const betaConfig: BetaConfiguration = [
            {
                name: 'Test Group',
                description: 'Test Description',
                featureConfig: {
                    key: 'layoutsKey',
                    flags: ['layouts51Enabled', 'layoutsAuthorizeCamera'],
                },
            },
        ];
        jest.mock('./beta-config.json', () => betaConfig, { virtual: true });

        const config = await getBetaConfig();
        expect(config).toEqual(betaConfig);
    });

    it('should get user beta features', async () => {
        global.fetch = jest.fn(() =>
            Promise.resolve({
                json: () => Promise.resolve({ testKey: true }),
            }),
        ) as jest.Mock;

        const features = await getUserBetaFeatures();
        expect(features).toEqual({ testKey: true });
    });

    it('should get user enabled beta feature flags', async () => {
        const betaConfig: BetaConfiguration = [
            {
                name: 'Test Group',
                description: 'Test Description',
                featureConfig: {
                    key: 'layoutsKey',
                    flags: ['layouts51Enabled', 'layoutsAuthorizeCamera'],
                },
            },
        ];
        jest.mock('./beta-config.json', () => betaConfig, { virtual: true });

        global.fetch = jest.fn(() =>
            Promise.resolve({
                json: () => Promise.resolve({ layoutsKey: true }),
            }),
        ) as jest.Mock;

        const flags = await getUserEnabledBetaFeatureFlags();
        expect(flags).toEqual(['layouts51Enabled', 'layoutsAuthorizeCamera']);
    });
});
