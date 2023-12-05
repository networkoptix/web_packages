import {
    Component,
    Input,
    forwardRef,
    EventEmitter,
    Output,
    ViewChild,
    ElementRef,
    booleanAttribute,
} from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';

import { icons } from '@static-variables';
import { caseInsenstiveSearch } from '@utils/general';
import { NgChanges } from '@utils/ng-changes';

import { BaseDropdown } from '../injDropdown';

import type { DropdownItem } from './dropdown.component.types';

/* Usage
 <nx-select
     [componentId]="select.id"
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
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => NxGenericDropdown),
            multi: true,
        },
    ],
})
export class NxGenericDropdown<
    Item extends DropdownItem<unknown> = DropdownItem<unknown>,
> extends BaseDropdown {
    @Input({ required: true }) componentId: string;
    @Input() items: Item[];
    @Input() selected: Item | false;
    @Input({ transform: booleanAttribute }) merge: boolean;
    @Input({ transform: booleanAttribute }) ellipsisMargin: boolean;
    @Input({ transform: booleanAttribute }) hrMargin: boolean;
    @Input() stillLoading: boolean;
    @Input() type: string;
    @Input({ transform: booleanAttribute }) hideSelectedItem: boolean = false;
    @Input({ transform: booleanAttribute }) canSearch: boolean;
    @Input() noMatchMsg: string;
    @Input({ transform: booleanAttribute }) disabled: boolean;
    @Input() forcePosition: {
        left?: number;
        top?: number | 'auto';
        bottom?: number | 'auto';
        width?: number;
        offsetTop?: number;
    } = { top: 'auto', bottom: 'auto' };

    @Output() onSelected = new EventEmitter<Item>();
    icons = icons;

    dropdownType: string;
    nativeElementTop: number = 0;

    filter: string;
    _items: Item[];

    // Used in merge.component.ts
    @ViewChild('dropdownButtonFocus') dropdownToggleButton: HTMLButtonElement;

    constructor(public ref: ElementRef<HTMLElement>) {
        super();
        this.noMatchMsg ??= this.LANG.search.noMatches || 'No matches';
    }

    ngOnInit(): void {
        this._items = this.items;
        this.dropdownType = `dropdown-${this.type || 'default'}`;
    }

    ngAfterViewInit(): void {
        Promise.resolve().then(() => {
            this.nativeElementTop = this.forcePosition
                ? this.ref.nativeElement.parentElement.parentElement.offsetTop
                : this.ref.nativeElement.offsetHeight;
        });
    }

    change(item: Item): void {
        this._selectedItem = item;
        this.onSelected.emit(item);
        this.onChangeCallback(this._selectedItem);
    }

    ngOnChanges(changes: NgChanges<NxGenericDropdown>): void {
        if (changes.items?.currentValue) {
            this._items = this.items;
        }
        // detect changes in list of items and changes in selected to support clear option
        if (changes.selected?.currentValue) {
            this._selectedItem = changes.selected.currentValue;
        } else if (!this.selected && !changes.selected?.firstChange) {
            this._selectedItem = { name: this.message, value: '0' };
        }
    }

    blockEnter(event: KeyboardEvent): void {
        if (event.key === 'Enter') {
            event.preventDefault();
        }
        // Don't trigger form submit while inside search
    }

    handleKeyup(ev: KeyboardEvent, item: Item): void {
        if (ev.key === 'Enter') {
            this.show = false;
            this.change(item);
        }
    }

    filterChanged(value: string): void {
        this.filter = value;
        this._items = this.items.filter(
            item =>
                caseInsenstiveSearch(item.name, this.filter) ||
                (item.help && caseInsenstiveSearch(item.help, this.filter)),
        );

        if (!this._items.length) {
            this._items = [<Item>{ name: this.noMatchMsg, value: '', disabled: true }];
        }
    }
}
