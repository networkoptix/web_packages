import {
    Component,
    ViewEncapsulation,
    Input,
    forwardRef
} from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';

import { NxApplyService } from '@services/apply.service';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NgChanges } from '@utils/ng-changes';

import { BaseDropdown } from '../injDropdown';

@Component({
    selector: 'nx-permissions-select',
    templateUrl: 'permissions.component.html',
    styleUrls: ['permissions.component.scss'],
    encapsulation: ViewEncapsulation.None,
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            // eslint-disable-next-line @typescript-eslint/no-use-before-define
            useExisting: forwardRef(() => NxPermissionsDropdown),
            multi: true
        }
    ]
})

export class NxPermissionsDropdown extends BaseDropdown {
    @Input() id;
    @Input() name;
    @Input() disabled;
    @Input() user;
    @Input() roles;
    @Input() system;

    componentId: string;
    selection: string;
    message: string;
    accessRoles;

    private selected;

    constructor(
        languageService: NxLanguageProviderService,
        configService: NxConfigService,
        private applyService: NxApplyService
    ) {
        super(languageService, configService);

        this.accessRoles = [];
        this.selected = {};
        this.message = this.LANG.pleaseSelect();
    }

    /**
     * Overwrite
     */
    writeValue(value: any): void {
        if (value !== null && !this.applyService.locked) {
            this.selected = value;
            this.selection = this.LANG.accessRoles[this.selected.name]?.label?.() ||
                this.selected.name ||
                this.message;
        }
    }

    ngOnInit(): void {
        this.componentId = (this.id || this.name) + '-button';
        this.selection = '';

        this.processAccessRoles();
    }

    private processAccessRoles(): void {
        this.accessRoles = [];
        this.roles.forEach(role => {
            if (!(role.isOwner || role.isAdmin && !this.system.isMine)) {
                const extendedRole = { ...role };
                extendedRole.optionLabel =
                    this.LANG.accessRoles[role.name]?.label() || role.name;
                this.accessRoles.push(extendedRole);
            }
        });
    }

    ngOnChanges(changes: NgChanges<NxPermissionsDropdown>): void {
        if (changes.roles?.currentValue) {
            this.processAccessRoles();
            const role = this.accessRoles.filter(x =>
                x.name === this.selected.name
            )[0];
            const roleOptionLabel =
                this.LANG.accessRoles[role?.name]?.label?.() ||
                role?.name ||
                this.message;

            if (!role || roleOptionLabel !== this.selection) {
                this.selection = roleOptionLabel;
            }
        }
    }

    changePermission(role) {
        this.selection = (typeof role.optionLabel === 'function')
            ? role.optionLabel()
            : role.optionLabel;

        const selectedRole = this.accessRoles.find(accessRole =>
            accessRole.name === role.name
        );
        this.onChangeCallback(selectedRole);
        return false; // return false so event will not bubble to HREF
    }
}
