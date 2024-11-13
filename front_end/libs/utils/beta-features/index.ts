import { memoize } from 'lodash-es';

import { FeatureFlagType } from '@services/nx-config/base-config';

import { BaseBetaGroup, BetaConfiguration, hasFeatureFlags, narrowJsonType } from './beta.types';

export const getBetaConfig = memoize(
    (): Promise<BetaConfiguration | null> =>
        import('./beta-config.json').then(m => narrowJsonType(m.default)).catch(() => null),
);

export const getUserBetaFeatures = memoize(
    (): Promise<Record<string, boolean>> =>
        fetch('/api/custom-properties/betaSettings')
            .then(r => r.json())
            .catch(() => ({})),
);

function* extractEnabledFeatureFlags(
    betaGroupsFromConfig: BaseBetaGroup[],
    userBetaFeatures: Record<string, boolean>,
): Generator<FeatureFlagType> {
    for (const group of betaGroupsFromConfig) {
        if (hasFeatureFlags(group) && userBetaFeatures[group.featureConfig.key]) {
            for (const flag of group.featureConfig.flags) {
                yield flag;
            }
        }
    }
}

export const getUserEnabledBetaFeatureFlags = async (): Promise<FeatureFlagType[]> => {
    const [betaGroupsFromConfig, userBetaFeatures] = await Promise.all([
        getBetaConfig(),
        getUserBetaFeatures(),
    ]);
    if (!betaGroupsFromConfig) {
        return [];
    }

    return [
        ...new Set<FeatureFlagType>(
            extractEnabledFeatureFlags(betaGroupsFromConfig, userBetaFeatures),
        ),
    ];
};
