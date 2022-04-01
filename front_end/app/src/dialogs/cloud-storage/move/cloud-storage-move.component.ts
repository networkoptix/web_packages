import { HttpClient } from '@angular/common/http';
import {
    Component,
    Renderer2,
    ViewChild,
    Input,
    OnInit,
    Inject
} from '@angular/core';
import type { NgForm } from '@angular/forms';
import { BehaviorSubject } from 'rxjs';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { DropdownItem } from '@components/dropdowns/generic/dropdown.component.types';
import { DIALOG_DATA, DialogRef } from '@dialogs/dialog-ref';
import * as t from '@services/nx-cloud-api.types';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxProcessService, Process } from '@services/process.service';
import type { NxSystem } from '@services/system.service/system';
import { NxSystemsService } from '@services/systems.service';
import { pickFrom } from '@utils/general';

interface SystemDropdownItem extends DropdownItem<string> {
    state: string;
}

@Component({
    selector: 'nx-cloud-storage-move-content',
    templateUrl: 'cloud-storage-move.component.html',
    styleUrls: ['cloud-storage-move.component.scss']
})
export class CloudStorageMoveModalContent implements OnInit {
    @Input() closable = true;

    LANG: LanguageI18NStaticTypes;
    CONFIG: IConfig;

    system$: BehaviorSubject<NxSystem>;
    updateCallback: () => void;
    targetSystems: SystemDropdownItem[];
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
        public renderer: Renderer2,
        private http: HttpClient,
        private systemsService: NxSystemsService,
        private processService: NxProcessService,
        private dialogRef: DialogRef,
        @Inject(DIALOG_DATA) private dialogData: any,
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

    ngOnInit(): void {
        pickFrom(this.dialogData, ['system$', 'updateCallback'], this);

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
                    // Removed dialog open within dialog ... bad practice --TT
                    this.close('noOtherSystemsError');
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
    close = (msg?: string) => {
        this.dialogRef.close(msg);
    };

    setTargetSystem({ value, state }: SystemDropdownItem) {
        this.target$.next(value);
        this.targetOnline$.next(state !== 'offline');
        if (value === 'otherSystem') {
            // TODO: Moving to a system that isn't already setup on cloud wasn't in spec, should it be implemented?
            this.errorText = "this isn't implemented, not sure if it should be";
        }

        this.systemsService.getSystem(value).toPromise().then(({ state }) => {
            if (state === 'offline') {
                this.errorText = this.LANG.dialogs.cloudStorage.moveCloudStorage.status.offline?.();
            } else {
                this.errorText = '';
            }
        });
    }
}
