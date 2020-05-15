import { NgModule }                                                       from '@angular/core';
import { BrowserModule, Title }                                           from '@angular/platform-browser';
import { BrowserAnimationsModule }                                        from '@angular/platform-browser/animations';
import { Location, PathLocationStrategy, LocationStrategy, CommonModule } from '@angular/common';
import { RouterModule, UrlHandlingStrategy, UrlTree }                     from '@angular/router';
import { HttpClientModule, HttpClientXsrfModule }                         from '@angular/common/http';
import { FormsModule }                                                    from '@angular/forms';
import { AngularFireModule, FirebaseOptionsToken }                        from '@angular/fire';
import { AngularFireMessagingModule }                                     from '@angular/fire/messaging';
import { LayoutModule }                                                   from '@angular/cdk/layout';

import { InputTrimModule }                  from 'ng2-trim-directive';
import { NgbToast, NgbModal }               from '@ng-bootstrap/ng-bootstrap';
import { OrderModule }                      from 'ngx-order-pipe';
import { DeviceDetectorModule }               from 'ngx-device-detector';
import { TranslateCompiler, TranslateModule } from '@ngx-translate/core';
import { TranslateMessageFormatCompiler }     from 'ngx-translate-messageformat-compiler';
import { CookieService }                    from 'ngx-cookie-service';
import { WebStorageModule }                 from 'ngx-store';

import { AppComponent }           from './app.component';
import { ComponentsModule }       from './src/components/components.module';
import { DialogsModule }          from './src/dialogs/dialogs.module';
import { PagesModule }            from './src/pages/pages.module';
import { DirectivesModule }       from './src/directives/directives.module';
import { PipesModule }            from './src/pipes/pipes.module';
import { MenuModule }             from './src/menu';
import {
    NxConfigService,
    ServiceModule,
    WINDOWS_PROVIDERS
}                                 from './src/services';
import { initializeApp }          from './src/pages/push-notifications/push-notifications.module';
import { AuthGuard, SystemGuard } from './src/routeGuards';

// AoT requires an exported function for factories

class HybridUrlHandlingStrategy implements UrlHandlingStrategy {
    shouldProcessUrl(url: UrlTree) {
        return !url.toString().match('\/(systems|embed)\/[A-Za-z0-9\-:]+\/view\/?(?:[A-Za-z0-9\-:]+)?');
    }

    extract(url: UrlTree) {
        return url;
    }

    merge(url: UrlTree, whole: UrlTree) {
        return url;
    }
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
        PagesModule,
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
            initialNavigation         : true,
            scrollPositionRestoration : 'enabled',
            anchorScrolling           : 'enabled',
            enableTracing             : false
        })
    ],
    entryComponents : [],
    providers       : [
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
            provide    : FirebaseOptionsToken,
            deps       : [NxConfigService],
            useFactory : initializeApp
        },
        AuthGuard,
        SystemGuard
    ],
    declarations   : [
        AppComponent
    ],
    exports        : [
    ],
    bootstrap      : [AppComponent]
})

export class AppModule {
    ngDoBootstrap() {
    }
}
