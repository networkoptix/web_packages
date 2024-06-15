import { DialogModule } from '@angular/cdk/dialog';
import { FullscreenOverlayContainer, OverlayContainer } from '@angular/cdk/overlay';
import { CdkScrollableModule } from '@angular/cdk/scrolling';
import { Location, PathLocationStrategy, CommonModule, LocationStrategy } from '@angular/common';
import {
    HTTP_INTERCEPTORS,
    provideHttpClient,
    withInterceptorsFromDi,
    withXsrfConfiguration,
} from '@angular/common/http';
import { APP_INITIALIZER, NgModule } from '@angular/core';
import { AngularFireModule, FIREBASE_OPTIONS } from '@angular/fire/compat';
import { AngularFireMessagingModule } from '@angular/fire/compat/messaging';
// import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserModule, Title } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterModule } from '@angular/router';
import { ServiceWorkerModule } from '@angular/service-worker';
import { EffectsModule } from '@ngrx/effects';
import { StoreModule } from '@ngrx/store';
import { StoreDevtoolsModule } from '@ngrx/store-devtools';
import { TranslateCompiler, TranslateModule } from '@ngx-translate/core';
import { TINYMCE_SCRIPT_SRC } from '@tinymce/tinymce-angular';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { CookieService } from 'ngx-cookie-service';
// import { HoverPreloadModule } from 'ngx-hover-preload';
import { NgxMaskModule } from 'ngx-mask';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import { NgxTranslateCutModule } from 'ngx-translate-cut';
import {
    TranslateMessageFormatCompiler,
    MESSAGE_FORMAT_CONFIG,
} from 'ngx-translate-messageformat-compiler';
import { TourMatMenuModule } from 'ngx-ui-tour-md-menu';
import { NgxWebstorageModule } from 'ngx-webstorage';

import { cdProviders } from '@common/bootstrap';
import { accountReducer, AccountSync } from '@common/store/account';
import { SystemResourcesSync } from '@common/store/system-resources/system-resources.sync';
import { SystemsSync } from '@common/store/systems/systems.sync';
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
import { NxCurrentRelayInterceptor } from '@interceptors/current-relay-interceptor';
import { FeatureInterceptor } from '@interceptors/feature-interceptor';
import { LocalSystemStatusInterceptor } from '@interceptors/local-system-status-interceptor.service';
import { RedirectAuthenticationInterceptor } from '@interceptors/redirect-authentication-interceptor';
import { ServerErrorInterceptor } from '@interceptors/server-error.interceptor';
import { SessionExpiredInterceptor } from '@interceptors/session-expired-interceptor';
import { NxSwCacheInterceptor } from '@interceptors/sw-cache-interceptor.interceptor';
import { TosInterceptor } from '@interceptors/tos-interceptor';
import { NxUriCachingInterceptor } from '@interceptors/uri-cache-interceptor.service';
import { initializeApp } from '@pages/push-notifications/push-notifications.module';
import { NxBootstrapProvider } from '@services/nx-bootstrap-provider';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { ServiceModule } from '@services/services.module';
import { NxSwPromptUpdateService } from '@services/sw-prompt-update.service';
import { TosService } from '@services/tos.service';
import { NxUriCacheService } from '@services/uri-cache.service';
import { WINDOWS_PROVIDERS } from '@services/window-provider';
import { ChannelPartnersEffects } from '@store/channel-partners/channel-partners.effects';
import { channelPartnersReducer } from '@store/channel-partners/channel-partners.reducer';
import { SystemResourcesReducer } from '@store/system-resources';
import { SystemResourcesEffects } from '@store/system-resources/system-resources.effects';

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
        StoreModule.forRoot({
            account: accountReducer,
        }),
        StoreModule.forFeature('channelPartners', channelPartnersReducer),
        StoreModule.forFeature('systemResources', SystemResourcesReducer.reducer),
        EffectsModule.forRoot([
            AccountSync,
            ChannelPartnersEffects,
            SystemsSync,
            SystemResourcesSync,
            SystemResourcesEffects,
        ]),
        ...(!environment.production
            ? [StoreDevtoolsModule.instrument({ connectInZone: true })]
            : []),
        PopoverModule,
        RouterModule,
        ServiceModule,
        AngularFireModule,
        AngularFireMessagingModule,
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
        ServiceWorkerModule.register('ngsw-worker.js', {
            enabled: environment.production,
            registrationStrategy: 'registerImmediately',
        }),
        DialogModule,
        CdkScrollableModule,
        // HoverPreloadModule,
        NxPreLoaderComponent,
        NxNavFooterComponent,
        NxTourStepComponent,
        NgxMaskModule.forRoot(),
        TourMatMenuModule.forRoot(),
        NxResizeObserver,
        NxScrollHelperDirective,
        NgxSkeletonLoaderModule.forRoot({
            appearance: 'line',
            count: 1,
            animation: 'progress',
            theme: {
                extendsFromRoot: true,
                background: 'var(--skeleton-background)',
                borderRadius: 'var(--skeleton-border-radius)',
                marginBottom: 'var(--skeleton-margin-bottom)',
            },
        }),
    ],
    providers: [
        ...cdProviders,
        Location,
        Title,
        CookieService,
        NxUriCacheService,
        NxApplyComponent,
        TosService,
        {
            provide: HTTP_INTERCEPTORS,
            useClass: NxSwCacheInterceptor,
            multi: true,
        },
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
            useClass: NxCurrentRelayInterceptor,
            multi: true,
        },
        {
            provide: HTTP_INTERCEPTORS,
            useClass: RedirectAuthenticationInterceptor,
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
            useClass: TosInterceptor,
            multi: true,
        },
        {
            provide: HTTP_INTERCEPTORS,
            useClass: ServerErrorInterceptor,
            multi: true,
        },
        NxConfigService,
        WINDOWS_PROVIDERS,
        { provide: LocationStrategy, useClass: PathLocationStrategy },
        {
            provide: FIREBASE_OPTIONS,
            deps: [NxConfigService],
            useFactory: initializeApp,
        },
        CommonModule,
        NxSwPromptUpdateService,
        {
            provide: APP_INITIALIZER,
            useFactory: NxBootstrapProviderFactory,
            deps: [NxBootstrapProvider],
            multi: true,
        },
        { provide: MESSAGE_FORMAT_CONFIG, useValue: { disablePluralKeyChecks: true } },
        { provide: TINYMCE_SCRIPT_SRC, useValue: 'static/tinymce/tinymce.min.js' },
        { provide: OverlayContainer, useClass: FullscreenOverlayContainer },
        provideHttpClient(
            withInterceptorsFromDi(),
            withXsrfConfiguration({
                cookieName: 'csrftoken',
                headerName: 'X-CSRFToken',
            }),
        ),
    ],
})
export class AppModule {
    constructor(
        // Do not remove, IDE will show that these services aren't used, but we just need them to be instantiated here.
        nxSwPromptUpdateService: NxSwPromptUpdateService,
    ) {}
}
