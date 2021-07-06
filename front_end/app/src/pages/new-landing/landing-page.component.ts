import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { NxAccountService } from '@services/account.service';
import { NxScrollMechanicsService } from '@services/scroll-mechanics.service';
import { NxSessionService } from '@services/session.service';
import { Observable } from 'rxjs';
import { debounceTime, startWith } from 'rxjs/operators';
import { NxContentContainerComponent } from './content-container/content-container';

@UntilDestroy({})
@Component({
    selector    : 'nx-landing-page',
    templateUrl : './landing-page.component.html',
    styleUrls   : ['./landing-page.component.scss']
})
export class NxLandingPageComponent implements OnInit {
    // Will get data from somewhere
    // @Input() data = ''
    @ViewChild(NxContentContainerComponent) contentComponent: NxContentContainerComponent;
    loginState: boolean | null = null;
    scrollPosition: number
    screenSize$: Observable<{ width: number, height: number }>
    introAnimationFinished = false;
    maskFinishedLoading = false;
    // Not used yet, but will be used to trigger start of intro animation
    backgroundGraphicFinishedLoading = false;

    scrollBreakPoints = {
        maskMaxSize    : 815,
        renderGraphics : 1000
    }

    constructor(private sessionService: NxSessionService, private accountService: NxAccountService, scrollMechanics: NxScrollMechanicsService) {
        this.screenSize$ = scrollMechanics.windowSizeSubject.pipe(startWith({ width: 0, height: 0 }), debounceTime(60), untilDestroyed(this));
        scrollMechanics.windowScrollSubject.pipe(debounceTime(10), untilDestroyed(this)).subscribe((value) => {
            if (value > this.scrollBreakPoints.renderGraphics) {
                this.scrollPosition = this.scrollBreakPoints.renderGraphics;
            } else {
                this.scrollPosition = value;
            }
        });
    }

    ngOnInit(): void {
        this.sessionService.loginStateSubject
            .pipe(untilDestroyed(this)).subscribe(() => {
                this.accountService
                    .get()
                    .then(account => {
                        if (account) {
                            this.loginState = true;
                        } else {
                            this.loginState = false;
                        }
                    }).catch(() => {
                        this.loginState = false;
                    });
            });
    }
}
