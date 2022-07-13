import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { UntilDestroy } from '@ngneat/until-destroy';
import { BehaviorSubject } from 'rxjs';
import { map, tap } from 'rxjs/operators';

import { DropdownItem } from '@components/dropdowns/generic/dropdown.component.types';
import { NxAccountService } from '@services/account.service';
import { NxCloudApiService } from '@services/nx-cloud-api';
import { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';
import { NxSystem } from '@services/system.service/system';
import { NxSystemWithUserInfo } from '@services/system.service/system-types';
import { NxSystemService } from '@services/system.service/system.service';
import { cleanId } from '@utils/general';

import { FirstPartyWidget } from '../helper-classes';

interface SystemDropdownItem extends DropdownItem<string> {
    disabled: boolean;
}

@UntilDestroy()
@Component({
    selector: 'event-generator-widget',
    templateUrl: './event-generator.component.html',
    styleUrls: ['./event-generator.component.scss']
})
export class NxEventGeneratorWidgetComponent extends FirstPartyWidget implements OnInit {
    CONFIG: IConfig;
    createEvent: Process;
    errorParams: boolean;
    response: string = '';

    static IDENTIFIER = 'event-generator';
    static NAME = 'Generic Event Generator';
    static SIZES = [
        { name: 'Medium', value: { cols: 4, rows: 5 } },
        { name: 'Large', value: { cols: 4, rows: 6 } },
    ];

    static SELECTED_SIZE = 1;

    static BASE_CONFIG = {
        editMode: false,
        selectedSystem: '',
    };

    static cloudApi: NxCloudApiService;
    static systems$ = new BehaviorSubject<NxSystemWithUserInfo[]>([]);

    system: NxSystem;
    selectedSystem: SystemDropdownItem;

    geg = {
        source: '',
        caption: '',
        description: '',
    };

    systemsDropdownItems$ = this.cloudApi.systems().pipe(
        map(systems => systems.map(({ id, name, stateOfHealth }) => ({
            name: stateOfHealth !== 'online' ? `${name} (${stateOfHealth})` : name,
            disabled: stateOfHealth !== 'online',
            value: cleanId(id)
        }))),
        tap(async (systems: any) => {
            if (!systems.length) {
                return;
            }
            const selectedSystem = systems.find(({ value }) => value === this.card.config.selectedSystem) || systems.find(({ disabled }) => !disabled) || systems[0];
            this.updateSystem(selectedSystem);
        })
    );

    @ViewChild('gegForm') gegForm: NgForm;

    constructor(
        cd: ChangeDetectorRef,
        configService: NxConfigService,
        private cloudApi: NxCloudApiService,
        private accountService: NxAccountService,
        private systemService: NxSystemService,
        private processService: NxProcessService,
    ) {
        super(cd);

        this.CONFIG = configService.config;
    }

    ngOnInit(): void {
        this.system = this.systemService.createSystem(this.accountService.email, this.card.config.selectedSystem);

        this.createEvent = this.processService
            .createProcess(async () => {
                const { source, caption, description } = this.geg;
                if (!(source || caption || description)) {
                    return Promise.reject({ resultCode: 'missingParam' });
                }

                return this.system.serverManager.createEvent(this.geg);
            },
            {
                ignoreError: true,
                errorCodes: {
                    missingParam: () => {
                        this.gegForm.controls.source.markAsTouched();
                        this.gegForm.controls.source.setErrors({ required: true });
                        this.gegForm.controls.caption.markAsTouched();
                        this.gegForm.controls.caption.setErrors({ required: true });
                        this.gegForm.controls.description.markAsTouched();
                        this.gegForm.controls.description.setErrors({ required: true });
                        this.errorParams = true;
                    },
                }
            },
            (res: any) => {
                this.response = JSON.stringify(res, undefined, 2);
            },
            (err: any) => {
                this.response = JSON.stringify(err, undefined, 2);
            });
    }

    updateSystem(system: SystemDropdownItem): void {
        this.selectedSystem = system;
        this.card.config.selectedSystem = system.value;
        this.system = this.systemService.createSystem(this.accountService.email, system.value);

        this.errorParams = false;
        this.response = '';
        this.geg = {
            source: '',
            caption: '',
            description: '',
        };
    }

    clear(): void {
        this.gegForm.controls.source.markAsUntouched();
        this.gegForm.controls.caption.markAsUntouched();
        this.gegForm.controls.description.markAsUntouched();
        this.errorParams = false;
        this.response = '';
    }
}

NxEventGeneratorWidgetComponent.registerWidget();
