import { APP_INITIALIZER, NgModule } from '@angular/core';
import { BrowserModule, Title }      from '@angular/platform-browser';
import { BrowserAnimationsModule }                                        from '@angular/platform-browser/animations';
import {
    Location, PathLocationStrategy, HashLocationStrategy, LocationStrategy, CommonModule
}                                                                         from '@angular/common';
import { RouterModule, UrlHandlingStrategy, UrlTree }                     from '@angular/router';
import { HttpClientModule, HttpClientXsrfModule, HTTP_INTERCEPTORS }                         from '@angular/common/http';
import { FormsModule }                                                    from '@angular/forms';
import { AngularFireModule, FirebaseOptionsToken }                        from '@angular/fire';
import { AngularFireMessagingModule }                                     from '@angular/fire/messaging';
import { LayoutModule }                                                   from '@angular/cdk/layout';
import { environment } from './environments/environment';

import { InputTrimModule }                    from 'ng2-trim-directive';
import { NgbToast, NgbModal }                 from '@ng-bootstrap/ng-bootstrap';
import { OrderModule }                        from 'ngx-order-pipe';
import { DeviceDetectorModule }               from 'ngx-device-detector';
import { TranslateCompiler, TranslateModule } from '@ngx-translate/core';
import { TranslateMessageFormatCompiler }     from 'ngx-translate-messageformat-compiler';
import { CookieService }                      from 'ngx-cookie-service';
import { WebStorageModule }                   from 'ngx-store';
import { AppComponent }                       from './app.component';
import { ComponentsModule }                   from './src/components/components.module';
import { DialogsModule }                      from './src/dialogs/dialogs.module';
import { DirectivesModule }                   from './src/directives/directives.module';
import { PipesModule }                        from './src/pipes/pipes.module';
import { initializeApp }                      from './src/pages/push-notifications/push-notifications.module';
import { AuthGuard, SystemGuard }             from './src/routeGuards';
import { NxConfigService }                    from './src/services/nx-config';
import { ServiceModule }                      from './src/services/services.module';
import { WINDOWS_PROVIDERS }                  from './src/services/window-provider';
import { MenuModule }                         from './src/menu';
import { NxBootstrapProvider }                from './src/services/nx-bootstrap-provider';
import { WebadminPageModule }                 from './src/pages/webadmin-page.module';
import { PagesModule}                         from './src/pages/pages.module';
import { NxUriCacheService }                  from './src/services/uri-cache.service';
import { NxUriCachingInterceptor }            from './src/services/uri-cache-interceptor.service';
import { NgxMaskModule, IConfig }             from 'ngx-mask';

// AoT requires an exported function for factories
export function NxBootstrapProviderFactory(provider: NxBootstrapProvider) {
    return () => provider.load();
}

@NgModule({
    imports: [
        CommonModule,
        BrowserModule,
        BrowserAnimationsModule,
        FormsModule,
        LayoutModule,
        HttpClientModule,
        HttpClientXsrfModule.withOptions({
            cookieName : 'csrftoken',
            headerName : 'X-CSRFToken'
        }),
        WebStorageModule,
        OrderModule,
        InputTrimModule,
        ComponentsModule,
        MenuModule,
        DialogsModule,
        // @ts-ignore
        environment.isLocal ? WebadminPageModule : PagesModule,
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
        RouterModule.forRoot([], {
            initialNavigation        : true,
            scrollPositionRestoration: 'enabled',
            anchorScrolling          : 'enabled',
            enableTracing            : false
        }),
        NgxMaskModule.forRoot(options)
    ],
    entryComponents : [],
    providers       : [
        NgbToast,
        NgbModal,
        Location,
        Title,
        CookieService,
        NxUriCacheService,
        {
            provide : HTTP_INTERCEPTORS,
            useClass : NxUriCachingInterceptor,
            multi : true
        },
        NxConfigService,
        WINDOWS_PROVIDERS,
        { provide: LocationStrategy, useClass: environment.isLocal ? HashLocationStrategy : PathLocationStrategy },
        {
            provide    : FirebaseOptionsToken,
            deps       : [NxConfigService],
            useFactory : initializeApp
        },
        AuthGuard,
        SystemGuard,
        DatePipe,
        NxBootstrapProvider,
        { provide: APP_INITIALIZER, useFactory: NxBootstrapProviderFactory, deps: [NxBootstrapProvider], multi: true }
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
