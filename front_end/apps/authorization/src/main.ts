import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { environment } from '@common/environments/environment';
import { DynamicConfig } from '@services/nx-config/dynamic-config';

import { AppModule } from './app/app.module';

interface Bootstrapable {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    bootstrap(): Promise<any>;
}

if (environment.production) {
    enableProdMode();
}

function bootstrap(): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bootstrapProviders = (...providers: Bootstrapable[]): Promise<any> => Promise.allSettled(providers.map(provider => provider.bootstrap())).then(providerResults => providerResults.map(res => res.status === 'fulfilled' && res.value).filter(val => !!val));

    bootstrapProviders(
        DynamicConfig
    ).then(providers => platformBrowserDynamic(providers).bootstrapModule(AppModule)
        .catch(err => console.error(err))
    );
}

if (document.readyState === 'complete') {
    bootstrap();
} else {
    document.addEventListener('DOMContentLoaded', bootstrap);
}
