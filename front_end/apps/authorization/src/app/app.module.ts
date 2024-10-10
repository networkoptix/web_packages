// import { isPlatformBrowser } from '@angular/common';
import { HttpClientModule, HttpClientXsrfModule } from '@angular/common/http';
import { APP_INITIALIZER, NgModule /* , Inject, APP_ID, PLATFORM_ID */ } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { StoreModule } from '@ngrx/store';
import { TranslateCompiler, TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { NgxIndexedDBModule } from 'ngx-indexed-db';
import {
    MESSAGE_FORMAT_CONFIG,
    TranslateMessageFormatCompiler,
} from 'ngx-translate-messageformat-compiler';
import { NgxWebstorageModule } from 'ngx-webstorage';

import { dbConfig } from '@services/index_db_config';
import { NxBootstrapProvider } from '@services/nx-bootstrap-provider';
import { NxUriCacheService } from '@services/uri-cache.service';
import { WINDOWS_PROVIDERS } from '@services/window-provider';
import { accountReducer } from '@store/account';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

// AoT requires an exported function for factories
export function NxBootstrapProviderFactory(provider: NxBootstrapProvider) {
    return () => provider.load();
}

@NgModule({
    declarations: [AppComponent],
    imports: [
        BrowserModule.withServerTransition({ appId: 'authorization' }),
        StoreModule.forRoot({ account: accountReducer }),
        AppRoutingModule,
        HttpClientModule,
        HttpClientXsrfModule.withOptions({
            cookieName: 'csrftoken',
            headerName: 'X-CSRFToken',
        }),
        TranslateModule.forRoot({
            compiler: {
                provide: TranslateCompiler,
                useClass: TranslateMessageFormatCompiler,
            },
        }),
        AngularSvgIconModule.forRoot(),
        NgxWebstorageModule.forRoot(),
        NgxIndexedDBModule.forRoot(dbConfig),
    ],
    providers: [
        NxUriCacheService,
        WINDOWS_PROVIDERS,
        {
            provide: APP_INITIALIZER,
            useFactory: NxBootstrapProviderFactory,
            deps: [NxBootstrapProvider],
            multi: true,
        },
        { provide: MESSAGE_FORMAT_CONFIG, useValue: { disablePluralKeyChecks: true } },
    ],
    bootstrap: [AppComponent],
})
export class AppModule {
    // constructor(
    //     @Inject(PLATFORM_ID) platformId: object,
    //     @Inject(APP_ID) appId: string
    // ) {
    //     const platform = isPlatformBrowser(platformId)
    //         ? 'in the browser'
    //         : 'on the server';
    //     console.log(`Running ${platform} with appId=${appId}`);
    // }
}
