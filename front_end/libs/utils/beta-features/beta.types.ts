import type { FeatureFlagType } from '@services/nx-config/base-config';

export interface FeatureConfig<T = FeatureFlagType> {
    key: string;
    immediateReload?: boolean;
    flags: T[];
}

export interface BaseBetaGroup<T = FeatureFlagType> {
    name: string;
    description: string;
    // Future implementation; Mentioned in CLOUD-15158
    enabledDescription?: string;
    featureConfig: FeatureConfig<T>;
}

export interface BetaGroupParent<T = FeatureFlagType>
    extends Omit<Required<BaseBetaGroup<T>[]>, 'featureConfig'> {}

export interface BetaGroupWithFeatureFlags<T = FeatureFlagType>
    extends Omit<Required<BaseBetaGroup<T>>, 'betaGroups' | 'key'> {}

export const hasFeatureFlags = (group: BaseBetaGroup): group is BetaGroupWithFeatureFlags =>
    !!group?.featureConfig.key;

export type BetaConfiguration = BaseBetaGroup[];

export const narrowJsonType = (config: BetaGroupParent<string>): BetaConfiguration =>
    config as BetaConfiguration;
