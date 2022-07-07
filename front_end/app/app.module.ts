import { DragDropModule } from '@angular/cdk/drag-drop';
import { LayoutModule } from '@angular/cdk/layout';
import { CdkScrollableModule } from '@angular/cdk/scrolling';
import {
    Location,
    PathLocationStrategy,
    HashLocationStrategy,
    LocationStrategy,
    CommonModule,
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
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserModule, Title } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ServiceWorkerModule } from '@angular/service-worker';
import { StoreModule } from '@ngrx/store';
import { TranslateCompiler, TranslateModule } from '@ngx-translate/core';
import { NgxChartsModule } from '@swimlane/ngx-charts';
import { CookieService } from 'ngx-cookie-service';
import { NgxMaskModule, IConfig } from 'ngx-mask';
import { NgxTranslateCutModule } from 'ngx-translate-cut';
import {
    TranslateMessageFormatCompiler,
    MESSAGE_FORMAT_CONFIG
} from 'ngx-translate-messageformat-compiler';
import { NgxWebstorageModule } from 'ngx-webstorage';

import { ComponentsModule } from '@components/components.module';
import { PopoverModule } from '@components/popover/popover.module';
import { DialogsModule } from '@dialogs/dialogs.module';
import { DirectivesModule } from '@directives/directives.module';
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
import { MenuModule } from '@src/menu/menu.module';
import { PipesModule } from '@src/pipes/pipes.module';
import { systemsReducer } from '@src/store/systems/systems.reducer';

import { AppComponent } from './app.component';

// AoT requires an exported function for factories
export function NxBootstrapProviderFactory(provider: NxBootstrapProvider) {
    return () => provider.load();
}

export const options: Partial<IConfig> | (() => Partial<IConfig>) = null;

@NgModule({
    imports: [
        CommonModule,
        BrowserModule,

        StoreModule.forRoot({ systems: systemsReducer }),

        BrowserAnimationsModule,
        FormsModule,
        ReactiveFormsModule,
        LayoutModule,
        DragDropModule,
        HttpClientModule,
        HttpClientXsrfModule.withOptions({
            cookieName: 'csrftoken',
            headerName: 'X-CSRFToken'
        }),
        NgxChartsModule,
        ComponentsModule,
        MenuModule,
        PopoverModule,
        DialogsModule,
        DirectivesModule,
        PipesModule,
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
        NgxMaskModule.forRoot(options),
        NgxWebstorageModule.forRoot(),
        // Need to find a different way to choose page module for webadmin
        environment.isLocal ? WebadminPageModule : PagesModule,
        ServiceWorkerModule.register('ngsw-worker.js', {
            enabled: environment.production && !environment.isLocal,
            registrationStrategy: 'registerImmediately'
        }),
        CdkScrollableModule,
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
