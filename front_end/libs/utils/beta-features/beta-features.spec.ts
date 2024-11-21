import { BetaConfiguration } from './beta.types';

import { getBetaConfig, getUserBetaFeatures, getUserEnabledBetaFeatureFlags } from './index';

vi.mock('lodash-es', () => ({
    memoize: fn => fn,
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

        vi.doMock('./beta-config.json', () => {
            return { default: betaConfig };
        });

        const config = await getBetaConfig();
        expect(config).toEqual(betaConfig);
    });

    it('should get user beta features', async () => {
        vi.stubGlobal('fetch', () =>
            Promise.resolve({
                json: () => Promise.resolve({ testKey: true }),
            }),
        );

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
        vi.doMock('./beta-config.json', () => {
            return { default: betaConfig };
        });

        vi.stubGlobal('fetch', () =>
            Promise.resolve({
                json: () => Promise.resolve({ layoutsKey: true }),
            }),
        );

        const flags = await getUserEnabledBetaFeatureFlags();
        expect(flags).toEqual(['layouts51Enabled', 'layoutsAuthorizeCamera']);
    });
});
