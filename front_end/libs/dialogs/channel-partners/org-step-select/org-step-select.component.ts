import { CommonModule } from '@angular/common';
import {
    Component,
    ElementRef,
    EventEmitter,
    Input,
    OnInit,
    Output,
    ViewChild,
    booleanAttribute,
    effect,
    forwardRef,
    input,
    signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { icons } from '@static-variables';

@Component({
    selector: 'nx-org-step-select',
    templateUrl: 'org-step-select.component.html',
    styleUrls: ['org-step-select.component.scss'],
    standalone: true,
    imports: [CommonModule, AngularSvgIconModule, TranslateModule],
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => NxOrgStepSelectComponent),
            multi: true,
        },
    ],
})
export class NxOrgStepSelectComponent implements OnInit, ControlValueAccessor {
    icons = icons;

    @ViewChild('selectButton') private selectButton: ElementRef<HTMLButtonElement>;
    focus(): void {
        this.selectButton.nativeElement.focus();
    }

    @Input({ transform: booleanAttribute }) set disabled(state: boolean) {
        this.disabled$$.set(state);
    }
    @Output() disabledChange = new EventEmitter<boolean>();
    disabled$$ = signal(false);
    _disabledChangeEffect = effect(
        () => {
            const disabled = this.disabled$$();
            this.disabledChange.emit(disabled);
        },
        { allowSignalWrites: true },
    );

    readOnly = input<boolean>(false);
    click = new EventEmitter<void>();

    value: string[];

    onClick(): void {
        if (!this.readOnly()) {
            this.click.emit();
        }
    }

    ngOnInit(): void {}

    writeValue(value: string[]): void {
        this.value = value;
    }

    protected onChange = (_: string[]): void => {};
    protected onTouched = (): void => {};
    registerOnChange(fn: (value: string[]) => void): void {
        this.onChange = fn;
    }
    registerOnTouched(fn: () => void): void {
        this.onTouched = fn;
    }

    setDisabledState(isDisabled: boolean): void {
        this.disabled$$.set(isDisabled);
    }
}
