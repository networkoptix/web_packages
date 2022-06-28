import { OverlayModule } from '@angular/cdk/overlay';
import { CommonModule } from '@angular/common';
import { HttpClientModule, HttpClientXsrfModule } from '@angular/common/http';
import { APP_INITIALIZER, NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { TranslateCompiler, TranslateModule } from '@ngx-translate/core';
import { MESSAGE_FORMAT_CONFIG, TranslateMessageFormatCompiler } from 'ngx-translate-messageformat-compiler';
import { NgxWebstorageModule } from 'ngx-webstorage';

import { GenericDialogModule } from '@dialogs/generic/generic.module';
import { NxBootstrapProvider } from '@services/nx-bootstrap-provider';
import { NxUriCacheService } from '@services/uri-cache.service';
import { WINDOWS_PROVIDERS } from '@services/window-provider';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { NxAuthorizeModule } from './components/authorize.module';
import { NxOAuthRedirectModule } from './oauth-redirect/oauth-redirect.module';

// AoT requires an exported function for factories
export function NxBootstrapProviderFactory(provider: NxBootstrapProvider) {
    return () => provider.load();
}

@NgModule({
    declarations: [
        AppComponent,
    ],
    imports: [
        CommonModule,
        BrowserModule,
        BrowserAnimationsModule,
        AppRoutingModule,
        FormsModule,
        ReactiveFormsModule,
        HttpClientModule,
        HttpClientXsrfModule.withOptions({
            cookieName: 'csrftoken',
            headerName: 'X-CSRFToken'
        }),
        TranslateModule.forRoot({
            compiler: {
                provide: TranslateCompiler,
                useClass: TranslateMessageFormatCompiler
            }
        }),
        NgxWebstorageModule.forRoot(),
        OverlayModule,
        GenericDialogModule,
        NxOAuthRedirectModule,
        NxAuthorizeModule,
    ],
    providers: [
        NxUriCacheService,
        WINDOWS_PROVIDERS,
        NxBootstrapProvider,
        { provide: APP_INITIALIZER, useFactory: NxBootstrapProviderFactory, deps: [NxBootstrapProvider], multi: true },
        { provide: MESSAGE_FORMAT_CONFIG, useValue: { disablePluralKeyChecks: true } },

    ],
    bootstrap: [AppComponent]
})
export class AppModule { }
