import { DomPortal, PortalModule } from '@angular/cdk/portal';
import { CommonModule } from '@angular/common';
import {
    Component,
    ElementRef,
    EventEmitter,
    Input,
    OnInit,
    Output,
    QueryList,
    ViewChild,
    ViewChildren,
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
import { paramSortFunc } from '@utils/general';

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
})
export class NxOrgStepSelectComponent implements OnInit, ControlValueAccessor {
    @ViewChild('pathContainer') private pathContainer: ElementRef<HTMLDivElement>;
    @ViewChildren('path') protected set _paths(value: QueryList<ElementRef<HTMLSpanElement>>) {
        this.paths.set(value.map(p => p.nativeElement));
    }
    private paths = signal<HTMLSpanElement[]>([]);
    protected _pathsEffect = effect(() => {
        const paths = this.paths()
            .slice()
            .sort(paramSortFunc(p => p.scrollWidth, false));
        if (paths.length === 1) {
            this.selectedPath = new DomPortal(paths[0]);
            return;
        }

        // Folder names might be shorter than ellipses, try full path first
        const [fullPath] = paths.splice(
            paths.findIndex(p => p.hasAttribute('data-full-path')),
            1,
        );
        if (fullPath.clientWidth < this.pathContainer.nativeElement.clientWidth) {
            this.selectedPath = new DomPortal(fullPath);
            return;
        }

        for (let i = 0; i < paths.length; i++) {
            const path = paths[i];
            if (path.clientWidth < this.pathContainer.nativeElement.clientWidth) {
                this.selectedPath = new DomPortal(paths[i]);
                return;
            }
        }

        this.selectedPath = new DomPortal(paths.pop()!);
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
