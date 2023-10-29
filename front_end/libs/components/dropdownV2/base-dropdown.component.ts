import { Overlay, OverlayConfig, OverlayRef } from '@angular/cdk/overlay';
import { CdkPortal } from '@angular/cdk/portal';
import {
    AfterContentInit,
    Component,
    ContentChildren,
    ElementRef,
    HostListener,
    Input,
    QueryList,
    ViewChild,
    EventEmitter,
    Output,
} from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

import { icons } from '@static-variables';

import { BaseDropdownItem } from './dropdownItems/baseDropdownItem/dropdown-item.component';

type SelectedType<Value, Multiple extends boolean> = Multiple extends true
    ? Value[]
    : Value | undefined;
@Component({ template: '' })
export abstract class BaseDropdownComponent<T, M extends boolean> implements AfterContentInit {
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

    @ViewChild('selectWrapper') selectWrapper: ElementRef<HTMLDivElement>;
    @ViewChild('select') select: ElementRef<HTMLDivElement>;
    @ContentChildren(BaseDropdownItem, { descendants: true }) dropdownItems: QueryList<
        BaseDropdownItem<T>
    > = new QueryList<BaseDropdownItem<T>>();
    @ViewChild(CdkPortal) contentTemplate: CdkPortal;

    overlayRef: OverlayRef;
    displayText: SafeHtml;
    // TODO: refactor to signals/computed when signal inputs are ready https://github.com/angular/angular/discussions/49682
    dropdownOpen: boolean = false;
    showPlaceholder: boolean = true;

    constructor(public overlay: Overlay, public domSanitizer: DomSanitizer) {}

    ngAfterContentInit(): void {
        this.manuallySetSelectedOption();
        this.setPlaceholderOrDisplayText();
    }

    abstract handleSelectionChange(): void;

    showDropdown(): void {
        if (!this.disabled) {
            this.overlayRef = this.overlay.create(this.getOverlayConfig());
            this.overlayRef.attach(this.contentTemplate);
            this.setOverlayWidth();
            this.overlayRef.outsidePointerEvents().subscribe(() => this.hideDropdown());
            this.dropdownOpen = true;
        }
    }
    hideDropdown(): void {
        this.overlayRef.detach();
        this.dropdownOpen = false;
    }

    // TODO: Add keyboard navigation
    onKeyDown(event: KeyboardEvent): void {}
    onBlur(): void {}

    onDropMenuIconClick(event: UIEvent): void {
        if (!this.disabled) {
            event.stopPropagation();
            this.select.nativeElement.focus();
            this.select.nativeElement.click();
        }
    }

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
