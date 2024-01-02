import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, OnChanges, Output } from '@angular/core';
import {
    FormArray,
    FormBuilder,
    FormGroup,
    FormsModule,
    ReactiveFormsModule,
} from '@angular/forms';
import { AngularSvgIconModule } from 'angular-svg-icon';

// import type { AuthorizeStateType } from '@authorization/src/app/components/authorize.component.types';
import { NxButtonComponent } from '@components/button/button.component';
import { NxContentBlockComponent } from '@components/content-block/content-block.component';
import { NxContentBlockSectionComponent } from '@components/content-block/section/section.component';
import { NxPagePlaceholderV2Component } from '@components/placeholders/pageV2/page-placeholder.component';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import staticLang from '@language_static';
import { InfoRow } from '@pages/home/components/information/information.types';
import { icons } from '@static-variables';
import { NgChanges } from '@utils/ng-changes';

@Component({
    selector: 'nx-info-form',
    templateUrl: 'info-form.component.html',
    styleUrls: ['info-form.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        AngularSvgIconModule,
        NxContentBlockComponent,
        NxContentBlockSectionComponent,
        NxAddSvgSrcDirective,
        NxButtonComponent,
        NxPagePlaceholderV2Component,
    ],
})
export class NxInfoGroupComponent implements OnChanges {
    @Input() formId: string;
    @Input() linkCaption: string;
    @Input() editMode: boolean;
    @Input() linkPredicate: string;
    @Input() data: InfoRow[];

    @Output() recordToBeRemoved = new EventEmitter<{ formId: string; idx: number }>();

    LANG = staticLang;
    icons = icons;
    private formBuilder = inject(FormBuilder);
    form: FormGroup = this.formBuilder.group({
        records: this.formBuilder.array([]),
    });

    ngOnChanges(changes: NgChanges<NxInfoGroupComponent>): void {
        if (changes.data?.currentValue) {
            this.setInfoRows(changes.data.currentValue);
        }
    }

    setInfoRows(data: InfoRow[]): void {
        const rows = data.map(row => {
            return this.formBuilder.group({
                link: [row.link.value, row.link.validation],
                descr: [row.descr.value, row.descr.validation],
            });
        });

        const rowsFormArray = this.formBuilder.array(rows);
        this.form.setControl('records', rowsFormArray);
    }

    get records(): FormArray {
        return this.form.get('records') as FormArray;
    }

    removeRecord(idx: number): void {
        // return formId and idx
        this.recordToBeRemoved.emit({
            formId: this.formId,
            idx,
        });
    }

    protected readonly Object = Object;
}
