import { CommonModule } from '@angular/common';
import {
    Component,
    computed,
    effect,
    EventEmitter,
    inject,
    input,
    Input,
    OnInit,
    Output,
    signal,
} from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { firstValueFrom } from 'rxjs';

import { AuthorizeState } from '@authorization/src/app/components/authorize.component.types';
import { BindErrorStateComponent } from '@authorization/src/app/components/bind-system-to-cloud/bind-error-state/bind-error-state.component';
import { BindToCloudService } from '@authorization/src/app/components/bind-system-to-cloud/bind-to-cloud.service';
import { BindResponse } from '@authorization/src/app/types/bind-service.types';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { NxProcessButtonComponent } from '@components/process-button/process-button.component';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { environment } from '@environments/environment';
import { nxConfig } from '@services/nx-config/config';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';
import { icons } from '@static-variables';

import { BindType, CloudBindData, Org } from '../../types/cloud-bind.types';
import { AuthFooterComponent } from '../auth-footer/auth-footer.component';
import { AuthHeaderComponent } from '../auth-header/auth-header.component';

import { SelectBindTypeComponent } from './select-bind-type/select-bind-type.component';
import { SelectOrgComponent } from './select-org/select-org.component';

enum BindDialogStates {
    error = 'error',
    initial = 'initial',
    confirmAccount = 'confirmAccount',
    selectOrg = 'selectOrg',
    finished = 'finished',
}

interface BindState {
    bindType: BindType | undefined;
    email: string;
    orgs: Org[];
    selectedOrg: Org | undefined;
    fsmState: BindDialogStates | undefined;
}

@Component({
    selector: 'nx-bind-system-to-cloud',
    templateUrl: './bind-system-to-cloud.component.html',
    styleUrls: ['./bind-system-to-cloud.component.scss'],
    standalone: true,
    providers: [BindToCloudService],
    imports: [
        CommonModule,
        TranslateModule,
        AngularSvgIconModule,
        NxAddSvgSrcDirective,
        NxPreLoaderComponent,
        NxProcessButtonComponent,
        AuthHeaderComponent,
        AuthFooterComponent,
        SelectBindTypeComponent,
        SelectOrgComponent,
        BindErrorStateComponent,
    ],
})
export class BindSystemToCloudComponent implements OnInit {
    protected readonly environment = environment;
    protected readonly icons = icons;
    readonly fsmStates = BindDialogStates;

    code$$ = input.required<string>({ alias: 'code' });

    @Input() viewType: string = 'web';
    @Input({ required: true }) redirectUri: string | undefined;
    @Input({ required: true }) systemName: string | undefined;
    @Output() setCurrentState = new EventEmitter<string>();

    // Services
    private bindService = inject(BindToCloudService);
    private processService = inject(NxProcessService);
    private channelPartnersEnabled = nxConfig.featureFlags.channelPartners;
    bindSystem: Process;

    // State management
    state$$ = signal<BindState>({
        bindType: undefined,
        email: '',
        orgs: [],
        selectedOrg: undefined,
        fsmState: undefined,
    });

    // selectors
    fsmState$$ = computed(() => this.state$$().fsmState);
    orgs$$ = computed(() => this.state$$().orgs);
    readyToBind$$ = computed(() => {
        const { bindType, selectedOrg } = this.state$$();
        return bindType === BindType.account || !!selectedOrg;
    });

    // actions
    set bindType(bindType: BindType) {
        this.state$$.update(state => ({ ...state, bindType }));
    }

    set fsmState(fsmState: BindDialogStates) {
        this.state$$.update(state => ({ ...state, fsmState }));
    }

    set selectedOrg(org: Org | undefined) {
        this.state$$.update(state => ({ ...state, selectedOrg: org }));
    }

    // Auto Fetching orgs
    getOrgsEffect = effect(async () => {
        const code = this.code$$();
        if (code) {
            await firstValueFrom(this.bindService.getTokens(code));
            if (!this.channelPartnersEnabled) {
                const flags = await firstValueFrom(this.bindService.fetchFlags());
                this.channelPartnersEnabled = flags?.channelPartners;
            }
            if (this.channelPartnersEnabled) {
                const orgs = await firstValueFrom(this.bindService.getOrgs());
                this.state$$.update(state => ({
                    ...state,
                    orgs,
                    fsmState: BindDialogStates.initial,
                    email: this.bindService.getEmailFromToken(),
                }));
            } else {
                this.state$$.update(state => ({
                    ...state,
                    bindType: BindType.account,
                    fsmState: BindDialogStates.confirmAccount,
                    email: this.bindService.getEmailFromToken(),
                }));
            }
        }
    });

    back(): void {
        if (!this.channelPartnersEnabled || this.fsmState$$() === BindDialogStates.initial) {
            this.setCurrentState.emit(AuthorizeState.email);
            this.cleanup();
        }
        this.state$$.update(state => ({
            ...state,
            bindType: undefined,
            selectedOrg: undefined,
            fsmState: BindDialogStates.initial,
        }));
    }

    setBindType(option: BindType): void {
        this.bindType = option;
        if (option === BindType.account) {
            this.selectedOrg = undefined;
            this.fsmState = BindDialogStates.confirmAccount;
        } else if (this.orgs$$().length === 1) {
            this.selectedOrg = this.state$$().orgs[0];
        } else {
            this.fsmState = BindDialogStates.selectOrg;
        }
    }

    ngOnInit(): void {
        this.bindSystem = this.processService.createProcess(
            () => {
                const { bindType, selectedOrg } = this.state$$();
                const name = this.systemName || 'New Cloud System'; // This is just incase systemName somehow changes
                if (bindType === BindType.account) {
                    return firstValueFrom(this.bindService.bindToAccount(name));
                }
                if (!selectedOrg) {
                    return Promise.reject('badRequest');
                }
                return firstValueFrom(this.bindService.bindToOrg(name, selectedOrg.id));
            },
            { errorCodes: { badRequest: 'Org was not selected' }, ignoreError: true },
            (res: BindResponse) => {
                this.handleBindData(res);
            },
            () => {
                this.fsmState = BindDialogStates.error;
            },
        );
    }

    cleanup(): void {
        this.bindService.deleteTokens().subscribe(() => {
            // eslint-disable-next-line no-console
            console.log('jobs done');
        });
    }

    handleBindData(data: BindResponse): void {
        const bindInfo: CloudBindData = {
            systemId: data.id,
            authKey: data.authKey,
            owner: ('ownerAccountEmail' in data && data.ownerAccountEmail) || '',
            organizationId: ('organizationId' in data && data.organizationId) || '',
        };

        if (window.nativeClient) {
            nativeClient.setBindInfo(bindInfo);
            nativeClient.setTokens(this.bindService.tokensForVMS$$());
            return;
        }
        // If oauth isn't open in the desktop client kill off the tokens used for binding
        this.cleanup();
        if (this.redirectUri?.includes('https')) {
            const params = new URLSearchParams();
            Object.entries(bindInfo).forEach(([k, v]) => params.set(k, v));
            const bindQs = params.toString();
            window.location.href = `${this.redirectUri}${
                this.redirectUri?.includes('?') ? '&' : '?'
            }${bindQs}`;
        }
    }
}
