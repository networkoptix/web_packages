import { Injectable } from '@angular/core';
import { NxConfigService }    from './nx-config';
import { Title, Meta }              from '@angular/platform-browser';

@Injectable({
    providedIn: 'root'
})
export class NxPageService {
    CONFIG: any;

    constructor(private config: NxConfigService,
                private title: Title,
                private meta: Meta) {

        this.CONFIG = this.config.getConfig();
    }

    setPageTitle(value: string) {
        const title = (this.CONFIG.cloudName) ? value + ' ' + this.CONFIG.cloudName : value;
        this.title.setTitle(title);
    }

    setDefaultLayout() {
        this.meta.updateTag({name: 'viewport', content: this.CONFIG.meta.viewport.default});
    }

    setDesktopLayout() {
        this.meta.updateTag({name: 'viewport', content: this.CONFIG.meta.viewport.desktopLayout});
    }
}
