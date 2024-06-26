import { CommonModule } from '@angular/common';
import { Component, EventEmitter, OnInit, Output, computed, input } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { NxSelectV2Module } from '@components/select-v2/select-v2.module';
import staticLang from '@language_static';
import { PipesModule } from '@pipes/pipes.module';
import { MS } from '@utils/general';

import { getExpirationText } from '../bookmark-sharing.util';

@Component({
    selector: 'nx-bookmark-share-edit',
    templateUrl: 'share-edit.component.html',
    styleUrls: ['share-edit.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        TranslateModule,
        NxSelectV2Module,
        FormsModule,
        ReactiveFormsModule,
        PipesModule,
    ],
})
export class NxShareEditComponent implements OnInit {
    @Output() onConfirmClick = new EventEmitter<{ password?: string; expirationTimeMs?: number }>();
    @Output() onCancelClick = new EventEmitter<void>();

    initialExpirationTime = input.required<number>();
    hasExistingPassword = input.required<boolean>();

    initialExpirationTimeString = computed(() =>
        getExpirationText(new Date(this.initialExpirationTime())),
    );

    shareForm = new FormGroup({
        expiresTime: new FormControl<number>(0),
        password: new FormControl(''),
    });

    nowTime = Date.now();
    TIMES = MS;
    oneMonthFromNow = new Date().setMonth(new Date().getMonth() + 1);

    ngOnInit(): void {
        this.shareForm.controls.expiresTime.setValue(this.initialExpirationTime());
        if (this.hasExistingPassword()) {
            this.shareForm.controls.password.setValue('********');
        }
    }

    onPasswordInputKeydown(): void {
        /*
            Because the password is initialized to '********', we need to clear it when the user types
            But only once and if the user hasn't typed anything yet
        */
        if (this.shareForm.controls.password.pristine) {
            this.shareForm.controls.password.setValue('');
            this.shareForm.controls.password.markAsDirty();
        }
    }

    onConfirm(): void {
        const confirmData: { password?: string; expirationTimeMs?: number } = {
            password: this.shareForm.value.password!,
            expirationTimeMs: this.shareForm.value.expiresTime!,
        };
        if (this.shareForm.controls.password.pristine) {
            delete confirmData.password;
        }
        if (this.shareForm.controls.expiresTime.pristine) {
            delete confirmData.expirationTimeMs;
        }
        this.onConfirmClick.emit(confirmData);
    }

    LANG = staticLang;
}
