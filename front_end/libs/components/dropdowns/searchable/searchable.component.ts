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
import { escapeRegExp } from 'lodash-es';

import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { caseInsenstiveSearch } from '@utils/general';
import { NgChanges } from '@utils/ng-changes';

import { BaseDropdown } from '../injDropdown';

import type { SearchableDropdownItem as Item } from './searchable.component.types';

/* Usage
 <nx-searchable-select
     [id]="select.id"
     [name]="permissions"
     [items]="accessRoles"
     [(ngModel)]="user.role.name"
     (ngModelChange)="onModelChange($event)"
     [placeholder]="'search' | translate" <- optional
     [freeText]="true" <- optional
 >
 </nx-searchable-select>
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
export class NxSearchableDropdown extends BaseDropdown {
    @Input() id: string = 'searchableSelect';
    @Input() items: Item[];
    @Input() selected: Item | false;
    @Input() type: string;
    @Input() noMatchMsg: string;
    @Input() placeholder: string;
    @Input() freeText: boolean = false;

    @Output() onSelected = new EventEmitter<Item>();
    @Output() onClickElsewhere = new EventEmitter<string>();

    dropdownType: string = 'default';
    filter: RegExp;
    _items: Item[];
    helpText: string = '';

    @ViewChild('searchInput', { static: false })
    searchInput: ElementRef<HTMLSpanElement>;

    constructor(
        languageService: NxLanguageProviderService,
        configService: NxConfigService,
    ) {
        super(languageService, configService);
        this.noMatchMsg ??= this.LANG.search.noMatches();
    }

    ngOnInit(): void {
        this.dropdownType = `dropdown-${this.type}`;
        this._selectedItem = { name: '', value: undefined, disabled: true };
    }

    ngOnChanges(changes: NgChanges<NxSearchableDropdown>): void {
        if (changes.items?.currentValue) {
            this._items = [...this.items];
        }

        if (changes.selected?.currentValue) {
            this._selectedItem = changes.selected.currentValue;
        }
    }

    onSearchInput(_event: Event): void {
        let filter = this.searchInput.nativeElement.innerText;
        this.helpText = '';

        // long strings may produce line break when deleted
        filter = filter.replace(/\n/g, '');

        if (filter) {
            this.filter = new RegExp(`(${escapeRegExp(filter)})`, 'i');
            this._items = this.items.filter(item =>
                caseInsenstiveSearch(item.name, filter) ||
                item.help && caseInsenstiveSearch(item.help, filter)
            );
        } else {
            this.filter = undefined;
            this._items = [...this.items];
        }

        if (this.freeText) {
            const freeTypeItem: Item = {
                name: this.searchInput.nativeElement.innerText,
                value: this.searchInput.nativeElement.innerText
            };
            this._selectedItem = freeTypeItem;
            this.onSelected.emit(freeTypeItem);
            this.onChangeCallback(freeTypeItem);
            this.show = this._items.length !== 0;
            return;
        }

        this.show = true;
    }

    selectItem(item: Item): void {
        this.show = false;
        this.filter = undefined;
        this._selectedItem = item;
        this.searchInput.nativeElement.innerText = item.name;
        this.helpText = item?.help;
        this.onSelected.emit(item);
        this.onChangeCallback(this._selectedItem);
    }

    clearSelectedItem(): void {
        this._selectedItem = { name: '', value: undefined };
        this.filter = undefined;
        this.helpText = '';
        this.searchInput.nativeElement.innerText = '';
        this._items = [...this.items];
        this.onSelected.emit(this._selectedItem);
        this.onChangeCallback(this._selectedItem);
    }

    toggle(): void {
        this.show = !this.show;
        if (this.show) {
            this.searchInput.nativeElement.focus();
        }
    }

    handleSearchEnter(event: KeyboardEvent): void {
        if (event.key === 'Enter') {
            event.preventDefault();
            // Don't allow newline
            if (this._items.length === 1) {
                this.selectItem(this._items[0]);
            }
        }
    }

    focusSearchInput(event: MouseEvent): void {
        if (
            event.target !== this.searchInput.nativeElement &&
            !this.searchInput.nativeElement.innerText
        ) {
            this.searchInput.nativeElement.focus();
        }
        // Assist user in focusing on input span if no text to click
    }

    handleItemKeypress(ev: KeyboardEvent, item: Item): void {
        if (ev.key === 'Enter') {
            this.show = false;
            this.selectItem(item);
        }
    }

    clickedElsewhere(): void {
        if (this._selectedItem?.name) {
            this.searchInput.nativeElement.innerText = this._selectedItem.name;
        }
        if (this._selectedItem?.help) {
            this.helpText = this._selectedItem.help;
        }
        this.show = false;

        this.onClickElsewhere.emit(this.searchInput.nativeElement.innerText);
    }
}
