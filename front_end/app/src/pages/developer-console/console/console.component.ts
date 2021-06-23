import { Component }                    from '@angular/core';
import { ActivatedRoute, Router }       from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { map }                          from 'rxjs/operators';

import { ConsoleMenuNode, mockMenuContent } from './menu/console-menu.component';

@UntilDestroy()
@Component({
    selector    : 'nx-dev-console',
    templateUrl : 'console.component.html',
    styleUrls   : ['console.component.scss']
})
export class NxDevConsoleComponent {
    menu: ConsoleMenuNode[]
    sectionParam = ''

    constructor(_route: ActivatedRoute, private router: Router) {
        this.menu = mockMenuContent;
        _route.params.pipe(map(this.mapRoute), untilDestroyed(this)).subscribe(param => {
            this.sectionParam = param;
        });
    }

    mapRoute = (params) => {
        const sectionUrl = params.section;
        const matchedRoute = this.menu.find(({ url }) => url === sectionUrl);
        if (!matchedRoute) {
            this.router.navigateByUrl(this.router.url.replace(sectionUrl, this.menu[0].url));
        }
        return (matchedRoute || this.menu[0]).url;
    }
}
