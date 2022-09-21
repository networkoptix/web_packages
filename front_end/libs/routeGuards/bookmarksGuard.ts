import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';

import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';

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
