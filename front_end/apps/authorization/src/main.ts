import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { bootstrapConfig, bootstrapProviders } from '@common/bootstrap';
import { environment } from '@common/environments/environment';
import { DynamicConfig } from '@services/nx-config/dynamic-config';

import { AppModule } from './app/app.module';

if (environment.production) {
    enableProdMode();
}

function bootstrap(): void {
    bootstrapProviders(DynamicConfig).then(providers =>
        platformBrowserDynamic(providers)
            .bootstrapModule(AppModule, bootstrapConfig)
            .catch(err => console.error(err)),
    );
}

if (document.readyState === 'complete') {
    bootstrap();
} else {
    document.addEventListener('DOMContentLoaded', bootstrap);
}
