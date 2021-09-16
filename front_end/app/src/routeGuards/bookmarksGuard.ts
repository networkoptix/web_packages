import { CanActivate, Router } from '@angular/router';
import { Injectable }          from '@angular/core';

import { NxConfigService, IConfig } from '../services/nx-config';

@Injectable()
export class BookmarksGuard implements CanActivate {
    CONFIG: IConfig;

    constructor(
        public configService: NxConfigService,
        private router: Router
    ) {
        this.CONFIG = configService.getConfig();
    }

    canActivate(): boolean {
        if (this.configService.flagsEnabled('bookmarks')) {
            return true;
        } else {
            this.router.navigate([this.CONFIG.redirect.page404]);
            return false;
        }
    }
}
