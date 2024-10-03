import { Overlay, OverlayConfig, OverlayRef } from '@angular/cdk/overlay';
import { CdkPortal } from '@angular/cdk/portal';
import {
    Component,
    computed,
    ContentChildren,
    effect,
    ElementRef,
    EventEmitter,
    HostListener,
    Input,
    Output,
    QueryList,
    signal,
    ViewChild,
    WritableSignal,
} from '@angular/core';
import { ControlValueAccessor } from '@angular/forms';
import { Observable, take } from 'rxjs';

import { icons } from '@static-variables';
import { scrollItemIntoView } from '@utils/general';

import { BaseSelectV2Item } from './items/base-select-item/base-select-item.component';
import { DropdownState } from './select-v2.types';

type SelectedType<Value, Multiple extends boolean> = Multiple extends true
    ? Value[]
    : Value | undefined;
@Component({ template: '' })
export abstract class BaseSelectV2Component<T, M extends boolean> implements ControlValueAccessor {
    protected abstract selected$$: WritableSignal<SelectedType<T, M>>;
    @Input('id') inputId: string = '';
    @Input() placeholder: string = '';
    @Input({ alias: 'disabled' }) set _disabled(state: boolean) {
        this.disabled.set(state);
    }
    @Output() disabledChange = new EventEmitter<boolean>();
    disabled = signal(false);
    disabledOutputEffect = effect(
        () => {
            const disabled = this.disabled();
            this.disabledChange.emit(disabled);
        },
        { allowSignalWrites: true },
    );
    // TODO: Search is not implemented yet
    @Input() search: boolean = false;
    @Input('aria-label') ariaLabel: string = '';

    @Output() close = new EventEmitter<void>();

    @ViewChild('selectWrapper') selectWrapper: ElementRef<HTMLDivElement>;
    @ViewChild('dropdown') dropdown: ElementRef<HTMLDivElement>;
    @ContentChildren(BaseSelectV2Item, { descendants: true }) dropdownItems = new QueryList<
        BaseSelectV2Item<T>
    >();
    @ViewChild(CdkPortal) contentTemplate: CdkPortal;

    overlayRef: OverlayRef;
    displayText: Observable<string>;
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

    onChangeOfSelected = effect(() => {
        this.selected$$();
        this.manuallySetSelectedOption();
        this.setPlaceholderOrDisplayText();
    });

    constructor(public overlay: Overlay) {}

    // ControlValueAccessor methods
    writeValue(updatedSelected: SelectedType<T, M>): void {
        this.selected$$.set(updatedSelected);
    }
    _onChangeCallback: ((newSelectedValue: SelectedType<T, M>) => void) | undefined;
    registerOnChange(onChange: (newSelectedValue: SelectedType<T, M>) => void): void {
        this._onChangeCallback = onChange;
    }
    _onTouchedCallback: (() => void) | undefined;
    registerOnTouched(onTouched: () => void): void {
        this._onTouchedCallback = onTouched;
    }
    setDisabledState?(isDisabled: boolean): void {
        this.disabled.set(isDisabled);
    }

    updateSelected(selected: SelectedType<T, M>): void {
        this.selected$$.set(selected);
        this._onChangeCallback?.(selected);
    }

    abstract handleSelectionChange(): void;

    onOverlayAttach(): void {
        this.setOverlayWidth();
        this.openState$$.set(DropdownState.Open);
    }

    showDropdown(): void {
        if (!this.dropdownClosed$$()) {
            return;
        }
        this.openState$$.set(DropdownState.Opening);
        this.overlayRef = this.overlay.create(this.getOverlayConfig());
        this.setOverlayWidth();
        this.overlayRef
            .attachments()
            .pipe(take(1))
            .subscribe(() => {
                if (this.openState$$() === DropdownState.AbortingOpen) {
                    this.hideDropdown();
                    return;
                }
                this.onOverlayAttach();
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
                this.close.emit();
                this.openState$$.set(DropdownState.Closed);
            });
        this.overlayRef.detach();
    }
    toggleDropdown(): void {
        if (this.disabled()) {
            return;
        }
        if (this.dropdownClosed$$()) {
            this.showDropdown();
        } else if (this.dropdownOpen$$()) {
            this.hideDropdown();
        }
    }

    getFirstEnabled(): BaseSelectV2Item<T> | undefined {
        return this.dropdownItems.find(item => !item.disabled);
    }

    getPrevEnabled(currentValue: T): BaseSelectV2Item<T> | undefined {
        let prevEnabled: BaseSelectV2Item<T> | undefined;
        for (const item of this.dropdownItems) {
            if (item.value === currentValue) {
                return prevEnabled;
            } else if (!item.disabled) {
                prevEnabled = item;
            }
        }
    }

    getNextEnabled(currentValue: T): BaseSelectV2Item<T> | undefined {
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

    scrollOptionIntoView(item: BaseSelectV2Item<T>): void {
        scrollItemIntoView(item.self.nativeElement, this.dropdown.nativeElement);
    }

    abstract onKeyDown(event: KeyboardEvent): void;

    onBlur(event: FocusEvent): void {
        this._onTouchedCallback?.();
    }

    handleOptionSelected(option: BaseSelectV2Item<T>): void {
        // Set the selected option(s) stored in the component
        this.updateSelectedOptionComponent(option);
        // Emit the new values
        this.handleSelectionChange();
    }

    protected abstract updateSelectedOptionComponent(option: BaseSelectV2Item<T>): void;

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
