import {
    Component,
    ViewEncapsulation,
    Input,
    forwardRef,
    EventEmitter,
    Output,
    ViewChild,
    ElementRef
} from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';

import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NgChanges } from '@utils/ng-changes';

import { BaseDropdown } from '../injDropdown';

import { DropdownItem } from './dropdown.component.types';

/* Usage
 <nx-select [id]="select.id"
     [name]="permissions"
     [items]="accessRoles"
     label="optionLabel"          <- which property should be shown
     [(ngModel)]="user.role.name"
     (ngModelChange)="onModelChange($event)"
     [selected]="user.role.name ? user.role.name : null"
     required>
 </nx-select>
 */

@Component({
    selector: 'nx-select',
    templateUrl: 'dropdown.component.html',
    styleUrls: ['dropdown.component.scss'],
    encapsulation: ViewEncapsulation.None,
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => NxGenericDropdown),
            multi: true
        }
    ]
})

export class NxGenericDropdown extends BaseDropdown {
    // items should have at least "name"
    // ... ex:[{name: 'a', id: 1}, {name: 'a', help: '(say "Aaaa...")', id: 1}, {name: 'b', id:3}]
    @Input() id;
    @Input() items: DropdownItem[];
    @Input() selected;
    @Input() merge: boolean;
    @Input() ellipsisMargin: boolean;
    @Input() hrMargin: boolean;
    @Input() stillLoading: boolean;
    @Input() type: string;
    @Input() hideSelectedItem = false;
    @Input() forcePosition: {
        left?: number,
        top?: number,
        width?: number,
        offsetTop?: number
    }

    @Input() allowHTML = false;

    @Output() onSelected = new EventEmitter<DropdownItem>();

    dropdownType: string;
    nativeElementTop = 0

    @ViewChild('dropdownButtonFocus') dropdownToggleButton: HTMLButtonElement;

    constructor(
        languageService: NxLanguageProviderService,
        configService: NxConfigService,
        public ref: ElementRef
    ) {
        super(languageService, configService);
    }

    ngOnInit(): void {
        this.id = this.id || 'genericSelect';

        this.items?.forEach(item => {
            if (item.help && !item.name.includes(item.help)) {
                item.name += `<span class="additional-help">${item.help}</span>`;
            }
        });

        this.dropdownType = this.type ? `dropdown-${this.type}` : 'dropdown-default';
    }

    ngAfterViewInit() {
        Promise.resolve().then(() => {
            this.nativeElementTop = this.forcePosition
                ? this.ref.nativeElement.parentElement.parentElement.offsetTop
                : this.ref.nativeElement.offsetHeight;
        });
    }

    change(item: DropdownItem) {
        this._selectedItem = item;
        this.onSelected.emit(item);
        this.onChangeCallback(this._selectedItem);
    }

    ngOnChanges(changes: NgChanges<NxGenericDropdown>) {
        if (changes.items && changes.items.currentValue) {
            this.items.forEach(item => {
                if (item.help && !item.name.includes(item.help)) {
                    item.name += `<span class="additional-help">${item.help}</span>`;
                }
            });
        }
        // detect changes in list of items and changes in selected to support clear option
        if (changes.selected && changes.selected.currentValue) {
            if (
                changes.selected.currentValue.help &&
                !changes.selected.currentValue.name.includes('additional-help')
            ) {
                changes.selected.currentValue.name +=
                    `<span class="additional-help">${changes.selected.currentValue.help}</span>`;
            }
            this._selectedItem = changes.selected.currentValue;
        } else if (!this.selected && !changes.selected?.firstChange) {
            this._selectedItem = { name: this.message, value: '0' };
        }
    }

    handleKeyup(ev, item) {
        if (ev.which === 13) {
            this.show = false;
            this.change(item);
        }
    }
}
