import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, ViewChild, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule, NgForm } from '@angular/forms';
import { MatButtonToggle, MatButtonToggleGroup } from '@angular/material/button-toggle';
import { LetDirective } from '@ngrx/component';
import { Store } from '@ngrx/store';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { NgxTranslateCutModule } from 'ngx-translate-cut';
import { BehaviorSubject, distinctUntilChanged, firstValueFrom, map, of } from 'rxjs';

import * as cpActions from '@common/store/channel-partners/channel-partners.actions';
import {
    selectRootChannelPartners,
    selectCurrentPartner,
    selectCurrentPartnerId,
    selectCurrentSubchannelPartners,
} from '@common/store/channel-partners/channel-partners.selectors';
import { NxContentBlockComponent } from '@components/content-block/content-block.component';
import { NxContentBlockSectionComponent } from '@components/content-block/section/section.component';
import { NxGenericDropdownModule } from '@components/dropdowns/generic/dropdown.module';
import { NxProcessButtonComponent } from '@components/process-button/process-button.component';
import { NxProcessCancelButtonComponent } from '@components/process-cancel-Button/process-cancel-button.component';
import { NxFocusMeDirective } from '@directives/nx-focus-me';
import staticLang from '@language_static';
import { settingsViews } from '@pages/home/home.types';
import { PermissionsStore } from '@pages/home/store/permissions/permissions.store';
import { NxChannelPartnersService } from '@services/channel-partners.service';
import {
    ChannelPartner,
    State,
    UpdateChannelPartner,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { nxConfig } from '@services/nx-config/config';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';
import { icons, MAX_NAME_LENGTH } from '@static-variables';

import { NxSettingsGeneralComponent } from '../../settings/components/general/general.component';
import { NxSettingsStateComponent } from '../../settings/components/state/state.component';

interface SettingsState {
    view?: string;
    item?: ChannelPartner;
    canUpdateStatus: boolean;
}

@Component({
    selector: 'nx-channel-partners-settings',
    templateUrl: 'channel-partners-settings.component.html',
    styleUrls: ['channel-partners-settings.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        NxSettingsGeneralComponent,
        NxSettingsStateComponent,
        NxProcessButtonComponent,
        NxProcessCancelButtonComponent,
        TranslateModule,
        AngularSvgIconModule,
        FormsModule,
        LetDirective,
        MatButtonToggle,
        MatButtonToggleGroup,
        NgxTranslateCutModule,
        NxContentBlockComponent,
        NxContentBlockSectionComponent,
        NxFocusMeDirective,
        NxGenericDropdownModule,
    ],
})
export class NxChannelPartnersSettingsComponent implements OnInit {
    LANG = staticLang;
    readonly canChangeStateUI = nxConfig.featureFlags.channelPartnersChangeStateUI;
    readonly settingsViews = settingsViews;
    permissionsStore = inject(PermissionsStore);
    channelPartners$$ = this.store.selectSignal(selectRootChannelPartners);
    currentPartner$$ = this.store.selectSignal(selectCurrentPartner);
    currentPartnerId$$ = this.store.selectSignal(selectCurrentPartnerId);
    subchannelPartners$$ = this.store.selectSignal(selectCurrentSubchannelPartners);
    currentName$ = new BehaviorSubject<string | null>(null);
    currentState$ = new BehaviorSubject<State | null>(null);
    updateStateProcess: Process;
    // eslint-disable-next-line nx/signal-naming-convention
    subchannelSettings = input<boolean>();

    subChannelId$$ = toSignal(
        this.cpService.paramStateHandler.state$.pipe(
            map(({ params: { subchannelId } }) => subchannelId),
            distinctUntilChanged(),
        ),
    );

    currentState$$ = computed<SettingsState>(() => {
        const currentPartner = this.currentPartner$$();
        const state: SettingsState = {
            canUpdateStatus: currentPartner?.effectiveState === 'active',
        };

        // Leaving subChannels in this component for now because they will be removed altogether later on.

        if (this.subchannelSettings()) {
            const subchannelsMap = new Map<string, ChannelPartner>(
                this.subchannelPartners$$().map(partner => [partner.id, partner]),
            );
            state.item = subchannelsMap.get(this.subChannelId$$());
            state.view = settingsViews.SUBCHANNELS;
        } else {
            state.item = currentPartner;
            state.view = settingsViews.CHANNEL_PARTNERS;
        }
        return state;
    });

    // This pattern is not idea, but because we are not live updating the page it's okay for now.
    effectState$$ = computed<State>(() => {
        const state = this.currentState$$().item.state;
        this.currentState$.next(state);
        return state;
    });

    name$$ = computed<string>(() => {
        const name = this.currentState$$().item.name;
        this.currentName$.next(name);
        return name;
    });

    // Think about these
    permissions$$ = computed(() => {
        const { canChangePartnerState$$, canViewPartnerSettings$$ } = this.permissionsStore;
        return {
            canAlterState: canChangePartnerState$$(),
            canConfigure: canViewPartnerSettings$$(),
        };
    });

    State = State;

    @ViewChild('settingsGeneralForm') private settingsGeneralForm: NgForm;

    constructor(
        private store: Store,
        private processService: NxProcessService,
        private cpService: NxChannelPartnersService,
    ) {}

    ngOnInit(): void {
        this.updateStateProcess = this.processService.createProcess(
            () => {
                const currentState = this.currentState$$();
                switch (currentState.view) {
                    case this.settingsViews.CHANNEL_PARTNERS:
                        return this.updateChannelPartner();
                    case this.settingsViews.SUBCHANNELS:
                        return this.updateSubchannel(currentState);
                    default:
                        console.error('Invalid current view');
                }
                return firstValueFrom(of(true));
            },
            {},
            res => {
                const currentState = this.currentState$$();
                switch (currentState.view) {
                    case this.settingsViews.SUBCHANNELS:
                        this.updateSubchannelStore(res);
                        break;
                    case this.settingsViews.CHANNEL_PARTNERS:
                        this.updateChannelPartnerStore(res);
                        break;
                }

                this.resetUpdates();
            },
            () => {},
        );
    }

    handleStateUpdate = (state: State): void => {
        this.currentState$.next(state);
    };
    get generalHasChange(): boolean {
        return this.currentName$.value !== this.name$$();
    }

    get stateHasChange(): boolean {
        return this.currentState$.value !== this.effectState$$();
    }

    resetUpdates = (): void => {
        this.currentState$.next(this.effectState$$());
        this.currentName$.next(this.name$$());
    };

    // Process helper functions
    updateChannelPartner(): Promise<ChannelPartner> {
        const cpBody: UpdateChannelPartner = {};
        if (this.name$$() !== this.currentName$.value) {
            cpBody.name = this.currentName$.value;
        }
        if (this.effectState$$() !== this.currentState$.value) {
            cpBody.state = this.currentState$.value;
        }
        // Todo: add extId to body when API is ready
        return firstValueFrom(
            this.cpService.updateChannelPartner(this.currentPartnerId$$(), cpBody),
        );
    }

    updateChannelPartnerStore(updatedPartner: ChannelPartner): void {
        const currPartners = [...this.channelPartners$$()];
        const currPartnerIndex = currPartners.findIndex(
            partner => partner.id === updatedPartner.id,
        );
        currPartners[currPartnerIndex] = updatedPartner;
        this.store.dispatch(cpActions.setChannelPartners({ channelPartners: currPartners }));
    }

    updateSubchannel(currentState: SettingsState): Promise<ChannelPartner> {
        const subchannelBody: UpdateChannelPartner = {};
        if (this.name$$() !== this.currentName$.value) {
            subchannelBody.name = this.currentName$.value;
        }
        if (this.effectState$$() !== this.currentState$.value) {
            subchannelBody.state = this.currentState$.value;
        }
        return firstValueFrom(
            this.cpService.updateChannelPartner(currentState.item?.id, subchannelBody),
        );
    }

    updateSubchannelStore(updatedSubchannel: ChannelPartner): void {
        const subchannelPartners = [...this.subchannelPartners$$()];
        const subchannelIndex = subchannelPartners.findIndex(
            partner => partner.id === updatedSubchannel.id,
        );
        subchannelPartners[subchannelIndex] = updatedSubchannel;
        this.store.dispatch(
            cpActions.setCurrentSubchannelPartners({
                currentSubchannels: subchannelPartners,
            }),
        );
    }

    onNameChange(value: string): void {
        const { partnerName } = this.settingsGeneralForm?.controls;

        if (value.length === 0) {
            partnerName.setErrors({ required: true });
            partnerName.markAsTouched();
            partnerName.markAsDirty();
        } else if (value.length > MAX_NAME_LENGTH) {
            partnerName.setErrors({ tooLong: true });
            partnerName.markAsTouched();
            partnerName.markAsDirty();
        } else {
            partnerName.setErrors(null);
        }
        this.currentName$.next(value);
    }

    protected readonly MAX_NAME_LENGTH = MAX_NAME_LENGTH;
    protected readonly icons = icons;
}
