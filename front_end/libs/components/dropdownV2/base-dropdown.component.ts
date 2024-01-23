import { Overlay, OverlayConfig, OverlayRef } from '@angular/cdk/overlay';
import { CdkPortal } from '@angular/cdk/portal';
import {
    AfterViewInit,
    Component,
    ContentChildren,
    ElementRef,
    HostListener,
    Input,
    QueryList,
    ViewChild,
    EventEmitter,
    Output,
    signal,
    computed,
} from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { take } from 'rxjs';

import { icons } from '@static-variables';
import { scrollItemIntoView } from '@utils/general';

import { DropdownState } from './dropdown.types';
import { BaseDropdownItem } from './dropdownItems/baseDropdownItem/dropdown-item.component';

type SelectedType<Value, Multiple extends boolean> = Multiple extends true
    ? Value[]
    : Value | undefined;
@Component({ template: '' })
export abstract class BaseDropdownComponent<T, M extends boolean> implements AfterViewInit {
    @Input() selected: SelectedType<T, M>;
    @Output() selectedChange = new EventEmitter<SelectedType<T, M>>();
    @Output() onChange = new EventEmitter<SelectedType<T, M>>();
    @Input('id') inputId: string = '';
    @Input() placeholder: string = '';
    @Input() disabled: boolean = false;
    @Input() error: boolean = false;
    // TODO: Search is not implemented yet
    @Input() search: boolean = false;
    @Input('aria-label') ariaLabel: string = '';

    @ViewChild('selectWrapper') selectWrapper: ElementRef<HTMLButtonElement>;
    @ViewChild('select') select: ElementRef<HTMLDivElement>;
    @ViewChild('dropdown') dropdown: ElementRef<HTMLDivElement>;
    @ContentChildren(BaseDropdownItem, { descendants: true }) dropdownItems = new QueryList<
        BaseDropdownItem<T>
    >();
    @ViewChild(CdkPortal) contentTemplate: CdkPortal;

    overlayRef: OverlayRef;
    displayText: SafeHtml;
    // TODO: refactor to signals/computed when signal inputs are ready https://github.com/angular/angular/discussions/49682
    showPlaceholder: boolean = true;
    // Using a Symbol here to avoid undefined/null value clash
    private readonly NO_HIGHLIGHT = Symbol('No dropdown highlight');
    highlightValue$$ = signal<T | symbol>(this.NO_HIGHLIGHT);
    ariaMultiselectable: boolean = false;

    openState$$ = signal(DropdownState.Closed);
    dropdownClosed$$ = computed(() => this.openState$$() === DropdownState.Closed);
    dropdownOpen$$ = computed(() => this.openState$$() === DropdownState.Open);
    dropdownSettled$$ = computed(() => this.dropdownClosed$$() || this.dropdownOpen$$());
    dropdownOpening$$ = computed(() => this.openState$$() === DropdownState.Opening);
    dropdownClosing$$ = computed(() => this.openState$$() === DropdownState.Closing);
    dropdownAbortingOpen$$ = computed(() => this.openState$$() === DropdownState.AbortingOpen);

    constructor(
        public overlay: Overlay,
        public domSanitizer: DomSanitizer,
    ) {}

    ngAfterViewInit(): void {
        this.manuallySetSelectedOption();
        this.setPlaceholderOrDisplayText();
    }

    abstract handleSelectionChange(): void;

    showDropdown(): void {
        if (!this.dropdownClosed$$()) {
            return;
        }
        this.openState$$.set(DropdownState.Opening);
        this.overlayRef = this.overlay.create(this.getOverlayConfig());
        this.overlayRef
            .attachments()
            .pipe(take(1))
            .subscribe(() => {
                if (this.openState$$() === DropdownState.AbortingOpen) {
                    this.hideDropdown();
                    return;
                }
                this.openState$$.set(DropdownState.Open);
                this.setOverlayWidth();
            });
        this.overlayRef.attach(this.contentTemplate);
    }
    hideDropdown(): void {
        if (
            !(
                this.openState$$() === DropdownState.Open ||
                this.openState$$() === DropdownState.AbortingOpen
            )
        ) {
            return;
        }
        this.openState$$.set(DropdownState.Closing);
        this.overlayRef
            .detachments()
            .pipe(take(1))
            .subscribe(() => {
                this.openState$$.set(DropdownState.Closed);
            });
        this.overlayRef.detach();
    }
    toggleDropdown(): void {
        if (this.disabled) {
            // eslint-disable-next-line no-useless-return
            return;
        } else if (this.dropdownClosed$$()) {
            this.showDropdown();
        } else if (this.dropdownOpen$$()) {
            this.hideDropdown();
        }
    }

    getFirstEnabled(): BaseDropdownItem<T> | undefined {
        return this.dropdownItems.find(item => !item.disabled);
    }

    getPrevEnabled(currentValue: T): BaseDropdownItem<T> | undefined {
        let prevEnabled: BaseDropdownItem<T> | undefined;
        for (const item of this.dropdownItems) {
            if (item.value === currentValue) {
                return prevEnabled;
            } else if (!item.disabled) {
                prevEnabled = item;
            }
        }
    }

    getNextEnabled(currentValue: T): BaseDropdownItem<T> | undefined {
        let pastCurrent = false;
        for (const item of this.dropdownItems) {
            if (!pastCurrent) {
                if (item.value === currentValue) {
                    pastCurrent = true;
                }
            } else if (!item.disabled) {
                return item;
            }
        }
    }

    scrollOptionIntoView(item: BaseDropdownItem<T>): void {
        scrollItemIntoView(item.self.nativeElement, this.dropdown.nativeElement);
    }

    abstract onKeyDown(event: KeyboardEvent): void;
    abstract onBlur(event: FocusEvent): void;

    handleOptionSelected(option: BaseDropdownItem<T>): void {
        // Set the selected option(s) stored in the component
        this.updateSelectedOptionComponent(option);
        // Update the placeholder/displayText based on the new selected option(s)
        this.setPlaceholderOrDisplayText();
        // Emit the new values
        this.handleSelectionChange();
    }

    protected abstract updateSelectedOptionComponent(option: BaseDropdownItem<T>): void;

    // Called when the selected value is set or changed outside of this component
    protected abstract manuallySetSelectedOption(): void;

    protected abstract setPlaceholderOrDisplayText(): void;

    // Since we are programmatically setting the dropdown width we need to recalculate on window resize
    @HostListener('window:resize')
    onWinResize(): void {
        this.setOverlayWidth();
    }

    // Set overlay width to the width of the select element. By default it would be the width of the dropdown items
    setOverlayWidth(): void {
        if (!this.overlayRef) {
            return;
        }
        this.overlayRef.updateSize({
            width: this.selectWrapper.nativeElement.getBoundingClientRect().width,
        });
    }

    private getOverlayConfig(): OverlayConfig {
        const positionStrategy = this.overlay
            .position()
            .flexibleConnectedTo(this.selectWrapper.nativeElement)
            .withPush(true)
            // Try to open below dropdown, if not enough space, open above
            .withPositions([
                {
                    originX: 'start',
                    originY: 'bottom',
                    overlayX: 'start',
                    overlayY: 'top',
                    offsetY: 0,
                },
                {
                    originX: 'start',
                    originY: 'top',
                    overlayX: 'start',
                    overlayY: 'bottom',
                    offsetY: 0,
                },
            ]);

        const scrollStrategy = this.overlay.scrollStrategies.reposition();
        return new OverlayConfig({
            positionStrategy,
            scrollStrategy,
            hasBackdrop: false,
        });
    }
    icons = icons;
}
