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

import { IBool, CoercedBoolInput } from '@decorators/ibool';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NgChanges } from '@utils/ng-changes';

import { BaseDropdown } from '../injDropdown';

import type { DropdownItem } from './dropdown.component.types';

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
            // eslint-disable-next-line @typescript-eslint/no-use-before-define
            useExisting: forwardRef(() => NxGenericDropdown),
            multi: true
        }
    ]
})
export class NxGenericDropdown<
    Item extends DropdownItem<unknown> = DropdownItem<unknown>
> extends BaseDropdown {
    @Input() id: string = 'genericSelect';
    @Input() items: Item[];
    @Input() selected: Item | false;
    @IBool() @Input() merge: CoercedBoolInput;
    @IBool() @Input() ellipsisMargin: CoercedBoolInput;
    @IBool() @Input() hrMargin: CoercedBoolInput;
    @Input() stillLoading: boolean;
    @Input() type: string;
    @IBool() @Input() hideSelectedItem: CoercedBoolInput = false;
    @IBool() @Input() canSearch: CoercedBoolInput;
    @Input() forcePosition: {
        left?: number,
        top?: number,
        width?: number,
        offsetTop?: number
    };

    @IBool() @Input() allowHTML: CoercedBoolInput = false;

    @Output() onSelected = new EventEmitter<Item>();

    dropdownType: string;
    nativeElementTop: number = 0;

    filter: string;
    _items: Item[];

    // Used in merge.component.ts
    @ViewChild('dropdownButtonFocus') dropdownToggleButton: HTMLButtonElement;

    constructor(
        languageService: NxLanguageProviderService,
        configService: NxConfigService,
        public ref: ElementRef<HTMLElement>
    ) {
        super(languageService, configService);
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

    handleKeyup(ev: KeyboardEvent, item: Item): void {
        if (ev.key === 'Enter') {
            this.show = false;
            this.change(item);
        }
    }

    filterChanged(value: string): void {
        this.filter = value;
        this._items = this.items.filter(item =>
            item.name.toLowerCase().includes(this.filter.toLowerCase()) ||
            item.help?.toLowerCase().includes(this.filter.toLowerCase())
        );

        if (!this._items.length) {
            this._items = [<Item>{ name: 'No matches', value: '', disabled: true }];
        }
    }
}
