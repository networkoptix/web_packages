import { Component, OnInit } from '@angular/core';

import type { SearchableDropdownItem as Item } from '@components/dropdowns/searchable/searchable.component.types';

import { WizardStateService } from '../../services/wizard-state.service';

@Component({
    selector: 'nx-merge-component',
    templateUrl: 'merge.component.html'
})
export class MergeComponent implements OnInit {
    item: Item;
    items: Item[];

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

    get user(): string {
        return this.wizardService.setupConfig.remoteLogin;
    }

    set user(user: string) {
        this.wizardService.setupConfig.remoteLogin = user;
    }

    constructor(
        private wizardService: WizardStateService
    ) {}

    ngOnInit(): void {
        this.items = this.wizardService.peers.map(peer => ({
            name: `${peer.name} - (${peer.ip})`,
            value: peer.url,
            help: ''
        }));
    }
}
