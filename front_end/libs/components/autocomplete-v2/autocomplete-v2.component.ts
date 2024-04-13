import { Overlay, OverlayModule, OverlayRef } from '@angular/cdk/overlay';
import { CdkPortal, PortalModule } from '@angular/cdk/portal';
import { CommonModule } from '@angular/common';
import {
    Component,
    ContentChildren,
    ElementRef,
    EventEmitter,
    HostListener,
    Output,
    QueryList,
    TemplateRef,
    ViewChild,
    booleanAttribute,
    computed,
    effect,
    forwardRef,
    input,
    signal,
    untracked,
} from '@angular/core';
import {
    AbstractControl,
    ControlValueAccessor,
    FormsModule,
    NG_VALIDATORS,
    NG_VALUE_ACCESSOR,
    ValidationErrors,
    Validator,
} from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { last } from 'lodash-es';

import { throttle } from '@decorators/throttle';
import LANG from '@language_static';
import { icons } from '@static-variables';
import { caseInsenstiveSearch, scrollItemIntoView } from '@utils/general';
import { connectedPosition } from '@utils/nx';

import { NxAutoCompleteItemComponent as Item } from './autocomplete-item/autocomplete-item.component';
import { AutocompleteV2InjectionToken } from './autocomplete-v2-injection-token';

/* https://material.angular.io/components/autocomplete/overview
Behavior borrowed from Material Autocomplete:
- Open dropdown on input element focus
- Focus stays on input element during keyboard nav
- Keyboard nav is trapped in dropdown once entered
- Highlight index is unset on input typing
- Esc key closes the dropdown
- Clicking on the input while dropdown is open does nothing
- Clicking on the input while dropdown is closed opens the dropdown
- Up/down key on the input while the dropdown is open increments/decrements highlight with looping
- Up/down key on the input while dropdown is closed opens the dropdown
- Clicking an element or Enter key while highlighted will select it and close the dropdown
- Focus escaping from the input will close the dropdown
    - The X button is "inside" the input visually so <input> <=> <button> doesn't count
- requireSelection behavior, details in component

Custom behavior:
- Search displays up to a fixed number of items instead of all
- No matching results message
- Clear the search and focus input when clicking on the X button
    - This also unsets highlight
- Enter with one match selects it even without highlight
*/
@Component({
    selector: 'nx-autocomplete-v2',
    templateUrl: 'autocomplete-v2.component.html',
    styleUrls: ['autocomplete-v2.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        PortalModule,
        OverlayModule,
        AngularSvgIconModule,
        TranslateModule,
    ],
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => NxAutocompleteV2Component),
            multi: true,
        },
        {
            provide: NG_VALIDATORS,
            useExisting: forwardRef(() => NxAutocompleteV2Component),
            multi: true,
        },
        {
            provide: AutocompleteV2InjectionToken,
            useExisting: forwardRef(() => NxAutocompleteV2Component),
        },
    ],
})
export class NxAutocompleteV2Component<T> implements ControlValueAccessor, Validator {
    placeholder = input<string>(this.translate.instant(LANG.search.Search));

    /** Require the autocomplete to contain text */
    required = input<boolean, unknown>(false, { transform: booleanAttribute });

    /** Whether the user is required to make a selection when they're interacting with the autocomplete.
     *
     * If the user moves away from the autocomplete without selecting an option from the list, the value will be reset. If the user opens the panel and closes it without interacting or selecting a value, the initial value will be kept.
     *
     * https://material.angular.io/components/autocomplete/api#MatAutocomplete
     */
    requireSelection = input<boolean, unknown>(false, { transform: booleanAttribute });

    /** Content to display when search does not match anything.
     *
     * Currently should only used with `requireSelection = true` (content will still be displayed
     * without), but this might change if a new design calls for it.
     */
    noMatchesContent = input<string | TemplateRef<unknown>>();

    disabled = input<boolean, unknown>(false, { transform: booleanAttribute });
    readOnly = input<boolean, unknown>(false, { transform: booleanAttribute });

    // Unfortunately the types don't work in the template when assigning from this
    @Output() select = new EventEmitter<T | undefined>();

    @ViewChild('autocompleteInput') private autocompleteInput: ElementRef<HTMLInputElement>;
    @ViewChild('clearBtn') private clearBtn?: ElementRef<HTMLButtonElement>;
    @ViewChild('itemsList') private itemsList?: ElementRef<HTMLUListElement>;
    @ViewChild(CdkPortal) private portal: CdkPortal;
    @ContentChildren(Item) protected set _items(items: QueryList<Item<T>>) {
        this.items.set(items.toArray());
    }
    private items = signal<Item<T>[]>([]);
    protected _itemsChangeEffect = effect(
        () => {
            const [items, requireSelection, selected, matches, highlighted] = [
                this.items(),
                untracked(this.requireSelection),
                untracked(this.selected),
                untracked(this.matches),
                untracked(this.highlighted),
            ];
            if (requireSelection && selected && !items.find(i => i === selected)) {
                this.writeValue('');
                this.onChange('');
            }
            if (highlighted && !matches.find(i => i === highlighted)) {
                this.unsetHighlight();
            }
            // In case of reactive data source and selected/highlighted is removed on update
        },
        { allowSignalWrites: true },
    );

    private overlayRef: OverlayRef;
    private get dropdownOpen(): boolean {
        return this.overlayRef?.hasAttached();
    }

    value = signal<string>('');
    selected = signal<Item<T> | undefined>(undefined);

    private readonly INITIAL_ITEM_LIMIT = 200;
    private readonly MATCH_ITEM_LIMIT = 50;
    matches = computed<Item<T>[]>(() => {
        const value = this.value().trim();
        const items = this.items();
        if (!value) {
            return items.slice(0, this.INITIAL_ITEM_LIMIT);
        }

        const searches = value.split(' ').filter(Boolean);

        const matches: Item<T>[] = [];
        for (const item of items) {
            if (searches.some(s => caseInsenstiveSearch(item.searchString(), s))) {
                matches.push(item);
            }
            if (matches.length === this.MATCH_ITEM_LIMIT) {
                break;
            }
        }
        return matches;
    });

    noMatchesString = computed<string | null>(() => {
        const content = this.noMatchesContent();
        return content && typeof content === 'string' ? content : null;
    });
    noMatchesTemplate = computed<TemplateRef<unknown> | null>(() => {
        const content = this.noMatchesContent();
        return content && typeof content !== 'string' ? content : null;
    });

    highlighted = signal<Item<T> | undefined>(undefined);

    icons = icons;

    constructor(
        private overlay: Overlay,
        private translate: TranslateService,
    ) {}

    ngAfterViewInit(): void {
        this.overlayRef = this.overlay.create({
            positionStrategy: this.overlay
                .position()
                .flexibleConnectedTo(this.autocompleteInput.nativeElement)
                .withPush(true)
                .withPositions([
                    connectedPosition({ originPoint: 'SW', overlayPoint: 'NW' }),
                    connectedPosition({ originPoint: 'NW', overlayPoint: 'SW' }),
                ]),
            scrollStrategy: this.overlay.scrollStrategies.reposition(),
            hasBackdrop: false,
        });
    }

    ngOnDestroy(): void {
        this.overlayRef.dispose();
    }

    validate(control: AbstractControl<string, string>): ValidationErrors | null {
        const missingValue = this.required() && control.value === '';
        const missingSelection = this.requireSelection() && !this.selected();
        return missingValue || missingSelection ? { required: true } : null;
    }

    writeValue(value: string, resetSelect = true): void {
        // https://github.com/angular/angular/issues/14988
        if (value === null) {
            return;
        }
        this.value.set(value);
        if (resetSelect) {
            this.selected.set(undefined);
            this.select.emit(undefined);
        }
    }
    private onChange = (_: string): void => {};
    private onTouched = (): void => {};
    registerOnChange(fn: (value: string) => void): void {
        this.onChange = fn;
    }
    registerOnTouched(fn: () => void): void {
        this.onTouched = fn;
    }

    private focusInput(): void {
        if (document.activeElement !== this.autocompleteInput.nativeElement) {
            this.autocompleteInput.nativeElement.focus();
        }
    }

    onInputModelChange(event: string): void {
        this.writeValue(event);
        this.onChange(event);
        this.unsetHighlight();
        this.openDropdown();
    }

    clear(): void {
        this.writeValue('');
        this.onChange('');
        this.unsetHighlight();
        this.focusInput();
    }

    onInputArrowUp(event: Event): void {
        // Default behavior of up/down keys is to navigate to input start/end
        event.preventDefault();
        if (!this.dropdownOpen) {
            this.openDropdown();
            return;
        }
        this.decrementHightlight();
    }

    onInputArrowDown(event: Event): void {
        event.preventDefault();
        if (!this.dropdownOpen) {
            this.openDropdown();
            return;
        }
        this.incrementHightlight();
    }

    onInputEsc(event: Event): void {
        if (this.dropdownOpen) {
            event.stopPropagation();
        }
        this.closeDropdown();
    }

    onInputEnter(event: Event): void {
        if (!this.dropdownOpen) {
            return;
        }
        event.preventDefault(); // Stop form submit

        if (this.matches().length === 1) {
            const onlyMatch = this.matches()[0];
            if (!onlyMatch.disabled()) {
                this.selectItem(onlyMatch);
            }
            return;
        }

        const highlighted = this.highlighted();
        if (highlighted && !highlighted.disabled()) {
            this.selectItem(highlighted);
        }
    }

    onInputBlur(event: FocusEvent): void {
        const relatedTarget = event.relatedTarget as HTMLElement | null;
        if (
            relatedTarget === this.autocompleteInput.nativeElement ||
            (this.clearBtn && relatedTarget === this.clearBtn.nativeElement)
        ) {
            return;
        }

        this.closeDropdown();

        if (this.requireSelection() && !this.selected()) {
            this.writeValue('');
            this.onChange('');
        }

        this.onTouched();
    }

    @HostListener('window:resize')
    @throttle()
    onResize(): void {
        if (this.dropdownOpen) {
            this.setOverlayWidth();
        }
    }

    private setOverlayWidth(): void {
        this.overlayRef.updateSize({
            width: this.autocompleteInput.nativeElement.getBoundingClientRect().width,
        });
    }

    openDropdown(): void {
        if (this.dropdownOpen) {
            return;
        }
        this.setOverlayWidth();
        this.overlayRef.attach(this.portal);
    }

    closeDropdown(): void {
        if (!this.dropdownOpen) {
            return;
        }
        this.overlayRef.detach();
        this.unsetHighlight();
    }

    private incrementHightlight(): void {
        const highlight = this.highlighted();
        const matches = this.matches();
        let target: Item<T>;
        if (!matches.length) {
            return;
        } else if (!highlight || highlight === last(matches)) {
            target = matches[0];
        } else {
            const index = matches.indexOf(highlight);
            target = matches[index + 1];
        }
        this.highlighted.set(target);
        this.scrollOptionIntoView(target);
    }

    private decrementHightlight(): void {
        const highlight = this.highlighted();
        const matches = this.matches();
        let target: Item<T>;
        if (!matches.length) {
            return;
        } else if (!highlight || highlight === matches[0]) {
            target = last(matches)!;
        } else {
            const index = matches.indexOf(highlight);
            target = matches[index - 1];
        }
        this.highlighted.set(target);
        this.scrollOptionIntoView(target);
    }

    private unsetHighlight(): void {
        this.highlighted.set(undefined);
    }

    private scrollOptionIntoView(item: Item<T>): void {
        scrollItemIntoView(item.listElem.nativeElement, this.itemsList!.nativeElement);
    }

    selectItem(item: Item<T>): void {
        // Order is important here, select needs to be updated before writing value
        // to validate for requireSelection
        this.selected.set(item);
        this.select.emit(item.value());
        this.writeValue(item.displayText(), false);
        this.onChange(item.displayText());
        this.closeDropdown();
        this.focusInput();
    }
}
