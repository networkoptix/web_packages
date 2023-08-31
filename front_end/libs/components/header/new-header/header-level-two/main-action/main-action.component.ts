import { CommonModule } from '@angular/common';
import {
    AfterViewInit,
    Component,
    ElementRef,
    EventEmitter,
    Output,
    ViewChild,
} from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { BehaviorSubject } from 'rxjs';

import { NxAccountService } from '@services/account.service';
import { NxHeaderService } from '@services/nx-header.service';
import { NxScrollMechanicsService } from '@services/scroll-mechanics.service';
import { icons } from '@static-variables';

@UntilDestroy()
@Component({
    selector: 'nx-main-action',
    templateUrl: './main-action.component.html',
    styleUrls: ['./main-action.component.scss'],
    standalone: true,
    imports: [CommonModule, AngularSvgIconModule, TranslateModule],
})
export class NxMainActionComponent implements AfterViewInit {
    @Output() widthChange = new EventEmitter<number>();
    @ViewChild('mainAction') mainActionRef: ElementRef<HTMLElement>;

    action$ = new BehaviorSubject<'login' | 'logout' | 'none'>('none');
    icons = icons;

    constructor(
        public headerService: NxHeaderService,
        scrollMechanics: NxScrollMechanicsService,
        private accountService: NxAccountService,
    ) {
        scrollMechanics.windowSizeSubject.pipe(untilDestroyed(this)).subscribe(() => {
            this.getMainActionWidth();
        });

        this.headerService.currentLocation$
            .pipe(untilDestroyed(this))
            .subscribe(currentLocation => {
                const path = currentLocation?.path;
                if (path === '/account') {
                    this.action$.next('logout');
                } else {
                    this.action$.next('login');
                }
            });

        this.action$.pipe(untilDestroyed(this)).subscribe(() => {
            setTimeout(() => {
                this.getMainActionWidth();
            }, 0);
        });
    }

    getMainActionWidth(): void {
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
