import { Component }                    from '@angular/core';
import { ActivatedRoute, Router }       from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Observable }                   from 'rxjs';
import { map, tap }                     from 'rxjs/operators';

import { NxCloudApiService }        from '@services/nx-cloud-api';
import { ContentManifest }          from '@services/nx-cloud-api.types';
import { IConfig, NxConfigService } from '@services/nx-config';
import { ConsoleMenuNode }          from './menu/console-menu.component';
import { ConsoleSection }           from './table/console-table.component';

export enum ConsoleMode {
    DEFAULT='default',
    EDIT='edit',
    QUICK_EDIT='quick-edit'
}

@UntilDestroy()
@Component({
    selector    : 'nx-dev-console',
    templateUrl : 'console.component.html',
    styleUrls   : ['console.component.scss']
})
export class NxDevConsoleComponent {
    CONFIG: IConfig;
    modes: ConsoleMode[] = [ConsoleMode.EDIT];
    CONSOLE_MODE = ConsoleMode

    menu: ConsoleMenuNode[];
    base: string;
    sectionParam: ConsoleSection;
    selectedMode: ConsoleMode;
    manifest: ContentManifest;

    constructor(
        configService: NxConfigService,
        _route: ActivatedRoute,
        private router: Router,
        private cloudApi: NxCloudApiService
    ) {
        this.CONFIG = configService.config;
        _route.params.pipe(
            map(this.mapRoute),
            tap(({ sectionParam, mode, context }) => {
                (this.cloudApi.getSubAPI(sectionParam).getManifest() as Observable<ContentManifest>).pipe(
                    untilDestroyed(this)
                ).subscribe(manifest => {
                    this.manifest = manifest;
                    const editMode = mode as ConsoleMode === ConsoleMode.EDIT;
                    if (editMode) {
                        this.menu = this.manifest.manifest.contexts.map(({ name: url, label: title, icon }) => ({ url, title, icon }))
                    }
                });
            }),
            untilDestroyed(this)
        ).subscribe(({ sectionParam, mode, id }) => {
            const developers = '/developers';
            this.sectionParam = sectionParam;
            this.selectedMode = mode;
            this.base = mode ? `${developers}/${sectionParam}/${mode}/${id}` : developers;
        });
    }

    mapRoute = (params) => {
        const { section, mode, id, context } = params;
        const sections = Object.values(
            this.CONFIG.manifest
        ).sort(
            ({ sort: prev }, { sort: cur }) => prev - cur
        ).map(({ title, url, icon }) => ({ title, url, icon }));
        this.menu = mode === 'edit' ? [] : sections;
        const matchedSection =  sections.find(({ url }) => url === section);
        const sectionParam = (matchedSection || sections[0]).url as ConsoleSection;

        if (!matchedSection) {
            this.router.navigateByUrl(`${this.router.url.split(`/${section}`)[0]}/${sections[0]?.url}`, { replaceUrl: true });
        } else if (mode && !this.modes.includes(mode) || !id) {
            this.router.navigateByUrl(this.router.url.split(`/${mode}`)[0], { replaceUrl: true });
        }

        return { sectionParam, mode, id, context };
    }
}
