import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, Input, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { untilDestroyed } from '@ngneat/until-destroy';
import { lastValueFrom, Observable, OperatorFunction, Subscription } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';

import { NxContentBlockComponent } from '@components/content-block/content-block.component';
import { NxContentBlockSectionComponent } from '@components/content-block/section/section.component';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { NxCloudApiService } from '@services/nx-cloud-api';
import { CustomAccountProperty } from '@services/nx-cloud-api/custom-account-property';
import { EventRule } from '@services/system-api.types/events.types';
import { NxSystem } from '@services/system.service/system';
import { delayInitial } from '@utils/general';

class AlexaSettings {
    static CUSTOM_PROPERTY_ENDPOINT = 'alexa';

    constructor(
        public enabled = false,
        public selectedSystem: string = '',
        public accountLinked = false,
        public eventRulesSetup = false,
    ) {}

    static clean = (selectedSystem: string) => (input: Partial<AlexaSettings>) =>
        new AlexaSettings(
            input.enabled || false,
            input.selectedSystem || selectedSystem,
            input.accountLinked || false,
            input.eventRulesSetup || false,
        );

    static cleanObservable = (
        selectedSystem: string,
    ): OperatorFunction<Partial<AlexaSettings>, AlexaSettings> => {
        const cleanedSystem = AlexaSettings.clean(selectedSystem);
        return map(cleanedSystem, cleanedSystem);
    };
}

@Component({
    selector: 'nx-alexa',
    templateUrl: './alexa.component.html',
    styleUrls: ['./alexa.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        NxContentBlockComponent,
        NxContentBlockSectionComponent,
        NxPreLoaderComponent,
    ],
})
export class NxAlexaComponent implements OnInit {
    @Input({ required: true }) system: NxSystem;

    private cloudApi = inject(NxCloudApiService);
    private destroyRef = inject(DestroyRef);

    alexaSettings: Partial<AlexaSettings>;
    alexaSettingsCustomProperty: CustomAccountProperty<Partial<AlexaSettings>> =
        this.cloudApi.customAccountPropertyFactory(
            AlexaSettings.CUSTOM_PROPERTY_ENDPOINT,
            new AlexaSettings(),
        );
    eventRulesBeingSetup = false;

    ngOnInit(): void {
        delayInitial(this.alexaSettingsCustomProperty.value$)
            .pipe(
                AlexaSettings.cleanObservable(this.system.id),
                switchMap(this.syncEventRulesSetup),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe({
                next: settings => {
                    this.alexaSettings = settings;
                },
                error: _ => {
                    this.alexaSettings = {};
                },
            });
    }

    updateEventRules = (settings = { enabled: true }): Promise<unknown> => {
        this.eventRulesBeingSetup = settings.enabled;
        return lastValueFrom(
            delayInitial(this.system.updateAlexaRules(settings.enabled)).pipe(
                catchError(error => {
                    console.error(error);
                    return delayInitial(Promise.resolve(false));
                }),
                tap(setup => {
                    if (settings.enabled) {
                        this.alexaSettings = settings;
                        this.alexaSettings.eventRulesSetup = !!setup && settings.enabled;
                    }
                    this.eventRulesBeingSetup = false;
                    this.alexaSettingsCustomProperty.save(this.alexaSettings, true);
                }),
            ),
        );
    };

    private syncEventRulesSetup = (
        settings: Partial<AlexaSettings>,
    ): Observable<Partial<AlexaSettings>> => {
        return this.system.mediaserver.getEventRules().pipe(
            switchMap(async rules => {
                const checkCommand = (command: string): EventRule | undefined =>
                    rules.find(rule => {
                        const condition = JSON.parse(rule.eventCondition);
                        const resourceName = condition.resourceName;
                        return resourceName === command;
                    });
                const currentUserEmail = this.system.permissionManager.currentUser$$().email;
                const layoutCommand = `"Alexa layout command for ${currentUserEmail}"`;
                const customCommand = `"Alexa command for ${currentUserEmail}"`;
                const rulesSetup = !!checkCommand(layoutCommand) && !!checkCommand(customCommand);
                if (settings.eventRulesSetup !== rulesSetup) {
                    settings.eventRulesSetup = rulesSetup;
                    await this.alexaSettingsCustomProperty.save(settings, true);
                }
                return settings;
            }),
        );
    };

    private updateAlexa = (settings: Partial<AlexaSettings>): Subscription =>
        delayInitial(this.alexaSettingsCustomProperty.save(settings))
            .pipe(
                tap(settings => {
                    this.alexaSettings = settings;
                }),
                switchMap(this.updateEventRules),
                map(setup => ({ ...settings, eventRulesSetup: !!setup })),
                untilDestroyed(this),
            )
            .subscribe(settings => {
                this.alexaSettings = settings;
                this.alexaSettingsCustomProperty.save(this.alexaSettings, true);
            });

    toggleAlexaEnabled = (): void => {
        const {
            enabled,
            // selectedSystem,
            accountLinked = false,
            eventRulesSetup = false,
        } = this.alexaSettings;
        this.alexaSettings = new AlexaSettings();
        this.updateAlexa(
            enabled
                ? {
                      enabled: false,
                      accountLinked,
                  }
                : {
                      enabled: true,
                      accountLinked,
                      eventRulesSetup,
                      selectedSystem: this.system.id,
                  },
        );
    };

    toggleSystemSelected = (): void => {
        if (this.alexaSettings.selectedSystem === this.system.id) {
            return;
        }
        const { enabled, accountLinked = false, eventRulesSetup = false } = this.alexaSettings;
        this.alexaSettings = new AlexaSettings();
        this.updateAlexa({
            enabled,
            accountLinked,
            eventRulesSetup,
            selectedSystem: this.system.id,
        });
    };
}
