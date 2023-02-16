import { Component, EventEmitter, Input, OnChanges, Output, TemplateRef } from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';
import { Subject, timer } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { NgChanges } from '@utils/ng-changes';

import type { Toast } from '../toast.types';

@UntilDestroy()
@Component({
    selector: 'nx-toast',
    templateUrl: 'toast.component.html',
    styleUrls: ['toast.component.scss'],
})
export class NxToast implements OnChanges {
    @Input() toast: Toast;
    @Output() hide = new EventEmitter<boolean>();

    destroy$ = new Subject<boolean>();

    isTemplate(
        content: string | TemplateRef<unknown> | { value: string; params?: unknown } | unknown,
    ): content is TemplateRef<unknown> {
        return content instanceof TemplateRef;
    }

    ngOnChanges(changes: NgChanges<NxToast>): void {
        if (changes.toast.currentValue) {
            if (this.toast.autohide) {
                timer(this.toast.delay)
                    .pipe(takeUntil(this.destroy$))
                    .subscribe(() => this.remove());
            }
        }
    }

    remove(): void {
        this.destroy$.next(true);
        this.hide.emit(true);
    }
}
