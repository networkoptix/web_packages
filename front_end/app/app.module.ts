import { APP_INITIALIZER, NgModule }           from '@angular/core';
import { BrowserModule, Title }                from '@angular/platform-browser';
import { BrowserAnimationsModule }             from '@angular/platform-browser/animations';
import {
    Location, PathLocationStrategy,
    HashLocationStrategy, LocationStrategy,
    CommonModule, DatePipe
}                                              from '@angular/common';
import {
    HttpClientModule, HttpClientXsrfModule,
    HTTP_INTERCEPTORS
}                                              from '@angular/common/http';
import { FormsModule, ReactiveFormsModule }    from '@angular/forms';
import { AngularFireModule, FIREBASE_OPTIONS } from '@angular/fire';
import { AngularFireMessagingModule }          from '@angular/fire/messaging';
import { LayoutModule }                        from '@angular/cdk/layout';
import { InputTrimModule }                     from 'ng2-trim-directive';
import { NgbToast, NgbModal }                  from '@ng-bootstrap/ng-bootstrap';
import { OrderModule }                         from 'ngx-order-pipe';
import { DeviceDetectorModule }                from 'ngx-device-detector';
import { TranslateCompiler, TranslateModule }  from '@ngx-translate/core';
import { NgxMaskModule, IConfig }              from 'ngx-mask';
import {
    TranslateMessageFormatCompiler,
    MESSAGE_FORMAT_CONFIG
}                                              from 'ngx-translate-messageformat-compiler';
import { CookieService }                       from 'ngx-cookie-service';
import { NgxWebstorageModule }                 from 'ngx-webstorage';
import { environment }                         from '@environments/environment';
import { AppComponent }                        from './app.component';
import { ComponentsModule }                    from '@components/components.module';
import { DialogsModule }                       from '@dialogs/dialogs.module';
import { DirectivesModule }                    from '@directives/directives.module';
import { PipesModule }                         from '@src/pipes/pipes.module';
import { initializeApp }                       from '@pages/push-notifications/push-notifications.module';
import {
    AuthGuard, SystemGuard, DevelopersGuard
}                                              from './src/routeGuards';
import { NxConfigService }                     from '@services/nx-config';
import { ServiceModule }                       from '@services/services.module';
import { WINDOWS_PROVIDERS }                   from '@services/window-provider';
import { MenuModule }                          from '@src/menu';
import { NxBootstrapProvider }                 from '@services/nx-bootstrap-provider';
import { WebadminPageModule }                  from '@pages/webadmin-page.module';
import { PagesModule }                         from '@pages/pages.module';
import { NxUriCacheService }                   from '@services/uri-cache.service';
import { NxUriCachingInterceptor }             from '@src/interceptors/uri-cache-interceptor.service';
import { LocalSystemStatusInterceptor }        from '@src/interceptors/local-system-status-interceptor.service';
import { CloudUnavailableInterceptor } from '@src/interceptors/cloud-unavailable-interceptor';
import { NxSwCacheInterceptor }                from '@src/interceptors/sw-cache-interceptor.interceptor';
import { ServiceWorkerModule } from '@angular/service-worker';

// AoT requires an exported function for factories
export function NxBootstrapProviderFactory(provider: NxBootstrapProvider) {
    return () => provider.load();
}

export const options: Partial<IConfig> | (() => Partial<IConfig>) = null;

@NgModule({
    imports: [
        CommonModule,
        BrowserModule,
        BrowserAnimationsModule,
        FormsModule,
        ReactiveFormsModule,
        LayoutModule,
        HttpClientModule,
        HttpClientXsrfModule.withOptions({
            cookieName : 'csrftoken',
            headerName : 'X-CSRFToken'
        }),
        OrderModule,
        InputTrimModule,
        ComponentsModule,
        MenuModule,
        DialogsModule,
        DirectivesModule,
        PipesModule,
        ServiceModule,
        AngularFireModule,
        AngularFireMessagingModule,
        TranslateModule.forRoot({
            compiler: {
                provide  : TranslateCompiler,
                useClass : TranslateMessageFormatCompiler
            }
        }),
        DeviceDetectorModule.forRoot(),
        NgxMaskModule.forRoot(options),
        NgxWebstorageModule.forRoot(),
        // Need to find a different way to choose page module for webadmin
        environment.isLocal ? WebadminPageModule : PagesModule,
        ServiceWorkerModule.register('ngsw-worker.js', { enabled: environment.production && !environment.isLocal, registrationStrategy: 'registerImmediately' })
    ],
    providers: [
        NgbToast,
        NgbModal,
        Location,
        Title,
        CookieService,
        NxUriCacheService,
        {
            provide: HTTP_INTERCEPTORS,
            useClass: NxSwCacheInterceptor,
            multi : true
        },
        {
            provide : HTTP_INTERCEPTORS,
            useClass : NxUriCachingInterceptor,
            multi    : true
        },
        {
            provide  : HTTP_INTERCEPTORS,
            useClass : CloudUnavailableInterceptor,
            multi    : true
        },
        {
            provide  : HTTP_INTERCEPTORS,
            useClass : LocalSystemStatusInterceptor,
            multi    : true
        },
        NxConfigService,
        WINDOWS_PROVIDERS,
        { provide: LocationStrategy, useClass: environment.isLocal ? HashLocationStrategy : PathLocationStrategy },
        {
            provide    : FIREBASE_OPTIONS,
            deps       : [NxConfigService],
            useFactory : initializeApp
        },
        AuthGuard,
        DevelopersGuard,
        SystemGuard,
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
