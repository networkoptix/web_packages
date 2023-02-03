import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { DynamicConfig } from '@services/nx-config/dynamic-config';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

if (environment.production) {
    enableProdMode();
}

DynamicConfig.dynamicConfigFactory().then(useValue => {
    platformBrowserDynamic([
        { provide: DynamicConfig, useValue }
    ]).bootstrapModule(AppModule)
        .catch(err => console.error(err));
});
