// import { isPlatformBrowser } from '@angular/common';
import {
    provideHttpClient,
    withInterceptorsFromDi,
    withXsrfConfiguration,
} from '@angular/common/http';
import { APP_INITIALIZER, NgModule /* , Inject, APP_ID, PLATFORM_ID */ } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { StoreModule } from '@ngrx/store';
import { TranslateCompiler, TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import {
    MESSAGE_FORMAT_CONFIG,
    TranslateMessageFormatCompiler,
} from 'ngx-translate-messageformat-compiler';
import { NgxWebstorageModule } from 'ngx-webstorage';

import { cdProviders } from '@common/bootstrap';
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
    bootstrap: [AppComponent],
    imports: [
        BrowserModule.withServerTransition({ appId: 'authorization' }),
        StoreModule.forRoot({ account: accountReducer }),
        AppRoutingModule,
        TranslateModule.forRoot({
            compiler: {
                provide: TranslateCompiler,
                useClass: TranslateMessageFormatCompiler,
            },
        }),
        AngularSvgIconModule.forRoot(),
        NgxWebstorageModule.forRoot(),
    ],
    providers: [
        ...cdProviders,
        NxUriCacheService,
        WINDOWS_PROVIDERS,
        {
            provide: APP_INITIALIZER,
            useFactory: NxBootstrapProviderFactory,
            deps: [NxBootstrapProvider],
            multi: true,
        },
        { provide: MESSAGE_FORMAT_CONFIG, useValue: { disablePluralKeyChecks: true } },
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
