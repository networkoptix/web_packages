import { Component, Input, OnInit } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { NxAccountService } from '@services/account.service';
import { NxScrollMechanicsService } from '@services/scroll-mechanics.service';
import { NxSessionService } from '@services/session.service';
import { BehaviorSubject, Observable } from 'rxjs';
import { debounceTime, startWith } from 'rxjs/operators';

@UntilDestroy({})
@Component({
    selector    : 'nx-landing-page',
    templateUrl : './landing-page.component.html',
    styleUrls   : ['./landing-page.component.scss']
})
export class NxLandingPageComponent implements OnInit {
    // Will get data from somewhere
    // @Input() data = ''
    loginState: boolean;
    scrollPosition: number
    screenSize$: Observable<{ width: number, height: number }>

    constructor(private sessionService: NxSessionService, private accountService: NxAccountService, scrollMechanics: NxScrollMechanicsService) {
        this.screenSize$ = scrollMechanics.windowSizeSubject.pipe(startWith({ width: 0, height: 0 }), debounceTime(60), untilDestroyed(this));
        scrollMechanics.windowScrollSubject.pipe(debounceTime(25), untilDestroyed(this)).subscribe((value) => {
            this.scrollPosition = value;
        });
    }

    ngOnInit(): void {
        this.sessionService.loginStateSubject.pipe(untilDestroyed(this))
            .subscribe(() => {
                this.accountService
                    .get()
                    .then(account => {
                        if (account) {
                            this.loginState = true;
                        }
                    });
            });
    }
}
