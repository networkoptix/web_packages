import { Component, ViewChild } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, NgForm } from '@angular/forms';

import { NxToastService } from '@dialogs/toast.service';
import { toast } from '@lib/variables/static-variables';
import { NxApplyService } from '@services/apply.service';
import type { FormWatcher } from '@services/apply.service/watcher';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';

@Component({
    selector: 'dynamic-form-apply-example',
    templateUrl: 'dynamic-form-apply-example.component.html',
    styleUrls: ['dynamic-form-apply-example.component.scss'],
})

export class DynamicFormApplyExampleComponent {
    // page process
    saveAll: Process;

    form2Group: FormGroup<{ fields: FormArray<FormControl<string>> }>;

    @ViewChild('form3') form3: NgForm;
    formWatcher: FormWatcher;
    saveForm3: Process;

    constructor(
        private formBuilder: FormBuilder,
        private applyService: NxApplyService,
        private processService: NxProcessService,
        private toastService: NxToastService,
    ) {}

    ngOnInit(): void {
        this.form2Group = this.formBuilder.group({
            fields: this.formBuilder.array<string>([])
        });

        this.saveForm3 = this.processService.createProcess(() => {
            return Promise.resolve();
        }, {}, result => {
            this.toastService.notify('form3 saved', toast.success);
        }, _ => {
        });
    }

    ngAfterViewInit(): void {
        this.formWatcher = this.applyService.createFormWatcher(
            'form3',
            this.form3,
            this.saveForm3,
            null,
            undefined,
            true,
            true);
    }

    addField(): void {
        this.fields.push(this.formBuilder.control('test'));
    }

    removeField(i: number): void {
        this.fields.removeAt(i);
    }

    get fields(): FormArray<FormControl<string>> {
        return this.form2Group.get('fields') as typeof this.fields;
    }
}
