import { AfterViewInit, Component, ElementRef, EventEmitter, Output, ViewChild } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { BehaviorSubject } from 'rxjs';

import { NxAccountService } from '@services/account.service';
import { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxHeaderService } from '@services/nx-header.service';
import { NxScrollMechanicsService } from '@services/scroll-mechanics.service';

@UntilDestroy()
@Component({
    selector: 'nx-main-action',
    templateUrl: './main-action.component.html',
    styleUrls: ['./main-action.component.scss']
})
export class NxMainActionComponent implements AfterViewInit {
    CONFIG: IConfig;

  @Output() widthChange = new EventEmitter<number>();
  @ViewChild('mainAction') mainActionRef: ElementRef<HTMLElement>;

  action$ = new BehaviorSubject<'login' | 'logout' | 'none'>('none');

  constructor(public headerService: NxHeaderService, scrollMechanics: NxScrollMechanicsService, configService: NxConfigService, private accountService: NxAccountService) {
      this.CONFIG = configService.getConfig();
      scrollMechanics.windowSizeSubject.pipe(untilDestroyed(this)).subscribe(() => {
          this.getMainActionWidth();
      });

      this.headerService.currentLocation$.pipe(untilDestroyed(this)).subscribe(currentLocation => {
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
