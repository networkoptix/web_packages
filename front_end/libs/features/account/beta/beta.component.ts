import { CommonModule } from '@angular/common';
import { Component, computed, inject, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { firstValueFrom, from } from 'rxjs';

import { NxCheckboxModule } from '@components/checkbox/checkbox.module';
import { NxContentBlockComponent } from '@components/content-block/content-block.component';
import { NxContentBlockSectionComponent } from '@components/content-block/section/section.component';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { NxSwitchComponent } from '@components/switch/switch.component';
import { NxTypedTemplateDirective } from '@directives/nx-typed-template.directive';
import { NxMenuService } from '@menu/menu.service';
import { PipesModule } from '@pipes/pipes.module';
import { NxCloudApiService } from '@services/nx-cloud-api';
import { FeatureFlagKeys, FeatureFlagType } from '@services/nx-config/base-config';
import { nxConfig } from '@services/nx-config/config';
import { DynamicConfig } from '@services/nx-config/dynamic-config';
import { getBetaConfig } from '@utils/beta-features';
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
        TranslateModule,
        NxCheckboxModule,
        NxPreLoaderComponent,
        NxTypedTemplateDirective,
        NxContentBlockComponent,
        NxContentBlockSectionComponent,
        NxSwitchComponent,
    ],
    standalone: true,
})
export class NxBetaSettingsBetaComponent {
    requiresReload = output<boolean>();
    requiresReload$$ = signal(false);
    /**
     * Use for development and maybe as a fallback.
     * Should add to CMS or something.
     */
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
            const requiredFlags = group.featureConfig?.flags.filter(onlyValidFlags) || [];

            if (requiredFlags.every(flagIsEnabled)) {
                return;
            }

            return { ...group };
        };

        return (
            betaFeatureConfig
                .map(filterBetaGroups)
                .filter((val): val is BaseBetaGroup => val !== undefined) || noBetaFeaturesAvailable
        );
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

        const defaults = betaOptions.reduce<Record<string, boolean>>((acc, group) => {
            if (hasFeatureFlags(group)) {
                acc[group.featureConfig.key] = false;
            }
            return acc;
        }, {});

        const userSettings = {
            ...defaults,
            ...this.betaSettings.signal$$(),
        };
        const flagIsEnabled = (flag: FeatureFlagType): boolean => !!currentFeatureFlags[flag];

        const checkIfEnabled = (key: string, value: boolean): boolean => {
            const group = betaOptions
                .filter(hasFeatureFlags)
                .find(group => group.featureConfig.key === key);

            if (group) {
                const requiredFlags = group.featureConfig?.flags.filter(onlyValidFlags) || [];
                return requiredFlags.every(flagIsEnabled);
            }
            return value;
        };
        const result = Object.entries(userSettings).reduce(
            (acc, [key, value]) => ({ ...acc, [key]: checkIfEnabled(key, value) }),
            {} as typeof userSettings,
        );
        return result;
    });

    private menuService = inject(NxMenuService);

    constructor() {
        this.menuService.navItemId$$.set('beta');
    }

    setValue = async (group: BaseBetaGroup, value: boolean): Promise<void> => {
        this.requiresReload.emit(true);
        const groupsWithFeatureFlags = [group].filter(hasFeatureFlags);
        const groupsToUpdate = groupsWithFeatureFlags
            .map(group => group.featureConfig.key)
            .reduce((acc, key) => ({ ...acc, [key]: value }), {});

        try {
            await firstValueFrom(
                this.betaSettings.update(current => ({
                    ...current,
                    ...groupsToUpdate,
                })),
            );

            if (group.featureConfig?.immediateReload) {
                window.location.reload();
            }

            const updatedFlags = groupsWithFeatureFlags
                .flatMap(group => group.featureConfig.flags)
                .reduce(
                    (acc, flag) => {
                        acc[flag] = value;
                        return acc;
                    },
                    {} as typeof nxConfig.featureFlags,
                );

            this.currentFeatureFlags.update(current => ({
                ...current,
                ...updatedFlags,
            }));

            // TODO: Display SUCCESS / WARNING banner
        } catch (error) {
            console.error('Error updating beta settings:', error);
            // TODO: Display ERROR banner
        }
    };
}
