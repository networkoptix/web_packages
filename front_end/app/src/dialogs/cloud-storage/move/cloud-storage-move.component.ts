import { HttpClient } from '@angular/common/http';
import {
    Component,
    Renderer2,
    ViewChild,
    Input,
    OnInit
} from '@angular/core';
import type { NgForm } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { BehaviorSubject } from 'rxjs';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { DropdownItem } from '@components/dropdowns/generic/dropdown.component.types';
import * as t from '@services/nx-cloud-api.types';
import { NxConfigService, IConfig } from '@services/nx-config';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxProcessService, Process } from '@services/process.service';
import { NxSystem } from '@services/system.service';
import { NxSystemsService } from '@services/systems.service';

import { NxModalGenericComponent } from '../../generic/generic.component';

@Component({
    selector: 'nx-cloud-storage-move-content',
    templateUrl: 'cloud-storage-move.component.html',
    styleUrls: ['cloud-storage-move.component.scss']
})
export class CloudStorageMoveModalContent implements OnInit {
    @Input() system$: BehaviorSubject<NxSystem>;
    @Input() updateCallback: () => void;

    LANG: LanguageI18NStaticTypes;
    CONFIG: IConfig;

    targetSystems: DropdownItem[];
    errorText: string;
    move: Process;

    systemId = '';
    userEmail = '';
    target$ = new BehaviorSubject('');
    targetOnline$ = new BehaviorSubject(true);
    showNoOtherSystems = false;

    @ViewChild('moveForm') moveForm: NgForm;

    constructor(
        configService: NxConfigService,
        languageService: NxLanguageProviderService,
        public activeModal: NgbActiveModal,
        public renderer: Renderer2,
        private http: HttpClient,
        private systemsService: NxSystemsService,
        private processService: NxProcessService,
        private genericModal: NxModalGenericComponent
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = languageService.translations;

        this.targetSystems = [];
        this.errorText = '';
    }

    private moveCloudStorage(
        sourceSystemId: string,
        destinationSystemId: string
    ) {
        return this.http.post<t.CloudResponse>(
            this.CONFIG.apiBase + '/storage/move',
            { sourceSystemId, destinationSystemId }
        ).toPromise();
    }

    ngOnInit() {
        this.system$.subscribe(system => {
            if (!system || !system.id) {
                return;
            }
            this.systemId = system.id;
            this.userEmail = system.currentUserEmail;
            this.systemsService.getMySystems(this.userEmail, this.systemId);
            this.systemsService.systemsSubject.subscribe((systems: any[]) => {
                // Generate dropdown items
                this.targetSystems = systems
                    .filter(({ id }) => id !== this.systemId)
                    .map(({ id: value, name, stateOfHealth: state }) => ({
                        value,
                        state,
                        name: `<span>${name}</span><span class="${state === 'offline' ? 'text-muted' : ''}"> – ${state}</span>`
                    }));

                this.setTargetSystem(this.targetSystems[0]);
                if (systems && this.targetSystems.length < 2) {
                    // Display noOtherSystemsError when current system is the only system
                    this.close();
                    const {
                        dialogs: {
                            cloudStorage: {
                                noOtherSystemsError: { message },
                                moveCloudStorage: { title }
                            },
                            buttons: { ok }
                        }
                    } = this.LANG;
                    this.genericModal.openConfirm(message?.(), title?.(), ok?.());
                }
            });
        });

        // Move Process
        this.move = this.processService.createProcess(
            () => this.moveCloudStorage(this.systemId, this.currentTarget),
            {
                errorCodes: {
                    500: () => {
                        return this.LANG.common.systemServerError?.();
                    },
                    notFound: () => {
                        return this.LANG.dialogs.cloudStorage.moveCloudStorage.notFound?.();
                    },
                    cloudInvalidResponse: () => {
                        return this.LANG.errorCodes.notAuthorized?.();
                    },
                    networkConnection: () => {
                        return this.LANG.errorCodes.networkConnection();
                    }
                },
                successMessage: this.LANG.dialogs.cloudStorage.moveCloudStorage.success?.(),
                errorPrefix: this.LANG.dialogs.cloudStorage.moveCloudStorage.errorPrefix?.()
            }
        ).then(() => {
            this.updateCallback();
            this.close();
        });
    }

    // Getters for view
    public get currentTarget() {
        return this.target$.value;
    }

    public get currentTargetOnline() {
        return this.targetOnline$.value;
    }

    // Other instance methods
    close() {
        this.activeModal.close();
    }

    setTargetSystem({ value, state }: DropdownItem) {
        this.target$.next(value as string);
        this.targetOnline$.next(state !== 'offline');
        if (value === 'otherSystem') {
            // TODO: Moving to a system that isn't already setup on cloud wasn't in spec, should it be implemented?
            this.errorText = "this isn't implemented, not sure if it should be";
        }

        this.systemsService.getSystem(value as string).toPromise().then(({ state }) => {
            if (state === 'offline') {
                this.errorText = this.LANG.dialogs.cloudStorage.moveCloudStorage.status.offline?.();
            } else {
                this.errorText = '';
            }
        });
    }
}
