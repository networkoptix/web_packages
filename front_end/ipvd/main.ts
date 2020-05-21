import { enableProdMode }         from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { IpvdPageModule } from './ipvd.module';
import { environment }    from './environments/environment';

if (environment.production) {
    enableProdMode();
}

platformBrowserDynamic().bootstrapModule(IpvdPageModule)
    .catch(err => console.error(err));
