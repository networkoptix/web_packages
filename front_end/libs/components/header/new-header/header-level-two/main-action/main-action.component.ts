import { CommonModule } from '@angular/common';
import {
    AfterViewInit,
    Component,
    ElementRef,
    EventEmitter,
    inject,
    Output,
    ViewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { combineLatestWith, debounceTime, map, Observable } from 'rxjs';

import { NxAccountService } from '@services/account.service';
import { NxHeaderService } from '@services/nx-header.service';
import { NxScrollMechanicsService } from '@services/scroll-mechanics.service';
import { icons } from '@static-variables';

@Component({
    selector: 'nx-main-action',
    templateUrl: './main-action.component.html',
    styleUrls: ['./main-action.component.scss'],
    standalone: true,
    imports: [CommonModule, AngularSvgIconModule, TranslateModule],
})
export class NxMainActionComponent implements AfterViewInit {
    icons = icons;
    @Output() widthChange = new EventEmitter<number>();
    @ViewChild('mainAction') mainActionRef: ElementRef<HTMLElement>;

    headerService = inject(NxHeaderService);
    private accountService = inject(NxAccountService);
    private scrollMechanicsService = inject(NxScrollMechanicsService);
    private store = inject(Store);

    action$: Observable<'login' | 'logout' | 'none'> = this.headerService.currentLocation$.pipe(
        combineLatestWith(this.store.select('account')),
        map(([currentLocation, account]) => {
            const path = currentLocation?.path;
            if (path === '/account') {
                return 'logout';
            } else {
                return account.currentUser ? 'none' : 'login';
            }
        }),
    );

    trackWidthSubscription = this.scrollMechanicsService.windowSizeSubject
        .pipe(combineLatestWith(this.action$), takeUntilDestroyed(), debounceTime(0))
        .subscribe(() => {
            this.getMainActionWidth();
        });

    private getMainActionWidth(): void {
        let width = 0;
        if (this.mainActionRef?.nativeElement) {
            width = this.mainActionRef.nativeElement.getBoundingClientRect().width;
        }
        this.widthChange.emit(width);
    }

    logout(): void {
        this.accountService.logout(false);
    }

    ngAfterViewInit(): void {
        this.getMainActionWidth();
    }
}
