import { DOCUMENT } from '@angular/common';
import { Component, ElementRef, Inject, Input, OnChanges, ViewChild } from '@angular/core';
import { WINDOW }   from '@services/window-provider';
import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { IConfig, NxConfigService } from '@services/nx-config';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxScrollMechanicsService } from '@services/scroll-mechanics.service';
import { Observable, Subscription } from 'rxjs';
import { debounceTime, filter, startWith } from 'rxjs/operators';

@UntilDestroy({})
@Component({
    selector    : 'nx-intro-text',
    templateUrl : './intro-text.component.html',
    styleUrls   : ['./intro-text.component.scss']
})
export class NxIntroTextComponent implements OnChanges {
  @Input() isLoggedIn = false;
  @Input() scrollPosition = 0;
  // createAccountButton Ref not used yet, used to change the color of the header later
  @ViewChild('createAccountButton') createAccountRef: ElementRef<HTMLElement>;
  @ViewChild('rootFixed') rootFixedRef: ElementRef;
  @ViewChild('rootAbsolute') rootAbsoluteRef: ElementRef;
  realTimeScroll$: Observable<number>;
  elementObserver$: Subscription;
  cloudShowing: 'fixed' | 'absolute' = 'fixed';

  CONFIG: IConfig
  LANG: LanguageI18NStaticTypes;

  constructor(languageService :NxLanguageProviderService, configService: NxConfigService,
      scrollMechanics: NxScrollMechanicsService, @Inject(DOCUMENT) private document: Document, @Inject(WINDOW) private window: Window) {
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

  getElementPosition(elm: HTMLElement) {
      const rect = elm.getBoundingClientRect();
      const scrollLeft = this.window.pageXOffset || this.document.documentElement.scrollLeft;
      const scrollTop = this.window.pageYOffset || this.document.documentElement.scrollTop;
      return { top: rect.top + scrollTop, left: rect.left + scrollLeft };
  }

  ngOnChanges() {
      // There are two copies of the intro-text component in the html, this determines which one will be showing
      // This is neccessary to seamlessly transition between fixed and absolute positioning
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
