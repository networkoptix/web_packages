import {
    Component, ViewEncapsulation,
    Input, Output, EventEmitter,
    SimpleChanges
}                                    from '@angular/core';

import { BaseDropdown }              from '../injDropdown';
import { NxLanguageProviderService } from '../../../services/nx-language-provider';
import { NxConfigService }           from '../../../services/nx-config';

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
    @Output() onSelected = new EventEmitter<string>();

    selection: string;
    message: string;
    accessRoles;
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
        if (this.roles) {
            this.accessRoles = this.roles.filter((role) => {
                if (!(role.isOwner || role.isAdmin && !this.system.isMine)) {
                    role.optionLabel = this.LANG.accessRoles[role.name]
                        ? this.LANG.accessRoles[role.name].label()
                        : role.name;
                    return true;
                }

                return false;
            });
        }
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

        const selectedRole = this.accessRoles.filter((accessRole) => {
            if (accessRole.name === role.name) {
                return role;
            }
        })[0];
        this.onSelected.emit(selectedRole);

        return false; // return false so event will not bubble to HREF
    }
}
