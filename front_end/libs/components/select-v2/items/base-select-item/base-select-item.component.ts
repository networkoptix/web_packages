import {
    Component,
    ElementRef,
    HostBinding,
    HostListener,
    Inject,
    Input,
    computed,
} from '@angular/core';

import { BaseSelectV2Component } from '../../base-select-v2.component';
import { BaseSelectV2InjectionToken } from '../../select-v2.types';

@Component({ template: '' })
export abstract class BaseSelectV2Item<T> {
    @Input() value: T;

    @HostBinding('class.disabled') @Input() disabled: boolean = false;
    @HostBinding('class.selected') @Input() selected: boolean = false;
    @HostBinding('attr.aria-label') @Input('aria-label') ariaLabel: string = '';
    @HostBinding('class.highlighted') get highlighted$$(): boolean {
        return this.computedHighlight$$();
    }
    private computedHighlight$$ = computed(() => this.select.highlightValue$$() === this.value);

    @HostBinding('attr.role') role = 'option';

    @HostListener('click', ['$event']) onClick(event: MouseEvent): void {
        event.preventDefault();
        if (!this.disabled) {
            this.select.handleOptionSelected(this);
            this.select.highlightValue$$.set(this.value);
        }
    }

    @HostListener('mousedown', ['$event']) onMouseDown(event: MouseEvent): void {
        event.preventDefault();
        // Stop mousedown on options from unfocusing button
    }

    constructor(
        @Inject(BaseSelectV2InjectionToken) private select: BaseSelectV2Component<T, boolean>,
        public self: ElementRef<HTMLElement>,
    ) {}

    // This can be any html string that you want displayed in the selected portion of the dropdown
    abstract getOptionHtml(): string;
}
