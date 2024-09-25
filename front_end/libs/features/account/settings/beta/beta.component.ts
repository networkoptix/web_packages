import { CommonModule } from '@angular/common';
import { Component, computed, inject, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { firstValueFrom, from } from 'rxjs';

import { NxCheckboxModule } from '@components/checkbox/checkbox.module';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { NxTypedTemplateDirective } from '@directives/nx-typed-template.directive';
import { PipesModule } from '@pipes/pipes.module';
import { NxCloudApiService } from '@services/nx-cloud-api';
import { FeatureFlagKeys, FeatureFlagType } from '@services/nx-config/base-config';
import { nxConfig } from '@services/nx-config/config';
import { DynamicConfig } from '@services/nx-config/dynamic-config';
import { getBetaConfig, extractChildGroups } from '@utils/beta-features';
import { BaseBetaGroup, BetaConfiguration, hasFeatureFlags } from '@utils/beta-features/beta.types';
import _noBetaFeaturesAvailable from '@utils/beta-features/no-beta.config.json';

const noBetaFeaturesAvailable = _noBetaFeaturesAvailable as BetaConfiguration;

const onlyValidFlags = (flag: FeatureFlagType): boolean => FeatureFlagKeys.includes(flag);

@Component({
    selector: 'nx-beta-settings-component',
    templateUrl: 'beta.component.html',
    styleUrls: ['beta.component.scss'],
    imports: [
        CommonModule,
        FormsModule,
        PipesModule,
        NxCheckboxModule,
        NxPreLoaderComponent,
        NxTypedTemplateDirective,
    ],
    standalone: true,
})
export class NxBetaSettingsBetaComponent {
    requiresReload = output<boolean>();

    /**
     * Use for development and maybe as a fallback.
     *
     * Should add to CMS or something.
     */
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    betaFeatureConfig = toSignal(from(getBetaConfig()));

    cmsFeatureFlags$$ = toSignal(
        from(
            DynamicConfig.getData().then(data => data.featureFlags as typeof nxConfig.featureFlags),
        ),
    );

    currentFeatureFlags = signal(nxConfig.featureFlags);

    betaOptions$$ = computed(() => {
        const betaFeatureConfig = this.betaFeatureConfig();
        const cmsFeatureFlags = this.cmsFeatureFlags$$();

        if (!betaFeatureConfig || !cmsFeatureFlags) {
            return noBetaFeaturesAvailable;
        }

        const flagIsEnabled = (flag: FeatureFlagType): boolean => !!cmsFeatureFlags[flag];

        const filterBetaGroups = (group: BaseBetaGroup): BaseBetaGroup | undefined => {
            const requiredFlags = [...extractChildGroups(group)]
                .flatMap(group => group.featureConfig?.flags || [])
                .filter(onlyValidFlags);

            if (requiredFlags.every(flagIsEnabled)) {
                return;
            }

            return {
                ...group,
                betaGroups: group.betaGroups
                    ?.map(filterBetaGroups)
                    .filter((val): val is BaseBetaGroup => val !== undefined),
            };
        };

        return filterBetaGroups(betaFeatureConfig) || noBetaFeaturesAvailable;
    });
    loaded$$ = computed(
        () => this.betaFeatureConfig() && this.cmsFeatureFlags$$() && this.betaSettingsValues$$(),
    );

    betaSettings = inject(NxCloudApiService).customAccountPropertyFactory(
        'betaSettings',
        {} as Record<string, boolean>,
    );

    betaSettingsValues$$ = computed(() => {
        const betaOptions = this.betaOptions$$();
        const currentFeatureFlags = this.currentFeatureFlags();
        if (!betaOptions) {
            return {};
        }
        const flattenedBetaOptions = [...extractChildGroups(betaOptions)];
        const defaults = flattenedBetaOptions.reduce(
            (acc, group) =>
                hasFeatureFlags(group)
                    ? {
                          ...acc,
                          [group.featureConfig.key]: false,
                      }
                    : acc,
            <Record<string, boolean>>{},
        );
        const userSettings = {
            ...defaults,
            ...this.betaSettings.signal$$(),
        };
        const flagIsEnabled = (flag: FeatureFlagType): boolean => !!currentFeatureFlags[flag];

        const checkIfEnabled = (key: string, value: boolean): boolean => {
            const group = flattenedBetaOptions
                .filter(hasFeatureFlags)
                .find(group => group.featureConfig.key === key);

            if (group) {
                const subGroups = [...extractChildGroups(group)];
                if (subGroups.length === 1) {
                    return value;
                }

                const requiredFlags = subGroups
                    .flatMap(group => group.featureConfig?.flags || [])
                    .filter(onlyValidFlags);

                return requiredFlags.every(flagIsEnabled);
            }

            return value;
        };
        return Object.entries(userSettings).reduce(
            (acc, [key, value]) => ({ ...acc, [key]: checkIfEnabled(key, value) }),
            {} as typeof userSettings,
        );
    });

    setValue = async (group: BaseBetaGroup, value: boolean): Promise<void> => {
        this.requiresReload.emit(true);
        const groupsWithFeatureFlags = [...extractChildGroups(group)].filter(hasFeatureFlags);
        const groupsToUpdate = groupsWithFeatureFlags
            .map(group => group.featureConfig.key)
            .reduce((acc, key) => ({ ...acc, [key]: value }), {});
        await firstValueFrom(
            this.betaSettings.update(current => ({
                ...current,
                ...groupsToUpdate,
            })),
        );
        if ([...extractChildGroups(group)].some(group => group.featureConfig?.immediateReload)) {
            window.location.reload();
        }

        const updatedFlags = groupsWithFeatureFlags
            .flatMap(group => group.featureConfig.flags)
            .reduce(
                (acc, flag) => ({
                    ...acc,
                    [flag]: value,
                }),
                <typeof nxConfig.featureFlags>{},
            );
        this.currentFeatureFlags.update(current => ({
            ...current,
            ...updatedFlags,
        }));
    };
}
