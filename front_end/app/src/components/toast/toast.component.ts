import {
    Component,
    EventEmitter,
    Input,
    OnChanges,
    Output,
    SimpleChanges,
    TemplateRef
} from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';
import { Subject, timer } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@UntilDestroy()
@Component({
    selector: 'nx-toast',
    templateUrl: 'toast.component.html',
    styleUrls: ['toast.component.scss']
})
export class NxToast implements OnChanges {
    @Input() toast: any;
    @Output() hide = new EventEmitter<boolean>();

    destroy$ = new Subject();
    isTemplate: boolean;

    constructor() {
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes.toast.currentValue) {
            this.isTemplate = this.toast.textOrTpl instanceof TemplateRef;

            if (this.toast.autohide) {
                timer(this.toast.delay).pipe(
                    takeUntil(this.destroy$)
                ).subscribe(() => this.remove());
            }
        }
    }

    remove() {
        this.destroy$.next();
        this.hide.emit(true);
    }
}
