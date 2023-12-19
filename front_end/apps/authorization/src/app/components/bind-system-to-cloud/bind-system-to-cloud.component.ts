import { CommonModule } from '@angular/common';
import {
    Component,
    computed,
    effect,
    EventEmitter,
    inject,
    Input,
    OnInit,
    Output,
    signal,
} from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { firstValueFrom } from 'rxjs';

import { BindToCloudService } from '@authorization/src/app/components/bind-system-to-cloud/bind-to-cloud.service';
import { BindResponse } from '@authorization/src/app/types/bind-service.types';
import { NxProcessButtonComponent } from '@components/process-button/process-button.component';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { environment } from '@environments/environment';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';

import { BindType, CloudBindData, Org } from '../../types/cloud-bind.types';
import { AuthFooterComponent } from '../auth-footer/auth-footer.component';
import { AuthHeaderComponent } from '../auth-header/auth-header.component';

import { SelectBindTypeComponent } from './select-bind-type/select-bind-type.component';
import { SelectOrgComponent } from './select-org/select-org.component';

enum BindDialogStates {
    error = 'error',
    initial = 'initial',
    selectOrg = 'selectOrg',
    finished = 'finished',
}

interface BindState {
    bindType: BindType | undefined;
    orgs: Org[];
    selectedOrg: Org | undefined;
    fsmState: BindDialogStates;
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
        NxProcessButtonComponent,
        AuthHeaderComponent,
        AuthFooterComponent,
        SelectBindTypeComponent,
        SelectOrgComponent,
    ],
})
export class BindSystemToCloudComponent implements OnInit {
    protected readonly environment = environment;
    @Input() set code(code: string) {
        this.code$$.set(code);
    }
    @Input() viewType: string = 'web';
    @Input({ required: true }) redirectUri: string | undefined;
    @Input({ required: true }) systemName: string | undefined;
    @Output() setCurrentState = new EventEmitter<string>();

    // Services
    private bindService = inject(BindToCloudService);
    private processService = inject(NxProcessService);
    bindSystem: Process;

    // Data
    code$$ = signal<string>('');
    // State management
    state$$ = signal<BindState>({
        bindType: undefined,
        orgs: [],
        selectedOrg: undefined,
        fsmState: BindDialogStates.initial,
    });
    readonly fsmStates = BindDialogStates;

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

    // Debugging state
    currentState = effect(() => {
        // eslint-disable-next-line no-console
        console.log(this.state$$());
    });

    // Auto Fetching orgs
    getOrgsEffect = effect(async () => {
        const code = this.code$$();
        if (code) {
            const orgs = await firstValueFrom(this.bindService.getOrgs(code));
            this.state$$.update(state => ({ ...state, orgs }));
        }
    });

    back(): void {
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
                this.cleanup();
                this.handleBindData(res);
            },
        );
    }

    cleanup(): void {
        this.bindService.deleteTokens().subscribe(() => {
            // Todo: handling returning info to the client
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
        } else if (this.redirectUri?.includes('https')) {
            const params = new URLSearchParams();
            Object.entries(bindInfo).forEach(([k, v]) => params.set(k, v));
            const bindQs = params.toString();
            window.location.href = `${this.redirectUri}${
                this.redirectUri?.includes('?') ? '&' : '?'
            }${bindQs}`;
        }
    }
}
