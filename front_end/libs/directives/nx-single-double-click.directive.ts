// Thanks Niv!
// https://www.bytelimes.com/stop-the-the-horrible-war-between-single-and-double-clicks-in-angular
// modified to handle "click", "click-and-hold" and "dbl-click"

import { Directive, EventEmitter, HostListener, Input, OnInit, Output } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { BehaviorSubject, Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

@UntilDestroy()
@Directive({
    selector: '[nxClick], [nxDblClick], [nxHoldStart], [nxHoldStop]',
    standalone: true,
})
export class NxClickDoubleDirective implements OnInit {
    @Input('debounceTime') debounceTime: number = 350;
    @Output('nxDblClick') doubleClick = new EventEmitter<MouseEvent>();
    @Output('nxClick') singleClick = new EventEmitter<MouseEvent>();
    @Output('nxHoldStart') holdStart = new EventEmitter<MouseEvent>();
    @Output('nxHoldStop') holdStop = new EventEmitter<MouseEvent>();

    private click$ = new Subject<MouseEvent>();
    private mouseUp$ = new BehaviorSubject<boolean>(false);

    ngOnInit(): void {
        this.click$
            .pipe(debounceTime(this.debounceTime), untilDestroyed(this))
            .subscribe((event: MouseEvent) => {
                if (event.type === 'mousedown') {
                    if (!this.mouseUp$.value) {
                        // console.log('hold => ');
                        this.holdStart.emit(event);
                    } else {
                        this.singleClick.emit(event);
                    }
                } else {
                    this.doubleClick.emit(event);
                }
            });
    }

    @HostListener('mouseup', ['$event'])
    clickHoldEvent(event: MouseEvent): void {
        event.preventDefault();
        event.stopPropagation();
        this.mouseUp$.next(true);
        this.holdStop.emit(event);
    }

    @HostListener('mousedown', ['$event'])
    clickEvent(event: MouseEvent): void {
        event.preventDefault();
        event.stopPropagation();
        this.mouseUp$.next(false);
        this.click$.next(event);
    }

    @HostListener('dblclick', ['$event'])
    doubleClickEvent(event: MouseEvent): void {
        event.preventDefault();
        event.stopPropagation();
        this.click$.next(event);
    }
}
