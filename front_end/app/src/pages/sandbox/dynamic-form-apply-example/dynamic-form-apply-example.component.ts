import { Component, ViewChild } from '@angular/core';
import { FormArray, FormBuilder, FormGroup } from '@angular/forms';

import { NxToastService } from '@dialogs/toast.service';
import { NxApplyService } from '@services/apply.service';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxProcessService, Process } from '@services/process.service';

@Component({
    selector: 'dynamic-form-apply-example',
    templateUrl: 'dynamic-form-apply-example.component.html',
    styleUrls: ['dynamic-form-apply-example.component.scss']
})

export class DynamicFormApplyExampleComponent {
    CONFIG: IConfig;

    // page process
    saveAll: Process;

    options: {};
    form2Group: FormGroup;

    @ViewChild('form3') form3;
    formWatcher: any;
    saveForm3: Process;

    constructor(
        configService: NxConfigService,
        private formBuilder: FormBuilder,
        private applyService: NxApplyService,
        private processService: NxProcessService,
        private toastService: NxToastService
    ) {
        this.CONFIG = configService.config;

        this.options = {
            classname: this.CONFIG.toast.success,
            autohide: true,
            delay: this.CONFIG.alertTimeout
        };
    }

    ngOnInit(): void {
        this.form2Group = this.formBuilder.group({
            fields: this.formBuilder.array([])
        });

        this.saveForm3 = this.processService.createProcess(() => {
            return Promise.resolve();
        }, {}, result => {
            this.toastService.show('form3 saved', this.options);
        }, _ => {
        });
    }

    ngAfterViewInit(): void {
        this.formWatcher = this.applyService.createFormWatcher(
            'form3',
            this.form3,
            this.saveForm3);
    }

    addField() {
        this.fields.push(this.formBuilder.control('test'));
    }

    removeField(i: number) {
        this.fields.removeAt(i);
    }

    get fields() {
        return this.form2Group.get('fields') as FormArray;
    }
}
