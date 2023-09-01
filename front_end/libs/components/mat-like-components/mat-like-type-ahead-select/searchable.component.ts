import { CommonModule } from '@angular/common';
import {
    Component,
    Input,
    forwardRef,
    EventEmitter,
    Output,
    ElementRef,
    ViewChild,
} from '@angular/core';
import {
    NgForm,
    NG_VALIDATORS,
    NG_VALUE_ACCESSOR,
    FormControl,
    Validator,
    ValidationErrors,
} from '@angular/forms';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { escapeRegExp } from 'lodash-es';

import { NxSearchHighlightComponent } from '@components/search-highlight/search-highlight.component';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { NxArrowNavDirective } from '@directives/nx-arrow-nav';
import { NxClickElsewhereDirective } from '@directives/nx-click-elsewhere';
import { NxFocusMeDirective } from '@directives/nx-focus-me';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { icons } from '@static-variables';
import { caseInsenstiveSearch } from '@utils/general';
import { NgChanges } from '@utils/ng-changes';

import { BaseDropdown } from '../../dropdowns/injDropdown';

import type { SearchableDropdownItem as Item } from './searchable.component.types';

/* Usage
 <nx-mat-like-type-ahead-select
     [componentId]="select.id" <- required for validation within form
     [name]="permissions"
     [items]="accessRoles"
     [(ngModel)]="user.role.name"
     (ngModelChange)="onModelChange($event)"
     [label]="'search' | translate" <- optional
     [freeText]="true" <- optional
 >
 </nx-mat-like-type-ahead-select>
 */

@Component({
    selector: 'nx-mat-like-type-ahead-select',
    templateUrl: 'searchable.component.html',
    styleUrls: ['searchable.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        AngularSvgIconModule,
        NxSearchHighlightComponent,
        NxAddSvgSrcDirective,
        NxArrowNavDirective,
        NxClickElsewhereDirective,
        NxFocusMeDirective,
    ],
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            // eslint-disable-next-line @typescript-eslint/no-use-before-define
            useExisting: forwardRef(() => NxMatLikeTypeAheadDropdown),
            multi: true,
        },
        {
            provide: NG_VALIDATORS,
            // eslint-disable-next-line @typescript-eslint/no-use-before-define
            useExisting: forwardRef(() => NxMatLikeTypeAheadDropdown),
            multi: true,
        },
    ],
})
export class NxMatLikeTypeAheadDropdown extends BaseDropdown implements Validator {
    @Input() form: NgForm;
    @Input() componentId: string = 'searchableSelect';
    @Input() items: Item[];
    @Input() selected: Item | false;
    @Input() type: string;
    @Input() noMatchMsg: string;
    @Input() label: string;
    @Input() freeText: boolean = false;
    @Input() validation: string = ''; // Regex pattern
    @Input() setFocus: boolean = false;

    @Output() onSelected = new EventEmitter<Item>();
    @Output() onClickElsewhere = new EventEmitter<string>();

    dropdownType: string = 'default';
    filter: RegExp;
    _items: Item[];
    helpText: string = '';
    icons = icons;

    @ViewChild('searchInput', { static: false })
    searchInput: ElementRef<HTMLSpanElement>;

    // validates the form, returns null when valid else the validation object
    public validate(c: FormControl<Item>): ValidationErrors | null {
        if (!c.value?.value) {
            return {
                required: true,
            };
        }

        // check pattern
        if (this.validation && !new RegExp(this.validation).test(c.value?.value)) {
            return {
                pattern: true,
            };
        }

        return null; // valid
    }

    constructor(configService: NxConfigService) {
        super(configService);
        this.noMatchMsg ??= this.LANG.search.noMatches || '';
    }

    ngOnInit(): void {
        this.dropdownType = `dropdown-${this.type}`;
        this._selectedItem = { name: '', value: undefined, disabled: true };
    }

    ngOnChanges(changes: NgChanges<NxMatLikeTypeAheadDropdown>): void {
        if (changes.items?.currentValue) {
            this._items = [...this.items];
        }

        if (changes.selected?.currentValue) {
            this._selectedItem = changes.selected.currentValue;
        }
    }

    onSearchInput(_event: Event): void {
        this.form?.form.get(this.componentId)?.markAsUntouched();

        let filter = this.searchInput.nativeElement.innerText;
        this.helpText = '';

        // long strings may produce line break when deleted
        filter = filter.replace(/\n/g, '');

        if (filter) {
            this.filter = new RegExp(`(${escapeRegExp(filter)})`, 'i');
            this._items = this.items.filter(
                item =>
                    caseInsenstiveSearch(item.name, filter) ||
                    (item.help && caseInsenstiveSearch(item.help, filter)),
            );
        } else {
            this.filter = undefined;
            this._items = [...this.items];
        }

        if (this.freeText) {
            const freeTypeItem: Item = {
                name: this.searchInput.nativeElement.innerText,
                value: this.searchInput.nativeElement.innerText,
            };
            this._selectedItem = freeTypeItem;
            this.onSelected.emit(freeTypeItem);
            this.onChangeCallback(freeTypeItem);
            this.show = this._items.length !== 0;
            return;
        }

        this.show = true;
    }

    onBlur(): void {
        this.onSelected.emit(this._selectedItem);
        this.onChangeCallback(this._selectedItem);
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
        this.form?.form.markAsTouched();
        this.form?.form.get(this.componentId)?.markAsTouched();
        this.onClickElsewhere.emit(this.searchInput.nativeElement.innerText);
    }
}
