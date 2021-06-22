import { Component, Input, OnInit } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { NxAccountService } from '@services/account.service';
import { NxScrollMechanicsService } from '@services/scroll-mechanics.service';
import { NxSessionService } from '@services/session.service';
import { debounceTime } from 'rxjs/operators';

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
    screenSize: {width: number, height: number}

    constructor(private sessionService: NxSessionService, private accountService: NxAccountService, scrollMechanics: NxScrollMechanicsService) {
        scrollMechanics.windowSizeSubject.pipe(debounceTime(80), untilDestroyed(this)).subscribe((size) => {
            this.screenSize = size;
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
