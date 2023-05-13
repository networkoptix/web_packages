import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';

import type { SearchableDropdownItem as Item } from '@components/dropdowns/searchable/searchable.component.types';

import { WizardStateService } from '../../services/wizard-state.service';

@UntilDestroy()
@Component({
    selector: 'nx-merge-component',
    templateUrl: 'merge.component.html',
    styleUrls: ['merge.component.scss'],
})
export class MergeComponent implements OnInit, AfterViewInit {
    item: Item;
    items: Item[];
    urlRegex: string;

    @ViewChild('mergeForm', { static: false }) mergeForm: NgForm;

    get password(): string {
        return this.wizardService.setupConfig.remotePassword;
    }

    set password(password: string) {
        this.wizardService.setupConfig.remotePassword = password;
    }

    get remoteSystem(): Item {
        return this.wizardService?.setupConfig?.remoteSystem;
    }

    set remoteSystem(item: Item) {
        this.wizardService.setupConfig.remoteSystem = item;
    }

    // User is hardcoded to "admin" ... for now
    // get user(): string {
    //     return this.wizardService.setupConfig.remoteLogin;
    // }
    //
    // set user(user: string) {
    //     this.wizardService.setupConfig.remoteLogin = user;
    // }

    constructor(
        private wizardService: WizardStateService
    ) {}

    ngOnInit(): void {
        this.urlRegex = this.wizardService.getURLRegex();

        this.items = this.wizardService.peers.map(peer => ({
            name: `${peer.name} - (${peer.ip})`,
            value: peer.url,
            help: ''
        }));
    }

    ngAfterViewInit(): void {
        this.mergeForm.statusChanges
            .pipe(untilDestroyed(this))
            .subscribe((result: string) => {
                this.wizardService.setupConfig.mergeDataState = result;
            });

        this.wizardService.formValidateSubject
            .pipe(untilDestroyed(this))
            .subscribe(() => {
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
