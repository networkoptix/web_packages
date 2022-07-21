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

import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
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
export class NxSearchableDropdown extends BaseDropdown {
    @Input() id: string = 'searchableSelect';
    @Input() items: Item[];
    @Input() selected: Item | false;
    @Input() type: string;
    @Input() noMatchMsg: string;

    @Output() onSelected = new EventEmitter<Item>();

    dropdownType: string = 'default';
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

    onSearchInput(_event: Event): void {
        let { innerText } = this.searchInput.nativeElement;
        this.helpText = '';

        // long strings may produce line break when deleted
        innerText = innerText.replace(/\n/g, '');
        const regex = new RegExp(innerText, 'gi');

        if (innerText) {
            this._items = this.items
                .filter(item =>
                    regex.test(item.name) ||
                    item.help && regex.test(item.help)
                ).map(item => this.highlighted(item, regex));
        } else {
            this.resetHighlighting();
        }

        if (!this._items.length) {
            this._items = [{ name: this.noMatchMsg, value: undefined, disabled: true }];
        }

        this.show = true;
    }

    selectItem(item: Item): void {
        this.show = false;
        this.resetHighlighting();
        this._selectedItem = item;
        this.searchInput.nativeElement.innerText = item.name;
        this.helpText = item?.help;
        this.onSelected.emit(item);
        this.onChangeCallback(this._selectedItem);
    }

    private resetHighlighting(): void {
        this._items = this.items.map(item => {
            delete item.highlightedName;
            delete item.highlightedHelp;
            return item;
        });
    }

    blockSearchEnter(event: KeyboardEvent): void {
        if (event.key === 'Enter') {
            event.preventDefault();
        }
        // Don't allow newline

        if (this._items.length === 1) {
            this.selectItem(this._items[0]);
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

    private highlighted(item: Item, regex: RegExp): Item {
        item.highlightedName = item.name.replace(
            regex,
            match => `<span class="highlighted">${match}</span>`
        );

        item.highlightedHelp = item.help?.replace(
            regex,
            match => `<span class="highlighted">${match}</span>`
        );

        return item;
    }

    clickedElsewhere(): void {
        if (this._selectedItem?.name) {
            this.searchInput.nativeElement.innerText = this._selectedItem.name;
        }
        if (this._selectedItem?.help) {
            this.helpText = this._selectedItem.help;
        }
        this.show = false;
    }
}
