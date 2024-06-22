import { CommonModule } from '@angular/common';
import {
    Component,
    DestroyRef,
    effect,
    EventEmitter,
    inject,
    input,
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
import { TranslateService } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { isEqual } from 'lodash-es';
import { distinctUntilChanged, Subject, takeUntil } from 'rxjs';

import { NxContentBlockComponent } from '@components/content-block/content-block.component';
import { NxContentBlockSectionComponent } from '@components/content-block/section/section.component';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import staticLang from '@language_static';
import { CPInfoDataEvent } from '@pages/home/components/information/information.types';
import type {
    InfoDataServer,
    InfoRow,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { icons, MAX_NAME_LENGTH } from '@static-variables';

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
    ],
})
export class NxInfoGroupComponent {
    private translateService = inject(TranslateService);
    private formBuilder = inject(FormBuilder);
    protected readonly MAX_NAME_LENGTH = MAX_NAME_LENGTH;
    LANG = staticLang;

    @Input() formId: string;
    @Input() linkCaption: string;
    @Input() descrCaption: string = this.translateService.instant(this.LANG.optionalDescription);
    @Input() linkPredicate: string;
    @Input() set data(data: InfoRow[]) {
        this.data$$.set(data);
    }

    @Output() dataChanges = new EventEmitter<CPInfoDataEvent>();
    @Output() formState = new EventEmitter<boolean>();

    mode$$ = input(false, { alias: 'editMode' });

    icons = icons;
    destroyRef = inject(DestroyRef);
    unsub$: Subject<boolean> = new Subject();

    setModeEffect = effect(() => {
        if (!this.mode$$() && this.rows) {
            this.resetForm();
        }
        this.formState.emit(this.formGroup.pristine);
    });

    data$$ = signal<InfoRow[]>([], { equal: isEqual });
    setFormEffect = effect(() => {
        this.setForm(this.data$$());
    });

    private rows: FormGroup[];

    formGroup: FormGroup = this.formBuilder.group({
        records: this.formBuilder.array([]),
    });

    private isSameData(currValues: Array<AbstractControl>, data: InfoRow[]): boolean {
        if (currValues.length !== data.length) {
            return false;
        } else {
            for (let idx = 0; idx < currValues.length; idx++) {
                const descriptionData = data[idx].description?.value || '';
                const descriptionCurr = currValues[idx].value.description || '';
                if (
                    currValues[idx].value.data !== data[idx].data.value ||
                    descriptionCurr !== descriptionData
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
                this.formState.emit(this.formGroup.pristine);
                this.dataChanges.emit({
                    formId: this.formId,
                    formData: changed.records,
                    status: this.formGroup.valid,
                });
            });
    }

    resetForm(): void {
        for (let idx = 0; idx < this.rows.length; idx++) {
            this.rows[idx].controls.data.markAsPristine();
            this.rows[idx].controls.data.markAsUntouched();
            this.rows[idx].controls.description?.markAsPristine();
            this.rows[idx].controls.description?.markAsUntouched();
        }
    }

    setInfoRows(data: InfoRow[]): void {
        this.rows = data.map((row: InfoRow) => {
            const group = {
                data: [row.data.value, row.data.validation],
                description: [row.description?.value, row.description?.validation],
            };

            if (!row.description) {
                delete group.description;
            }

            return this.formBuilder.group(group);
        });

        const rowsFormArray = this.formBuilder.array(this.rows);
        this.formGroup.setControl('records', rowsFormArray);
        this.formGroup.markAsDirty();
        this.formState.emit(this.formGroup.pristine);
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
                    description: newInfo[idx].description?.value,
                };
            }

            newData.push(data);
        }

        this.formGroup.markAsDirty();
        this.formState.emit(this.formGroup.pristine);

        this.dataChanges.emit({
            formId: this.formId,
            formData: newData,
            status: this.formGroup.valid,
        });
    }
}
