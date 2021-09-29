import {
    Component, ViewEncapsulation,
    Input, Output, EventEmitter,
    SimpleChanges
}                                    from '@angular/core';

import { BaseDropdown }              from '../injDropdown';
import { NxLanguageProviderService } from '../../../services/nx-language-provider';
import { NxConfigService }           from '../../../services/nx-config';

interface AccessRole {
    name: string;
    optionLabel: any;
    isAdmin: boolean;
    isOwner: boolean;
}

@Component({
    selector      : 'nx-permissions-select',
    templateUrl   : 'permissions.component.html',
    styleUrls     : ['permissions.component.scss'],
    encapsulation : ViewEncapsulation.None
})

export class NxPermissionsDropdown extends BaseDropdown {
    @Input() disabled;
    @Input() user;
    @Input() roles;
    @Input() system;
    @Input() selected;
    @Output() onSelected = new EventEmitter<AccessRole>();

    selection: string;
    message: string;
    accessRoles: AccessRole[];
    differ;

    constructor(private languageService: NxLanguageProviderService,
                private configService: NxConfigService
    ) {
        super(languageService, configService);

        this.accessRoles = [];
        this.message = this.LANG.pleaseSelect();
    }

    // TODO: Bind ngModel to the component and eliminate EventEmitter

    ngOnInit(): void {
        this.processAccessRoles();
        const role = this.accessRoles.filter(x => x.name === this.selected.name)[0];
        this.selection = '';

        if (role) {
            this.selection = role.optionLabel || this.message;
            this.changePermission(role);
        }
    }

    processAccessRoles() {
        this.accessRoles = (this.roles ?? [])
            .filter((role) => !(role.isOwner || role.isAdmin && !this.system.isMine))
            .map((role) => {
                role.optionLabel = this.LANG.accessRoles[role.name]?.label() || role.name;
                return role;
            });
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes.roles?.currentValue) {
            this.processAccessRoles();
            const role = this.accessRoles.filter(x => x.name === this.selected.name)[0];
            const roleOptionLabel = (typeof role.optionLabel === 'function') ? role.optionLabel() : role.optionLabel;

            if (!role || roleOptionLabel !== this.selection) {
                this.selection = roleOptionLabel || this.message;
                this.changePermission(role);
            }
        }

        if (changes.selected?.currentValue) {
            this.selection = this.accessRoles.find(x => x.name === changes.selected.currentValue.name).optionLabel;
        }
    }

    changePermission(role) {
        this.selection = (typeof role.optionLabel === 'function') ? role.optionLabel() : role.optionLabel;

        const selectedRole = this.accessRoles.find((accessRole) => accessRole.name === role.name);
        this.onSelected.emit(selectedRole);

        return false; // return false so event will not bubble to HREF
    }
}
