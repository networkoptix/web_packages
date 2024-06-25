import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    ElementRef,
    Inject,
    ViewChild,
    ViewEncapsulation,
    computed,
    input,
} from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { NxThemeAttributeDirective } from '@directives/theme-attribute.directive';

import { NxButtonToggleGroupComponent } from './button-toggle-group.component';
import { NX_BUTTON_TOGGLE_GROUP } from './button-toggle-group.token';

@Component({
    selector: 'nx-button-toggle',
    templateUrl: 'button-toggle.component.html',
    styleUrls: ['button-toggle.component.scss'],
    encapsulation: ViewEncapsulation.None,
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, TranslateModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    hostDirectives: [NxThemeAttributeDirective],
})
export class NxButtonToggleComponent<T> {
    value = input.required<T>();
    color = input<'brand' | 'danger' | 'default'>('default');
    colorClass = computed<string>(() => `nx-button-toggle__button--${this.color()}`);

    @ViewChild('button', { static: true }) elementRef: ElementRef<HTMLButtonElement>;

    constructor(
        @Inject(NX_BUTTON_TOGGLE_GROUP) private toggleGroup: NxButtonToggleGroupComponent<T>,
    ) {}

    protected checked = computed<boolean>(() => this.toggleGroup.value() === this.value());
    protected disabled = this.toggleGroup.disabled.asReadonly();

    protected onClick(): void {
        this.toggleGroup.select(this.value());
    }

    protected onFocus(): void {
        this.toggleGroup.focused.set(this);
    }

    protected onBlur(): void {
        this.toggleGroup.focused.set(null);
    }

    private index = computed<number>(() => this.toggleGroup.indexes().get(this)!);
    protected tabIndex = computed<-1 | undefined>(() => {
        const [selected, focused, index] = [
            this.toggleGroup.value(),
            this.toggleGroup.focused(),
            this.index(),
        ];

        if (!focused) {
            // If focus entering into toggle group, focus selected or first if no selected
            const noSelected = selected === this.toggleGroup.NO_VALUE;
            if (noSelected && index > 0) {
                return -1;
            } else if (!noSelected && selected !== this.value()) {
                return -1;
            }
        } else if (focused !== this) {
            return -1;
        }
    });
}
