import { DomPortal, PortalModule } from '@angular/cdk/portal';
import { CommonModule } from '@angular/common';
import {
    AfterViewInit,
    booleanAttribute,
    Component,
    computed,
    effect,
    ElementRef,
    EventEmitter,
    forwardRef,
    input,
    Input,
    OnDestroy,
    Output,
    signal,
    ViewChild,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxFormFieldControlDirective } from '@components/forms/form-field/form-field-control.directive';
import { icons } from '@static-variables';

type SpanRef = ElementRef<HTMLSpanElement>;

@Component({
    selector: 'nx-org-step-select',
    templateUrl: 'org-step-select.component.html',
    styleUrls: ['org-step-select.component.scss'],
    standalone: true,
    imports: [CommonModule, PortalModule, AngularSvgIconModule, TranslateModule],
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => NxOrgStepSelectComponent),
            multi: true,
        },
    ],
    hostDirectives: [NxFormFieldControlDirective],
})
export class NxOrgStepSelectComponent implements AfterViewInit, OnDestroy, ControlValueAccessor {
    controlId = input<string>();

    @ViewChild('pathContainer') private pathContainer: ElementRef<HTMLDivElement>;
    private containerObserver = new ResizeObserver(([container]) => {
        const [borderBoxSize] = container.borderBoxSize;
        this.containerWidth.set(borderBoxSize.inlineSize);
    });
    private containerWidth = signal(0);

    @ViewChild('ellipsesSpan') private ellipsesSpan: SpanRef;
    private fullPathSpan = signal<HTMLSpanElement | undefined>(undefined);
    @ViewChild('fullPathSpan') set _fullPathSpan(child: SpanRef | undefined) {
        this.fullPathSpan.set(child?.nativeElement);
    }
    private shortPathSpan = signal<HTMLSpanElement | undefined>(undefined);
    @ViewChild('shortPathSpan') set _shortPathSpan(child: SpanRef | undefined) {
        this.shortPathSpan.set(child?.nativeElement);
    }
    @ViewChild('shortPathCenterSpan') private shortPathCenterSpan?: SpanRef;
    @ViewChild('shortPathTailSpan') private shortPathTailSpan?: SpanRef;
    @ViewChild('extraShortPathSpan') private extraShortPathSpan?: SpanRef;

    protected _pathEffect = effect(() => {
        const [containerWidth, fullPathSpan, shortPathSpan] = [
            this.containerWidth(),
            this.fullPathSpan(),
            this.shortPathSpan(),
        ];

        let selectedPath: HTMLSpanElement | undefined;

        if (!fullPathSpan) {
            // No value
        } else if (!shortPathSpan) {
            selectedPath = fullPathSpan; // Org only
        } else {
            const ellipsesSpan = this.ellipsesSpan.nativeElement;
            const shortPathCenterSpan = this.shortPathCenterSpan!.nativeElement;
            const shortPathTailSpan = this.shortPathTailSpan!.nativeElement;
            const extraShortPathSpan = this.extraShortPathSpan!.nativeElement;

            const fullPathWidth = Math.floor(fullPathSpan.getBoundingClientRect().width);
            // Using fullPathWidth.scrollWidth is 0 on Chrome only for some reason

            if (fullPathWidth < containerWidth) {
                selectedPath = fullPathSpan;
            } else if (
                containerWidth - (shortPathCenterSpan.clientWidth + shortPathTailSpan.scrollWidth) >
                ellipsesSpan.clientWidth
            ) {
                /* If the entire tail end fits and leaves more space than ellipses,
                shorten the head (org name) */
                selectedPath = shortPathSpan;
            } else {
                selectedPath = extraShortPathSpan;
            }
        }

        this.selectedPath?.detach();
        this.selectedPath = selectedPath ? new DomPortal(selectedPath) : undefined;
    });

    selectedPath?: DomPortal<HTMLSpanElement>;

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

    private value = signal<string[]>([]);
    fullPath = computed<string>(() => this.value().join('/'));
    shortPath = computed<{ head: string; center: string; tail: string } | undefined>(() => {
        const value = this.value();
        if (value.length === 2) {
            const [head, tail] = value;
            return { head, center: '/', tail };
        } else if (value.length > 2) {
            const head = value[0];
            const tail = value[value.length - 1];
            return { head, center: '/.../', tail };
        }
    });

    onClick(): void {
        if (!this.readOnly()) {
            this.click.emit();
        }
    }

    ngAfterViewInit(): void {
        this.containerWidth.set(this.pathContainer.nativeElement.clientWidth);
        // Observer doesn't write until after first path effect

        this.containerObserver.observe(this.pathContainer.nativeElement);
    }

    ngOnDestroy(): void {
        this.containerObserver.disconnect();
    }

    writeValue(value: string[]): void {
        if (value === null) {
            return;
        }
        this.value.set(value);
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
