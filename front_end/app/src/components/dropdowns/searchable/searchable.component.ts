import {
    Component,
    ViewEncapsulation,
    Input,
    forwardRef,
    EventEmitter,
    Output,
    ElementRef,
    ViewChild
} from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { cloneDeep } from 'lodash-es';

import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { htmlToEntity } from '@utils/general';
import { NgChanges } from '@utils/ng-changes';

import { BaseDropdown } from '../injDropdown';

import type { DropdownItem } from './searchable.component.types';

/* Usage
 <nx-searchable-select
     [id]="select.id"
     [name]="permissions"
     [items]="accessRoles"
     [(ngModel)]="user.role.name"
     (ngModelChange)="onModelChange($event)"
     required>
 </nx-select>
 */

@Component({
    selector: 'nx-searchable-select',
    templateUrl: 'searchable.component.html',
    styleUrls: ['searchable.component.scss'],
    encapsulation: ViewEncapsulation.None,
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            // eslint-disable-next-line @typescript-eslint/no-use-before-define
            useExisting: forwardRef(() => NxSearchableDropdown),
            multi: true
        }
    ]
})
export class NxSearchableDropdown<
    Item extends DropdownItem<string> = DropdownItem<string>
> extends BaseDropdown {
    @Input() id: string = 'searchableSelect';
    @Input() items: Item[];
    @Input() selected: Item | false;
    @Input() type: string;
    @Input() noMatchMsg: string;

    @Output() onSelected = new EventEmitter<Item>();

    dropdownType: string;
    itemToDisplay: string;
    filter: string = '';
    _items: Item[];

    @ViewChild('searchBox', { static: false })
    searchBox: ElementRef<HTMLDivElement>;

    selectedItemHTML(item: Item): string {
        if (!item) {
            return;
        }
        const selectedValue = htmlToEntity(item.value);
        const selectedName = item.name;

        return selectedName && !item.value.includes(selectedName)
            ? selectedValue + `<span class="additional-help">${selectedName}</span>`
            : selectedValue;
    }

    constructor(
        languageService: NxLanguageProviderService,
        configService: NxConfigService,
        public ref: ElementRef<HTMLElement>
    ) {
        super(languageService, configService);
        this.noMatchMsg ??= this.LANG.search.noMatches();
    }

    ngOnInit(): void {
        this.dropdownType = `dropdown-${this.type || 'default'}`;
    }

    change(item: Item): void {
        this.show = false;
        this._items = [...this.items];
        if (this.filter.length) {
            item = this.revertChanges(item);
        }
        this.itemToDisplay = this.selectedItemHTML(item);
        this.filter = '';
        this._selectedItem = item;
        this.onSelected.emit(item);
        this.onChangeCallback(this._selectedItem);
    }

    revertChanges(item: Item): Item {
        item.value = item.value.replace(/<([^>]+)>/gi, '');
        item = this.items.find(_item => _item.value === item.value);

        return item;
    }

    ngOnChanges(changes: NgChanges<NxSearchableDropdown>): void {
        if (changes.items?.currentValue) {
            this._items = [...this.items];
        }
        // detect changes in list of items and changes in selected to support clear option
        if (changes.selected?.currentValue) {
            this._selectedItem = changes.selected.currentValue;
        } else if (!this.selected && !changes.selected?.firstChange) {
            this._selectedItem = { name: '', value: '' };
        }
    }

    handleKeyup(ev: KeyboardEvent, item: Item): void {
        if (ev.key === 'Enter') {
            this.show = false;
            this.change(item);
        }
    }

    filterChanged(): void {
        // long strings may produce line break when deleted
        this.filter = this.searchBox.nativeElement.innerText.replace(/\n/g, '');

        if (this.filter.length) {
            const regex = new RegExp(this.filter, 'gi');

            this._items = cloneDeep(this.items).filter(item =>
                item.value.toLowerCase().includes(this.filter.toLowerCase()) ||
                item.name?.toLowerCase().includes(this.filter.toLowerCase())
            ).map(_item => this.highlighted(_item, regex));
        } else {
            this._items = [...this.items];
            this.itemToDisplay = '';
        }

        if (!this._items.length) {
            this._items = [<Item>{ value: this.noMatchMsg, name: '', disabled: true }];
        }

        this.show = true;
    }

    private highlighted(item: Item, regex: RegExp): Item {
        item.value = item.value.replace(
            regex,
            match => `<span class="highlighted">${match}</span>`
        );

        if (item.name) {
            item.name = item.name.replace(
                regex,
                match => `<span class="highlighted">${match}</span>`
            );
        }

        return item;
    }

    finalizeSelect(): void {
        this.itemToDisplay = this.selectedItemHTML(this._selectedItem);
        this.show = false;
    }
}
