import {
    Component, ViewEncapsulation,
    Input, forwardRef, EventEmitter,
    Output, SimpleChanges, ViewChild
}                            from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { BaseDropdown }      from '../injDropdown';

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
    selector      : 'nx-select',
    templateUrl   : 'dropdown.component.html',
    styleUrls     : ['dropdown.component.scss'],
    encapsulation : ViewEncapsulation.None,
    providers     : [
        {
            provide     : NG_VALUE_ACCESSOR,
            useExisting : forwardRef(() => NxGenericDropdown),
            multi       : true
        }
    ]
})

export class NxGenericDropdown extends BaseDropdown {
    // items should have at least "name"
    // ... ex:[{name: 'a', id: 1}, {name: 'a', help: '(say "Aaaa...")', id: 1}, {name: 'b', id:3}]
    @Input() id;
    @Input() items: DropdownItem[];
    @Input() selected;
    @Output() onSelected = new EventEmitter<string>();
    @Input() merge: boolean;

    @ViewChild('dropdownButtonFocus') dropdownToggleButton: HTMLButtonElement;

    ngOnInit(): void {
        this.id = this.id || 'genericSelect';

        this.items.forEach((item) => {
            if (item.help && !item.name.includes(item.help)) {
                item.name += `<span class="additional-help">${item.help}</span>`;
            }
        });
    }

    change(item) {
        this._selected = item;
        this.onSelected.emit(item);
        this.onChangeCallback(this._selected);
    }

    ngOnChanges(changes: SimpleChanges) {
        // detect changes in list of items and changes in selected to support clear option
        if (changes.selected.currentValue) {
            if (changes.selected.currentValue.help) {
                changes.selected.currentValue.name += `<span class="additional-help">${changes.selected.currentValue.help}</span>`;
            }
            this._selected = changes.selected.currentValue;
        } else if (!this.selected && !changes.selected.firstChange) {
            this._selected = { name: this.message, value: '0' };
        }
    }

    handleKeyup(ev, item) {
        if (ev.which === 13) {
            this.show = false;
            this.change(item);
        }
    }
}

export class DropdownItem {
    constructor(
        public name: string,
        public help?: string,
        public value?: string,
        public state?: string
    ) {}
}
