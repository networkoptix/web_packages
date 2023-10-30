import { Overlay, OverlayConfig, OverlayModule, OverlayRef } from '@angular/cdk/overlay';
import { CdkPortal, PortalModule } from '@angular/cdk/portal';
import { CommonModule } from '@angular/common';
import {
    AfterViewInit,
    Component,
    ContentChildren,
    ElementRef,
    EventEmitter,
    HostListener,
    Input,
    OnChanges,
    Output,
    QueryList,
    ViewChild,
} from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { icons } from '@static-variables';
import { NgChanges } from '@utils/ng-changes';

import { BaseDropdownItem } from './dropdownItems//baseDropdownItem/dropdown-item.component';

@Component({
    imports: [CommonModule, AngularSvgIconModule, OverlayModule, PortalModule],
    selector: 'nx-dropdown',
    templateUrl: 'dropdown.component.html',
    styleUrls: ['dropdown.component.scss'],
    standalone: true,
})
export class NxDropdownComponent<T> implements AfterViewInit, OnChanges {
    @Input('id') inputId: string = '';
    @Input() selected: T;
    @Output() selectedChange = new EventEmitter<T>();
    @Input() placeholder: string = '';
    @Input() disabled: boolean = false;
    @Input() error: boolean = false;
    // TODO: Multiple and search are not implemented yet
    @Input() multiple: boolean = false;
    @Input() search: boolean = false;
    @Input('aria-label') ariaLabel: string = '';
    @Output() onChange = new EventEmitter<T>();

    @ViewChild('selectWrapper') selectWrapper: ElementRef<HTMLDivElement>;
    @ViewChild('select') select: ElementRef<HTMLDivElement>;
    @ContentChildren(BaseDropdownItem, { descendants: true }) dropdownItems: QueryList<
        BaseDropdownItem<T>
    >;
    @ViewChild(CdkPortal) contentTemplate: CdkPortal;

    private overlayRef: OverlayRef;
    displayText: SafeHtml;
    // TODO: refactor to signals/computed when signal inputs are ready https://github.com/angular/angular/discussions/49682
    dropdownOpen: boolean = false;
    showPlaceholder: boolean = true;

    private selectedOptionComponent: BaseDropdownItem<T> | undefined;

    constructor(private overlay: Overlay, private domSanitizer: DomSanitizer) {}
    ngOnChanges(changes: NgChanges<NxDropdownComponent<unknown>>): void {
        if (changes.selected) {
            this.manuallySetSelectedOption();
            this.setSelectedOptionOrPlaceholder();
        }
    }
    ngAfterViewInit(): void {
        this.manuallySetSelectedOption();
        this.setSelectedOptionOrPlaceholder();
    }

    handleSelectionChange(updatedSelection: T): void {
        this.selectedChange.emit(updatedSelection);
        this.onChange.emit(updatedSelection);
    }

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

    handleOptionSelected(option: BaseDropdownItem<T> | undefined): void {
        this.hideDropdown();
        if (this.selectedOptionComponent !== option) {
            this.selectedOptionComponent = option;
            this.setSelectedOptionOrPlaceholder();
            this.handleSelectionChange(option?.value);
        }
    }

    private manuallySetSelectedOption(): void {
        if (this.selected !== undefined) {
            this.dropdownItems?.forEach(item => {
                if (item.value === this.selected) {
                    this.selectedOptionComponent = item;
                }
            });
        }
    }

    private setSelectedOptionOrPlaceholder(): void {
        if (this.selectedOptionComponent !== undefined) {
            this.displayText = this.domSanitizer.bypassSecurityTrustHtml(
                this.selectedOptionComponent.getOptionHtml(),
            );
            this.showPlaceholder = false;
        } else {
            this.displayText = this.domSanitizer.bypassSecurityTrustHtml(this.placeholder);
            this.showPlaceholder = true;
        }
    }

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
                    offsetY: 4,
                },
                {
                    originX: 'start',
                    originY: 'top',
                    overlayX: 'start',
                    overlayY: 'bottom',
                    offsetY: -4,
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
