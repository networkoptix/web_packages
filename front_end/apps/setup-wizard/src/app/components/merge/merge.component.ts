import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ViewChild } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { TranslateModule } from '@ngx-translate/core';

import { NxAutoCompleteItemComponent } from '@components/autocomplete/autocomplete-item/autocomplete-item.component';
import { NxAutocompleteComponent } from '@components/autocomplete/autocomplete.component';

import { WizardStateService } from '../../services/wizard-state.service';

@UntilDestroy()
@Component({
    selector: 'nx-merge-component',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        TranslateModule,
        NxAutocompleteComponent,
        NxAutoCompleteItemComponent,
    ],
    templateUrl: 'merge.component.html',
    styleUrls: ['merge.component.scss'],
})
export class MergeComponent implements AfterViewInit {
    peers = this.wizardService.peers;
    remoteSystemUrl = '';
    urlRegex = new RegExp(this.wizardService.getURLRegex());

    @ViewChild('mergeForm', { static: false }) mergeForm: NgForm;

    get password(): string {
        return this.wizardService.setupConfig.remotePassword;
    }

    set password(password: string) {
        this.wizardService.setupConfig.remotePassword = password;
    }

    setRemoteSystem(url: string | undefined): void {
        this.wizardService.setupConfig.remoteSystemUrl = url ?? '';
    }

    // User is hardcoded to "admin" ... for now
    // get user(): string {
    //     return this.wizardService.setupConfig.remoteLogin;
    // }
    //
    // set user(user: string) {
    //     this.wizardService.setupConfig.remoteLogin = user;
    // }

    constructor(private wizardService: WizardStateService) {}

    ngAfterViewInit(): void {
        this.mergeForm.statusChanges.pipe(untilDestroyed(this)).subscribe((result: string) => {
            this.wizardService.setupConfig.mergeDataState = result;
        });

        this.wizardService.formValidateSubject.pipe(untilDestroyed(this)).subscribe(() => {
            for (const ctrl in this.mergeForm.controls) {
                // eslint-disable-next-line no-prototype-builtins
                if (this.mergeForm.controls.hasOwnProperty(ctrl)) {
                    this.mergeForm.form.get(ctrl).markAsTouched();
                    this.mergeForm.form.get(ctrl).markAsDirty();
                }
            }
        });
    }
}
