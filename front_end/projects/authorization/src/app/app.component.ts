import { Component } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { debounceTime, filter } from 'rxjs/operators';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
})
export class AppComponent {
    title = 'authorization';
    viewType = 'web';

    constructor(router: Router) {
        router.events
            .pipe(filter(ev => ev instanceof NavigationEnd), debounceTime(50))
            .subscribe(({ url }: NavigationEnd) => {
                this.viewType = url.includes('?') && new URLSearchParams(
                    url.match(/.*(\?.*)/i)[1]
                ).get('view_type') || 'web';
            });
    }
}
