import { memoize } from 'lodash-es';

import { FeatureFlagType } from '@services/nx-config/base-config';

import {
    BaseBetaGroup,
    BetaConfiguration,
    hasBetaGroups,
    hasFeatureFlags,
    narrowJsonType,
} from './beta.types';

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
    betaGroup: BaseBetaGroup,
    betaFeatures: Record<string, boolean>,
): Generator<FeatureFlagType> {
    if (hasFeatureFlags(betaGroup) && betaFeatures[betaGroup.featureConfig.key]) {
        for (const flag of betaGroup.featureConfig.flags) {
            yield flag;
        }
    }

    if (hasBetaGroups(betaGroup)) {
        for (const group of betaGroup.betaGroups) {
            yield* extractEnabledFeatureFlags(group, betaFeatures);
        }
    }
}

export const getUserEnabledBetaFeatureFlags = async (): Promise<FeatureFlagType[]> => {
    const [betaGroups, betaFeatures] = await Promise.all([getBetaConfig(), getUserBetaFeatures()]);
    if (!betaGroups) {
        return [];
    }

    return [...new Set<FeatureFlagType>(extractEnabledFeatureFlags(betaGroups, betaFeatures))];
};

export function* extractChildGroups(group: BaseBetaGroup): Generator<BaseBetaGroup> {
    yield group;

    if (hasBetaGroups(group)) {
        for (const childGroup of group.betaGroups) {
            yield* extractChildGroups(childGroup);
        }
    }
}
