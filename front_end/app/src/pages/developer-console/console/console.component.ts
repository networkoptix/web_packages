import { Component }                    from '@angular/core';
import { ActivatedRoute, Router }       from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { map }                          from 'rxjs/operators';

import { ConsoleMenuNode } from './menu/console-menu.component';

export enum ConsoleMode {
    DEFAULT='default',
    EDIT='edit',
    QUICK_EDIT='quick-edit'
}

const mockSection: ConsoleMenuNode[] = [
    {
        title : 'Some Section',
        url   : 'some-section-url',
        icon  : 'menu.svg'
    },
    {
        title : 'Another Section',
        url   : 'another-section-url',
        icon  : 'lock.svg'
    },
    {
        title : 'Custom VMS Clients',
        url   : 'custom-clients',
        icon  : 'servers.svg'
    },
    {
        title : 'Last Section',
        url   : 'last-section-url',
        icon  : 'users.svg'
    }
];

const mockEdit: ConsoleMenuNode[] = [
    {
        title : 'Context One',
        url   : 'context-one'
    },
    {
        title : 'Context Two',
        url   : 'context-two'
    },
    {
        title : 'Context Three',
        url   : 'context-three'
    },
    {
        title : 'Context Four',
        url   : 'context-four'
    }
];

const mockMenuContent: { [key: string]: ConsoleMenuNode[] } = {
    [ConsoleMode.DEFAULT] : mockSection,
    [ConsoleMode.EDIT]    : mockEdit
};

@UntilDestroy()
@Component({
    selector    : 'nx-dev-console',
    templateUrl : 'console.component.html',
    styleUrls   : ['console.component.scss']
})
export class NxDevConsoleComponent {
    modes: ConsoleMode[] = [ConsoleMode.EDIT];
    CONSOLE_MODE = ConsoleMode

    menu: ConsoleMenuNode[];
    base: string;
    sectionParam: string;
    selectedMode: ConsoleMode

    constructor(_route: ActivatedRoute, private router: Router) {
        _route.params.pipe(map(this.mapRoute), untilDestroyed(this)).subscribe(({ sectionParam, mode, id }) => {
            const developers = '/developers';
            this.sectionParam = sectionParam;
            this.selectedMode = mode;
            this.base = mode ? `${developers}/${sectionParam}/${mode}/${id}` : developers;
        });
    }

    mapRoute = (params) => {
        const { section, mode, id, context } = params;
        const sections = mockMenuContent[ConsoleMode.DEFAULT];
        this.menu = mockMenuContent[mode] || sections;
        const matchedSection =  sections.find(({ url }) => url === section);
        const sectionParam = (matchedSection || sections[0]).url;

        if (!matchedSection) {
            this.router.navigateByUrl(`${this.router.url.split(`/${section}`)[0]}/${sections[0]?.url}`, { replaceUrl: true });
        } else if (mode && !this.modes.includes(mode) || !id) {
            this.router.navigateByUrl(this.router.url.split(`/${mode}`)[0], { replaceUrl: true });
        } else if (mode && !context || !this.menu.find(({ url }) => url === context)) {
            this.router.navigateByUrl(`${this.router.url.split(`/${context}`)[0]}/${this.menu[0]?.url}`,  { replaceUrl: true });
        }

        return { sectionParam, mode, id, context };
    }
}
