import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';

import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';

import { redirect } from '../variables/static-variables';

@Injectable()
export class BookmarksGuard implements CanActivate {
    CONFIG: IConfig;

    constructor(public configService: NxConfigService, private router: Router) {
        this.CONFIG = configService.getConfig();
    }

    canActivate(): boolean {
        if (this.configService.flagsEnabled('bookmarks')) {
            return true;
        } else {
            this.router.navigate([redirect.page404]);
            return false;
        }
    }
}
