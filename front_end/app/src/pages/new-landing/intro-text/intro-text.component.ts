import { DOCUMENT } from '@angular/common';
import { AfterViewChecked, Component, ElementRef, Inject, Input, OnDestroy, ViewChild } from '@angular/core';
import { WINDOW }   from '@services/window-provider';
import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { IConfig, NxConfigService } from '@services/nx-config';
import { Platform } from '@angular/cdk/platform';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxScrollMechanicsService } from '@services/scroll-mechanics.service';
import { Observable, Subscription } from 'rxjs';
import { debounceTime, filter, startWith } from 'rxjs/operators';
import { NxHeaderService } from '@services/nx-header.service';
import { NxAccountService } from '@services/account.service';
import { IntersectionStatus } from '@directives/nx-intersection.directive';
@UntilDestroy()
@Component({
    selector    : 'nx-intro-text',
    templateUrl : './intro-text.component.html',
    styleUrls   : ['./intro-text.component.scss']
})
export class NxIntroTextComponent implements AfterViewChecked, OnDestroy {
  // createAccountButton Ref not used yet, used to change the color of the header later
  @ViewChild('createButton') createButtonRef: ElementRef<HTMLElement>;
  @ViewChild('rootFixed') rootFixedRef: ElementRef;
  @ViewChild('rootAbsolute') rootAbsoluteRef: ElementRef;
  realTimeScroll$: Observable<number>;
  elementObserver$: Subscription;
  cloudShowing: 'fixed' | 'absolute' = 'fixed';
  isLoggedIn: null | boolean = null;

  CONFIG: IConfig
  LANG: LanguageI18NStaticTypes;

  constructor(languageService :NxLanguageProviderService, configService: NxConfigService,
      scrollMechanics: NxScrollMechanicsService,
      public headerService: NxHeaderService,
      public platform: Platform,
      @Inject(DOCUMENT) private document: Document,
      @Inject(WINDOW) private window: Window) {
      this.CONFIG = configService.getConfig();
      this.LANG = languageService.translations;
      // real-time scroll calculation for less jittery transition of the element from position:fixed to position:absolute
      this.realTimeScroll$ = scrollMechanics.windowScrollSubject.pipe(startWith(0), untilDestroyed(this));
  }

  checkVisible(elm: HTMLElement) {
      const headerHeight = 48;
      var rect = elm.getBoundingClientRect();
      var viewHeight = Math.max(this.document.documentElement.clientHeight, this.window.innerHeight);
      return !(rect.bottom - headerHeight < 0 || rect.top - viewHeight >= 0);
  }

  logItem(info: any) {
      console.log(info);
  }

  changeHeaderButton = (visbility: IntersectionStatus) => {
      if (visbility === 'Visible') {
          if (this.headerService.createAccountButtonType === 'primary') {
              this.headerService.createAccountButtonType = 'default';
          }
      }
      if (visbility === 'NotVisible') {
          if (this.headerService.createAccountButtonType === 'default') {
              this.headerService.createAccountButtonType = 'primary';
          }
      }
  }

  getElementPosition(elm: HTMLElement) {
      const rect = elm.getBoundingClientRect();
      const scrollLeft = this.window.pageXOffset || this.document.documentElement.scrollLeft;
      const scrollTop = this.window.pageYOffset || this.document.documentElement.scrollTop;
      return { top: rect.top + scrollTop, left: rect.left + scrollLeft };
  }

  ngOnDestroy() {
      if (this.headerService.createAccountButtonType === 'default') {
          this.headerService.createAccountButtonType = 'primary';
      }
  }

  ngAfterViewChecked() {
      // There are two hidden components in the html which determine if the intro-text component is using position:absolute or position:fixed
      if (!this.elementObserver$ && this.rootFixedRef && this.rootAbsoluteRef) {
          this.elementObserver$ = this.realTimeScroll$.pipe(untilDestroyed(this), filter(value => value < 1000)).subscribe(
              () => {
                  if (this.getElementPosition(this.rootAbsoluteRef.nativeElement).top > this.getElementPosition(this.rootFixedRef.nativeElement).top) {
                      if (this.cloudShowing !== 'fixed') {
                          this.cloudShowing = 'fixed';
                      }
                  } else {
                      if (this.cloudShowing !== 'absolute') {
                          this.cloudShowing = 'absolute';
                      }
                  }
              }
          );
      }
  }
}
