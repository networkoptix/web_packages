import { DialogModule } from '@angular/cdk/dialog';
import { CdkScrollableModule } from '@angular/cdk/scrolling';
import {
    Location,
    HashLocationStrategy,
    DatePipe,
    LocationStrategy
} from '@angular/common';
import {
    HttpClientModule,
    HttpClientXsrfModule,
    HTTP_INTERCEPTORS
} from '@angular/common/http';
import { APP_INITIALIZER, NgModule } from '@angular/core';
import { AngularFireModule, FIREBASE_OPTIONS } from '@angular/fire/compat';
import { AngularFireMessagingModule } from '@angular/fire/compat/messaging';
import { BrowserModule, Title } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterModule } from '@angular/router';
import { StoreModule } from '@ngrx/store';
import { StoreDevtoolsModule } from '@ngrx/store-devtools';
import { TranslateCompiler, TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { CookieService } from 'ngx-cookie-service';
// import { HoverPreloadModule } from 'ngx-hover-preload';
import { NgxMaskModule } from 'ngx-mask';
import { NgxTranslateCutModule } from 'ngx-translate-cut';
import {
    TranslateMessageFormatCompiler,
    MESSAGE_FORMAT_CONFIG
} from 'ngx-translate-messageformat-compiler';
import { TourMatMenuModule } from 'ngx-ui-tour-md-menu';
import { NgxWebstorageModule } from 'ngx-webstorage';

import { accountReducer } from '@common/store/account';
import { ApplyModule } from '@components/apply/apply.module';
import { NavFooterModule } from '@components/nav-footer/nav-footer.module';
import { PreLoaderModule } from '@components/placeholders/pre-loader/pre-loader.module';
import { PopoverModule } from '@components/popover/popover.module';
import { TourStepModule } from '@components/tour-step/tour-step.module';
// import { DirectivesModule } from '@directives/directives.module';
import { ResizeModule } from '@directives/resize/resize.module';
import { environment } from '@environments/environment';
import { AuthGuard } from '@guards/authGuard';
import { DevelopersGuard } from '@guards/developersGuard';
import { ManualAccessGuard } from '@guards/manualAccessGuard';
import { SystemGuard } from '@guards/systemGuard';
import { CloudUnavailableInterceptor } from '@interceptors/cloud-unavailable-interceptor';
import { FeatureInterceptor } from '@interceptors/feature-interceptor';
import { LocalSystemStatusInterceptor } from '@interceptors/local-system-status-interceptor.service';
import { NxUriCachingInterceptor } from '@interceptors/uri-cache-interceptor.service';
import { initializeApp } from '@pages/push-notifications/push-notifications.module';
import { NxBootstrapProvider } from '@services/nx-bootstrap-provider';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { ServiceModule } from '@services/services.module';
import { NxUriCacheService } from '@services/uri-cache.service';
import { WINDOWS_PROVIDERS } from '@services/window-provider';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

// AoT requires an exported function for factories
export function NxBootstrapProviderFactory(provider: NxBootstrapProvider) {
    return () => provider.load();
}

@NgModule({
    imports: [
        BrowserModule,
        BrowserAnimationsModule.withConfig({
            // Disable animations if not supported (on iPhone 6 / Safari 13)
            disableAnimations:
        !('animate' in document.documentElement) ||
        (navigator && /iPhone OS (8|9|10|11|12|13)_/.test(navigator.userAgent)),
        }),
        StoreModule.forRoot({ account: accountReducer }),
        ...(!environment.production ? [StoreDevtoolsModule.instrument()] : []),
        HttpClientModule,
        HttpClientXsrfModule.withOptions({
            cookieName: 'csrftoken',
            headerName: 'X-CSRFToken'
        }),
        PopoverModule,
        RouterModule,
        ServiceModule,
        AngularFireModule,
        AngularFireMessagingModule,
        AngularSvgIconModule.forRoot(),
        TranslateModule.forRoot({
            compiler: {
                provide: TranslateCompiler,
                useClass: TranslateMessageFormatCompiler
            }
        }),
        NgxTranslateCutModule.forRoot(),
        NgxWebstorageModule.forRoot(),
        AppRoutingModule,
        DialogModule,
        CdkScrollableModule,
        // HoverPreloadModule,
        PreLoaderModule,
        NavFooterModule,
        ResizeModule,
        TourStepModule,
        TourMatMenuModule.forRoot(),
        NgxMaskModule.forRoot()
    ],
    providers: [
        ApplyModule,
        Location,
        Title,
        CookieService,
        NxUriCacheService,
        {
            provide: HTTP_INTERCEPTORS,
            useClass: NxUriCachingInterceptor,
            multi: true
        },
        {
            provide: HTTP_INTERCEPTORS,
            useClass: CloudUnavailableInterceptor,
            multi: true
        },
        {
            provide: HTTP_INTERCEPTORS,
            useClass: LocalSystemStatusInterceptor,
            multi: true
        },
        {
            provide: HTTP_INTERCEPTORS,
            useClass: FeatureInterceptor,
            multi: true
        },
        NxConfigService,
        WINDOWS_PROVIDERS,
        { provide: LocationStrategy, useClass: HashLocationStrategy },
        {
            provide: FIREBASE_OPTIONS,
            deps: [NxConfigService],
            useFactory: initializeApp
        },
        AuthGuard,
        DevelopersGuard,
        SystemGuard,
        ManualAccessGuard,
        DatePipe,
        NxBootstrapProvider,
        { provide: APP_INITIALIZER, useFactory: NxBootstrapProviderFactory, deps: [NxBootstrapProvider], multi: true },
        { provide: MESSAGE_FORMAT_CONFIG, useValue: { disablePluralKeyChecks: true } }
    ],
    declarations: [
        AppComponent
    ],
    exports: [
    ],
    bootstrap: [AppComponent]
})

export class AppModule {
}
