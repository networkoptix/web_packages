import { HttpClientModule, HttpClientXsrfModule } from '@angular/common/http';
import { APP_INITIALIZER, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
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

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { WizardModule } from './components/wizard.module';
import { WizardStateService } from './services/wizard-state.service';

// AoT requires an exported function for factories
export function NxBootstrapProviderFactory(provider: NxBootstrapProvider) {
    return () => provider.load();
}

@NgModule({
    declarations: [AppComponent],
    imports: [
        BrowserModule,
        BrowserAnimationsModule.withConfig({
            // Disable animations if not supported (on iPhone 6 / Safari 13)
            disableAnimations:
                !('animate' in document.documentElement) ||
                (navigator && /iPhone OS (8|9|10|11|12|13)_/.test(navigator.userAgent)),
        }),
        StoreModule.forRoot({}),
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
        WizardModule,
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
        WizardStateService,
    ],
    bootstrap: [AppComponent],
})
export class AppModule {}
