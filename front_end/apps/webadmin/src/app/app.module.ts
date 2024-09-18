import { DialogModule } from '@angular/cdk/dialog';
import { CdkScrollableModule } from '@angular/cdk/scrolling';
import { CommonModule, HashLocationStrategy, Location, LocationStrategy } from '@angular/common';
import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { APP_INITIALIZER, NgModule } from '@angular/core';
import { BrowserModule, Title } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterModule } from '@angular/router';
import { StoreModule } from '@ngrx/store';
import { StoreDevtoolsModule } from '@ngrx/store-devtools';
import { TranslateCompiler, TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { CookieService } from 'ngx-cookie-service';
import { NgxMaskModule } from 'ngx-mask';
import { NgxTranslateCutModule } from 'ngx-translate-cut';
import {
    MESSAGE_FORMAT_CONFIG,
    TranslateMessageFormatCompiler,
} from 'ngx-translate-messageformat-compiler';
import { TourMatMenuModule } from 'ngx-ui-tour-md-menu';
import { NgxWebstorageModule } from 'ngx-webstorage';

import { cdProviders } from '@common/bootstrap';
import { accountReducer } from '@common/store/account';
import { NxApplyComponent } from '@components/apply/apply.component';
import { NxNavFooterComponent } from '@components/nav-footer/nav-footer.component';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { PopoverModule } from '@components/popover/popover.module';
import { NxTourStepComponent } from '@components/tour-step/tour-step.component';
import { NxScrollHelperDirective } from '@directives/nx-scroll-helper';
import { NxResizeObserver } from '@directives/resize/nx-resize.directive';
import { environment } from '@environments/environment';
import { CloudSessionTruncatedInterceptor } from '@interceptors/cloud-session-truncated-interceptor';
import { CloudUnavailableInterceptor } from '@interceptors/cloud-unavailable-interceptor';
import { FeatureInterceptor } from '@interceptors/feature-interceptor';
import { LocalSystemStatusInterceptor } from '@interceptors/local-system-status-interceptor.service';
import { ServerErrorInterceptor } from '@interceptors/server-error.interceptor';
import { SessionExpiredInterceptor } from '@interceptors/session-expired-interceptor';
import { UnauthorizedUserInterceptor } from '@interceptors/unauthorized-user-interceptor';
import { NxUriCachingInterceptor } from '@interceptors/uri-cache-interceptor.service';
import { NxBootstrapProvider } from '@services/nx-bootstrap-provider';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { ServiceModule } from '@services/services.module';
import { NxSessionTruncatedBannerService } from '@services/session-truncated-banner.service';
import { NxUriCacheService } from '@services/uri-cache.service';
import { WINDOWS_PROVIDERS } from '@services/window-provider';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

// AoT requires an exported function for factories
export function NxBootstrapProviderFactory(provider: NxBootstrapProvider) {
    return () => provider.load();
}

@NgModule({
    declarations: [AppComponent],
    exports: [],
    bootstrap: [AppComponent],
    imports: [
        BrowserModule,
        BrowserAnimationsModule.withConfig({
            // Disable animations if not supported (on iPhone 6 / Safari 13)
            disableAnimations:
                !('animate' in document.documentElement) ||
                (navigator && /iPhone OS (8|9|10|11|12|13)_/.test(navigator.userAgent)),
        }),
        StoreModule.forRoot({ account: accountReducer }),
        ...(!environment.production
            ? [StoreDevtoolsModule.instrument({ connectInZone: true })]
            : []),
        PopoverModule,
        RouterModule,
        ServiceModule,
        AngularSvgIconModule.forRoot(),
        TranslateModule.forRoot({
            compiler: {
                provide: TranslateCompiler,
                useClass: TranslateMessageFormatCompiler,
            },
        }),
        NgxTranslateCutModule.forRoot(),
        NgxWebstorageModule.forRoot(),
        AppRoutingModule,
        DialogModule,
        CdkScrollableModule,
        // HoverPreloadModule,
        NxPreLoaderComponent,
        NxNavFooterComponent,
        NxTourStepComponent,
        TourMatMenuModule.forRoot(),
        NgxMaskModule.forRoot(),
        NxResizeObserver,
        NxScrollHelperDirective,
    ],
    providers: [
        ...cdProviders,
        NxApplyComponent,
        Location,
        Title,
        CookieService,
        NxUriCacheService,
        {
            provide: HTTP_INTERCEPTORS,
            useClass: NxUriCachingInterceptor,
            multi: true,
        },
        {
            provide: HTTP_INTERCEPTORS,
            useClass: CloudUnavailableInterceptor,
            multi: true,
        },
        {
            provide: HTTP_INTERCEPTORS,
            useClass: LocalSystemStatusInterceptor,
            multi: true,
        },
        {
            provide: HTTP_INTERCEPTORS,
            useClass: FeatureInterceptor,
            multi: true,
        },
        {
            provide: HTTP_INTERCEPTORS,
            useClass: SessionExpiredInterceptor,
            multi: true,
        },
        {
            provide: HTTP_INTERCEPTORS,
            useClass: CloudSessionTruncatedInterceptor,
            multi: true,
        },
        {
            provide: HTTP_INTERCEPTORS,
            useClass: UnauthorizedUserInterceptor,
            multi: true,
        },
        {
            provide: HTTP_INTERCEPTORS,
            useClass: ServerErrorInterceptor,
            multi: true,
        },
        NxConfigService,
        WINDOWS_PROVIDERS,
        { provide: LocationStrategy, useClass: HashLocationStrategy },
        CommonModule,
        {
            provide: APP_INITIALIZER,
            useFactory: NxBootstrapProviderFactory,
            deps: [NxBootstrapProvider],
            multi: true,
        },
        { provide: MESSAGE_FORMAT_CONFIG, useValue: { disablePluralKeyChecks: true } },
        provideHttpClient(withInterceptorsFromDi()),
    ],
})
export class AppModule {
    // Do not remove, IDE will show that these services aren't used, but we just need them to be instantiated here.
    constructor(nxSessionTruncatedBannerService: NxSessionTruncatedBannerService) {}
}
