import { NgModule }                                                       from '@angular/core';
import { BrowserModule, Title }                                           from '@angular/platform-browser';
import { BrowserAnimationsModule }                                        from '@angular/platform-browser/animations';
import { Location, PathLocationStrategy, LocationStrategy, CommonModule } from '@angular/common';
import { RouterModule, UrlHandlingStrategy, UrlTree }                     from '@angular/router';
import { HttpClient, HttpClientModule, HttpClientXsrfModule }             from '@angular/common/http';
import { FormsModule }                                                    from '@angular/forms';

import { InputTrimModule }                  from 'ng2-trim-directive';
import { NgbToast, NgbModal }               from '@ng-bootstrap/ng-bootstrap';
import { OrderModule }                      from 'ngx-order-pipe';
import { DeviceDetectorModule }             from 'ngx-device-detector';
import { TranslateModule }                  from '@ngx-translate/core';
import { CookieService }                    from 'ngx-cookie-service';
import { WebStorageModule }                 from 'ngx-store';
import { AngularFireModule, FirebaseOptionsToken } from '@angular/fire';
import { AngularFireMessagingModule } from '@angular/fire/messaging';

import { AppComponent }      from './app.component';
import { ComponentsModule }  from './src/components/components.module';
import { DialogsModule }     from './src/dialogs/dialogs.module';
import { PagesModule }       from './src/pages/pages.module';
import { DirectivesModule }  from './src/directives/directives.module';
import { PipesModule }       from './src/pipes/pipes.module';
import { NxConfigService }   from './src/services/nx-config/nx-config.service';
import { ServiceModule }     from './src/services/services.module';
import { LayoutModule }      from '@angular/cdk/layout';
import { WINDOWS_PROVIDERS } from './src/services/window-provider';
import { initializeApp }     from './src/pages/push-notifications/push-notifications.module';
import { AuthGuard }         from './src/routeGuards/authGuard';
import { HMGuard }           from './src/routeGuards/hmGuard';
import { UserGuard }         from './src/routeGuards/userGuard';


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
        InputTrimModule,
        ComponentsModule,
        DialogsModule,
        PagesModule,
        DirectivesModule,
        PipesModule,
        ServiceModule,
        AngularFireModule,
        AngularFireMessagingModule,
        TranslateModule.forRoot(),
        DeviceDetectorModule.forRoot(),
        RouterModule.forRoot([], {
            initialNavigation        : true,
            scrollPositionRestoration: 'enabled',
            anchorScrolling          : 'enabled',
            enableTracing            : false
        })
    ],
    entryComponents: [],
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
            provide   : FirebaseOptionsToken,
            deps      : [NxConfigService],
            useFactory: initializeApp
        },
        AuthGuard,
        HMGuard,
        UserGuard,
    ],
    declarations   : [
        AppComponent,
    ],
    exports        : [
    ],
    bootstrap      : [AppComponent]
})

export class AppModule {
    ngDoBootstrap() {
    }
}
