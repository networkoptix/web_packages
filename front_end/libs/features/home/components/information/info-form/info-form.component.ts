import { CommonModule } from '@angular/common';
import {
    Component,
    DestroyRef,
    effect,
    EventEmitter,
    inject,
    Input,
    Output,
    signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
    AbstractControl,
    FormArray,
    FormBuilder,
    FormGroup,
    FormsModule,
    ReactiveFormsModule,
} from '@angular/forms';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { isEqual } from 'lodash-es';
import { distinctUntilChanged, Subject, takeUntil } from 'rxjs';

import { NxButtonComponent } from '@components/button/button.component';
import { NxContentBlockComponent } from '@components/content-block/content-block.component';
import { NxContentBlockSectionComponent } from '@components/content-block/section/section.component';
import { NxPagePlaceholderV2Component } from '@components/placeholders/pageV2/page-placeholder.component';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import staticLang from '@language_static';
import { CPInfoDataEvent } from '@pages/home/components/information/information.types';
import type {
    InfoDataServer,
    InfoRow,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { icons } from '@static-variables';

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
export class NxInfoGroupComponent {
    @Input() formId: string;
    @Input() linkCaption: string;
    @Input() editMode: boolean;
    @Input() linkPredicate: string;
    @Input() set data(data: InfoRow[]) {
        this.data$$.set(data);
    }

    @Output() dataChanges = new EventEmitter<CPInfoDataEvent>();

    LANG = staticLang;
    icons = icons;
    destroyRef = inject(DestroyRef);
    unsub$: Subject<boolean> = new Subject();

    data$$ = signal<InfoRow[]>([], { equal: isEqual });
    setFormEffect = effect(() => {
        this.setForm(this.data$$());
    });

    private formBuilder = inject(FormBuilder);
    formGroup: FormGroup = this.formBuilder.group({
        records: this.formBuilder.array([]),
    });

    private isSameData(currValues: Array<AbstractControl>, data: InfoRow[]): boolean {
        if (currValues.length !== data.length) {
            return false;
        } else {
            for (let idx = 0; idx < currValues.length; idx++) {
                if (
                    currValues[idx].value.data !== data[idx].data.value ||
                    currValues[idx].value.description !== data[idx].description.value
                ) {
                    return false;
                }
            }
        }
        return true;
    }
    setForm(data: InfoRow[]): void {
        const recs = this.records.controls;
        // Avoid re-initialization if change was initiated by the form
        if (this.isSameData(recs, data)) {
            return;
        }
        this.unsub$.next(true);
        this.setInfoRows(data);

        this.formGroup.valueChanges
            .pipe(
                distinctUntilChanged(),
                takeUntil(this.unsub$),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe(changed => {
                this.dataChanges.emit({
                    formId: this.formId,
                    formData: changed.records,
                    status: this.formGroup.valid,
                });
            });
    }

    setInfoRows(data: InfoRow[]): void {
        const rows = data.map((row: InfoRow) => {
            const group = {
                data: [row.data.value, row.data.validation],
                description: [row.description?.value, row.description?.validation],
            };

            if (!row.description) {
                delete group.description;
            }

            return this.formBuilder.group(group);
        });

        const rowsFormArray = this.formBuilder.array(rows);
        this.formGroup.setControl('records', rowsFormArray);
        this.formGroup.updateValueAndValidity();
    }

    get records(): FormArray {
        return this.formGroup.get('records') as FormArray;
    }

    removeRecord(idx: number): void {
        const newInfo = this.data$$().filter((_, index) => index !== idx);
        this.unsub$.next(true);
        this.data$$.set(newInfo);
        this.formGroup.updateValueAndValidity();

        const newData: InfoDataServer[] = [];
        for (let idx = 0; idx < newInfo.length; idx++) {
            let data: InfoDataServer;
            if (this.formId === 'custom') {
                data = {
                    label: newInfo[idx].data.value,
                    value: newInfo[idx].description.value,
                };
            } else {
                data = {
                    value: newInfo[idx].data.value,
                    description: newInfo[idx].description.value,
                };
            }

            newData.push(data);
        }

        this.dataChanges.emit({
            formId: this.formId,
            formData: newData,
            status: this.formGroup.valid,
        });
    }
}
