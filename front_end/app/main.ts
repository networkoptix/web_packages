// import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
// import { UpgradeModule } from '@angular/upgrade/static';
// import { AppModule } from './app.module';
// import { setUpLocationSync } from '@angular/router/upgrade';
// import { enableProdMode } from '@angular/core';
//
// if (PRODUCTION) {
//     enableProdMode();
// }
//
//
// platformBrowserDynamic().bootstrapModule(AppModule).then(platformRef => {
//     const upgrade = platformRef.injector.get(UpgradeModule) as UpgradeModule;
//     upgrade.bootstrap(document.documentElement, ['cloudApp']);
//
//     setUpLocationSync(upgrade);
// });

import { enableProdMode }         from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule }   from './app.module';
import { environment } from './environments/environment';

if (environment.production) {
    enableProdMode();
}

platformBrowserDynamic().bootstrapModule(AppModule)
    .catch(err => console.error(err));
