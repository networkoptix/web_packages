import { CommonModule } from '@angular/common';
// import { DebugElement } from '@angular/core';
import {
    waitForAsync,
    ComponentFixture,
    TestBed,
    tick,
    fakeAsync,
    inject
} from '@angular/core/testing';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { MockDirective } from 'ng-mocks';
import { LocalStorageService } from 'ngx-webstorage';

import { nxConfig } from '@services/nx-config/config';
import { NxConfigService } from '@services/nx-config/nx-config.service';

import { NxCookieBannerComponent } from './cookie-banner.component';

// test skipped until feature is reimplemented
xdescribe('NxCookieBannerComponent', () => {
    let component: NxCookieBannerComponent;
    let fixture: ComponentFixture<NxCookieBannerComponent>;
    // let el: DebugElement;

    const configMock = { getConfig: () => nxConfig };
    let localStorageMockStore: Record<string, unknown> = {};
    const localStorageMock = {
        retrieve: (key: string) => !!localStorageMockStore[key],
        store: (key: string) => {
            localStorageMockStore[key] = true;
        }
    };
    // const accountMock = {
    //     currentUser$: of('')
    // };
    // TODO: Replace with mock store

    beforeEach(waitForAsync(() => {
        localStorageMockStore = {};
        TestBed.configureTestingModule({
            declarations: [
                NxCookieBannerComponent,
                MockDirective(RouterLink),
            ],
            imports: [
                CommonModule,
                TranslateModule.forRoot()
            ],
            providers: [
                { provide: NxConfigService, useValue: configMock },
                { provide: LocalStorageService, useValue: localStorageMock },
                // { provide: NxAccountService, useValue: accountMock }
            ]
        }).compileComponents()
            .then(() => {
                fixture = TestBed.createComponent(NxCookieBannerComponent);
                component = fixture.componentInstance;
                // el = fixture.debugElement;

                fixture.detectChanges();
            });
    }));

    it('should create NxCookieBannerComponent', () => {
        expect(component).toBeTruthy();
    });

    it('should be initialized', () => {
        component.ngOnInit();
        expect(component.cookieBannerReviewed).toEqual(false);
    });

    it('should set cookieBannerReviewed to true on button click', fakeAsync(() => {
        spyOn(component, 'onCookieBannerClose').and.callThrough();
        const button = fixture.debugElement.nativeElement.querySelector('svg-icon');
        button.click();

        tick();
        fixture.detectChanges();
        const banner = fixture.debugElement.nativeElement.querySelector('.banner');

        expect(component.onCookieBannerClose).toHaveBeenCalled();
        expect(component.cookieBannerReviewed).toEqual(true);
        expect(banner).toBeFalsy();
    }));

    it('should contain the cookie disclaimer in a p tag', () => {
        const mainText = fixture.debugElement.nativeElement.querySelector('p').textContent;
        expect(mainText).toContain('We used cookies to improve your experience on our site. They also help us to understand how our site is being used. Find out more and set your cookies preferences here. By continuing to use our site you consent to use our cookies.');
    });

    it('should not show the banner if cookiereviewed is true in localStorage', inject(
        [LocalStorageService],
        (service: LocalStorageService) => {
            service.retrieve = (key: string) => !!localStorageMockStore[key];
            service.store = (key: string, value: boolean) => {
                localStorageMockStore[key] = value;
            };
            service.store('cookiereviewed', true);
            component.ngOnInit();
            fixture.detectChanges();
            expect(fixture.debugElement.nativeElement.querySelector('.banner')).toBeFalsy();
        }
    ));

    it('should set cookiereivewed in localStorage to true on button click', fakeAsync(inject(
        [LocalStorageService],
        (service: LocalStorageService) => {
            service.retrieve = (key: string) => !!localStorageMockStore[key];
            service.store = (key: string, value: boolean) => {
                localStorageMockStore[key] = value;
            };
            spyOn(component, 'onCookieBannerClose').and.callThrough();
            const button = fixture.debugElement.nativeElement.querySelector('svg-icon');
            button.click();
            tick();

            expect(service.retrieve('cookiereviewed')).toEqual(true);
        }
    )));
}
);
