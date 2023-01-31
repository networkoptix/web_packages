import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { environment } from '@common/environments/environment';
import { DynamicConfig } from '@services/nx-config/dynamic-config';

import { AppModule } from './app/app.module';

if (environment.production) {
    enableProdMode();
}

DynamicConfig.dynamicConfigFactory().then(useValue => {
    platformBrowserDynamic([
        { provide: DynamicConfig, useValue }
    ]).bootstrapModule(AppModule)
        .catch(err => console.error(err));
});
