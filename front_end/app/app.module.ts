import { NgModule }                                                       from '@angular/core';
import { BrowserModule, Title }                                           from '@angular/platform-browser';
import { BrowserAnimationsModule }                                        from '@angular/platform-browser/animations';
import { Location, PathLocationStrategy, LocationStrategy, CommonModule } from '@angular/common';
import { RouterModule, UrlHandlingStrategy, UrlTree }                     from '@angular/router';
import { HttpClient, HttpClientModule, HttpClientXsrfModule }             from '@angular/common/http';
import { FormsModule }                                                    from '@angular/forms';

import { NgbToast, NgbModal }               from '@ng-bootstrap/ng-bootstrap';
import { OrderModule }                      from 'ngx-order-pipe';
import { DeviceDetectorModule }             from 'ngx-device-detector';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader }              from '@ngx-translate/http-loader';
import { CookieService }                    from 'ngx-cookie-service';
import { WebStorageModule }                 from 'ngx-store';

import {
    cloudApiServiceModule, systemModule, languageServiceModule,
    processServiceModule, uuid2ServiceModule,
    locationProxyModule,
} from './src/ajs-upgrade/ajs-upgraded-providers';

import { AppComponent }              from './app.component';
import { ComponentsModule }          from './src/components/components.module';
import { DialogsModule }             from './src/dialogs/dialogs.module';
import { PagesModule }               from './src/pages/pages.module';
import { DirectivesModule }          from './src/directives/directives.module';
import { NxConfigService }                  from './src/services/nx-config';
import { ServiceModule }                    from './src/services/services.module';
import { LayoutModule }                     from '@angular/cdk/layout';
// import { downgradeInjectable }       from '@angular/upgrade/static';
// import { NxLanguageProviderService } from './src/services/nx-language-provider';
// import { NxAppStateService }         from './src/services/nx-app-state.service';
import { WINDOWS_PROVIDERS }                from './src/services/window-provider';
import { CookieXSRFStrategy, XSRFStrategy } from '@angular/http';

// AoT requires an exported function for factories
export function createTranslateLoader(http: HttpClient) {
    return new TranslateHttpLoader(http, 'static/lang_', '/language_i18n.json');
}

class HybridUrlHandlingStrategy implements UrlHandlingStrategy {
    shouldProcessUrl(url: UrlTree) {
        return (url.toString().startsWith('/sandbox') ||
            url.toString().startsWith('/ipvd') ||
            url.toString().startsWith('/systems') ||
            url.toString().startsWith('/new-content') ||
            url.toString().startsWith('/right') ||
            url.toString().startsWith('/integrations')) &&
            !url.toString().endsWith('/view');
        // return false;

        /* Temporary downgraded components - routing is handled by AJS */
        // url.toString().startsWith('/') ||
        //
        // url.toString().startsWith('/systems/:systemId') ||
        // url.toString().startsWith('/register') ||
        // url.toString().startsWith('/login') ||
        // url.toString().startsWith('/download') ||
        // url.toString().startsWith('/downloads') ||
        // url.toString().startsWith('/push-notifications') ||
        // url.toString().startsWith('/browser');
    }

    extract(url: UrlTree) {
        return url;
    }

    merge(url: UrlTree, whole: UrlTree) {
        return url;
    }
}

@NgModule({
    imports        : [
        CommonModule,
        BrowserModule,
        BrowserAnimationsModule,
        FormsModule,
        LayoutModule,
        HttpClientModule,
        HttpClientXsrfModule.withOptions({
            cookieName: 'csrftoken',
            headerName: 'X-CSRFToken',
        }),
        WebStorageModule,
        OrderModule,
        cloudApiServiceModule,
        uuid2ServiceModule,
        languageServiceModule,
        processServiceModule,
        systemModule,
        locationProxyModule,
        ComponentsModule,
        DialogsModule,
        PagesModule,
        DirectivesModule,
        ServiceModule,

        TranslateModule.forRoot({
            loader: {
                provide   : TranslateLoader,
                useFactory: (createTranslateLoader),
                deps      : [ HttpClient ]
            }
        }),
        DeviceDetectorModule.forRoot(),
        // NgbModule.forRoot(),
        // ToastrModule.forRoot({
        //     timeOut          : 3 * 1000,
        //     positionClass    : 'toast-top-center',
        //     preventDuplicates: true,
        // }),
        RouterModule.forRoot([], {
            initialNavigation: true,
            scrollPositionRestoration: 'enabled',
            anchorScrolling          : 'enabled',
            enableTracing            : false
        })
    ],
    entryComponents: [
    ],
    providers      : [
        NgbToast,
        NgbModal,
        Location,
        Title,
        CookieService,
        NxConfigService,
        WINDOWS_PROVIDERS,
        { provide: LocationStrategy, useClass: PathLocationStrategy },
        { provide: UrlHandlingStrategy, useClass: HybridUrlHandlingStrategy },
        {
            provide : XSRFStrategy,
            useValue: new CookieXSRFStrategy('csrftoken', 'X-CSRFToken')
        }
    ],
    declarations   : [
        AppComponent
    ],
    bootstrap      : [ AppComponent ]
})

export class AppModule {
    ngDoBootstrap() {
    }
}
