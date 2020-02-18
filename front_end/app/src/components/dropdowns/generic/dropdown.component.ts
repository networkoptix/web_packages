import {
    Component, ViewEncapsulation,
    Input, forwardRef, EventEmitter,
    Output, SimpleChanges
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
    // items should have at least name ex [{name: 'a', id: 1}, {name: 'b', id:3}]
    @Input() id: any;
    @Input() items: any;
    @Input() selected: any;
    @Input() merge: boolean;
    @Output() onSelected = new EventEmitter<string>();

    change(item) {
        this._selected = item;
        this.onSelected.emit(item);
        this.onChangeCallback(this._selected);
    }

    ngOnChanges(changes: SimpleChanges) {
        // detect changes in list of items and changes in selected to support clear option
        if (changes.selected.currentValue) {
            this._selected = changes.selected.currentValue;
        } else if (!this.selected) {
            this._selected = { name: this.message, value: '0' };
        }
    }
}

