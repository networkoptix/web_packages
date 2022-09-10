import { CdkScrollableModule } from '@angular/cdk/scrolling';
import {
    Location,
    PathLocationStrategy,
    HashLocationStrategy,
    LocationStrategy,
    // CommonModule,
    DatePipe
} from '@angular/common';
import {
    HttpClientModule,
    HttpClientXsrfModule,
    HTTP_INTERCEPTORS
} from '@angular/common/http';
import { APP_INITIALIZER, NgModule } from '@angular/core';
import { AngularFireModule, FIREBASE_OPTIONS } from '@angular/fire/compat';
import { AngularFireMessagingModule } from '@angular/fire/compat/messaging';
// import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserModule, Title } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterModule } from '@angular/router';
import { ServiceWorkerModule } from '@angular/service-worker';
import { StoreModule } from '@ngrx/store';
import { StoreDevtoolsModule } from '@ngrx/store-devtools';
import { TranslateCompiler, TranslateModule } from '@ngx-translate/core';
import { CookieService } from 'ngx-cookie-service';
import { HoverPreloadModule } from 'ngx-hover-preload';
import { NgxMaskModule } from 'ngx-mask';
import { NgxTranslateCutModule } from 'ngx-translate-cut';
import {
    TranslateMessageFormatCompiler,
    MESSAGE_FORMAT_CONFIG
} from 'ngx-translate-messageformat-compiler';
import { NgxWebstorageModule } from 'ngx-webstorage';

import { NavFooterModule } from '@components/nav-footer/nav-footer.module';
import { PreLoaderModule } from '@components/placeholders/pre-loader/pre-loader.module';
import { PopoverModule } from '@components/popover/popover.module';
// import { DirectivesModule } from '@directives/directives.module';
import { ResizeModule } from '@directives/resize/resize.module';
import { environment } from '@environments/environment';
import { AuthGuard } from '@guards/authGuard';
import { BookmarksGuard } from '@guards/bookmarksGuard';
import { DevelopersGuard } from '@guards/developersGuard';
import { ManualAccessGuard } from '@guards/manualAccessGuard';
import { SystemGuard } from '@guards/systemGuard';
import { CloudUnavailableInterceptor } from '@interceptors/cloud-unavailable-interceptor';
import { FeatureInterceptor } from '@interceptors/feature-interceptor';
import { LocalSystemStatusInterceptor } from '@interceptors/local-system-status-interceptor.service';
import { NxSwCacheInterceptor } from '@interceptors/sw-cache-interceptor.interceptor';
import { NxUriCachingInterceptor } from '@interceptors/uri-cache-interceptor.service';
import { PagesModule } from '@pages/pages.module';
import { initializeApp } from '@pages/push-notifications/push-notifications.module';
import { WebadminPageModule } from '@pages/webadmin-page.module';
import { NxBootstrapProvider } from '@services/nx-bootstrap-provider';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { ServiceModule } from '@services/services.module';
import { NxUriCacheService } from '@services/uri-cache.service';
import { WINDOWS_PROVIDERS } from '@services/window-provider';
// import { PipesModule } from '@app/pipes/pipes.module';
import { systemsReducer } from '@app/store/systems/systems.reducer';

import { AppComponent } from './app.component';

// AoT requires an exported function for factories
export function NxBootstrapProviderFactory(provider: NxBootstrapProvider) {
    return () => provider.load();
}

@NgModule({
    imports: [
        BrowserModule,
        BrowserAnimationsModule,
        StoreModule.forRoot({ systems: systemsReducer }),
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
        TranslateModule.forRoot({
            compiler: {
                provide: TranslateCompiler,
                useClass: TranslateMessageFormatCompiler
            }
        }),
        NgxTranslateCutModule.forRoot(),
        NgxWebstorageModule.forRoot(),
        // Need to find a different way to choose page module for webadmin
        environment.isLocal ? WebadminPageModule : PagesModule,
        ServiceWorkerModule.register('ngsw-worker.js', {
            enabled: environment.production && !environment.isLocal,
            registrationStrategy: 'registerImmediately'
        }),
        CdkScrollableModule,
        HoverPreloadModule,
        PreLoaderModule,
        NavFooterModule,
        ResizeModule,
        NgxMaskModule.forRoot()
    ],
    providers: [
        Location,
        Title,
        CookieService,
        NxUriCacheService,
        {
            provide: HTTP_INTERCEPTORS,
            useClass: NxSwCacheInterceptor,
            multi: true
        },
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
        { provide: LocationStrategy, useClass: environment.isLocal ? HashLocationStrategy : PathLocationStrategy },
        {
            provide: FIREBASE_OPTIONS,
            deps: [NxConfigService],
            useFactory: initializeApp
        },
        AuthGuard,
        DevelopersGuard,
        SystemGuard,
        ManualAccessGuard,
        BookmarksGuard,
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
