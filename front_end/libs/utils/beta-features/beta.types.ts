import type { FeatureFlagType } from '@services/nx-config/base-config';

export interface FeatureConfig<T = FeatureFlagType> {
    key: string;
    immediateReload?: boolean;
    flags: T[];
}

export interface BaseBetaGroup<T = FeatureFlagType> {
    name: string;
    description: string;
    featureConfig?: FeatureConfig<T>;
    betaGroups?: BaseBetaGroup<T>[];
}

export interface BetaGroupParent<T = FeatureFlagType>
    extends Omit<Required<BaseBetaGroup<T>>, 'featureConfig'> {}

export interface BetaGroupWithFeatureFlags<T = FeatureFlagType>
    extends Omit<Required<BaseBetaGroup<T>>, 'betaGroups' | 'key'> {}

export interface BetaGroupWithFeatureFlagsAndBetaGroups<T = FeatureFlagType>
    extends BetaGroupParent<T>,
        BetaGroupWithFeatureFlags<T> {}

export const hasBetaGroups = (group: BaseBetaGroup): group is BetaGroupParent =>
    !!group?.betaGroups?.length;

export const hasFeatureFlags = (group: BaseBetaGroup): group is BetaGroupWithFeatureFlags =>
    !!group?.featureConfig?.key;

export const hasBetaGroupsAndFeatureFlags = (
    group: BaseBetaGroup,
): group is BetaGroupWithFeatureFlagsAndBetaGroups =>
    hasBetaGroups(group) && hasFeatureFlags(group) && hasBetaGroups(group);

export type BetaConfiguration = BaseBetaGroup;

export const narrowJsonType = (config: BetaGroupParent<string>): BetaGroupParent =>
    config as BetaGroupParent;
