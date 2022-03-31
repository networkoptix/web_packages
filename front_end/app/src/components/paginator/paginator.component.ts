import { Component, Input } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { BehaviorSubject } from 'rxjs';

import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NgChanges } from '@utils/ng-changes';

@UntilDestroy()
@Component({
    selector: 'nx-paginator',
    templateUrl: 'paginator.component.html',
    styleUrls: ['paginator.component.scss']
})
export class NxPaginatorComponent {
    @Input() numPages: number;
    @Input() pagesToShow: number;
    @Input() tempDisabled = false;
    @Input() showPrevNext = false;

    CONFIG: IConfig;
    showExperimental: boolean = false;
    page$ = new BehaviorSubject(1);
    pages$ = new BehaviorSubject([]);
    numPages$ = new BehaviorSubject(0);

    constructor(
        configService: NxConfigService,
        private route: ActivatedRoute
    ) {
        this.CONFIG = configService.config;

        this.route.queryParams
            .pipe(untilDestroyed(this))
            .subscribe(params => {
                this.page$.next(parseInt(params.page) || 1);
            });

        this.page$
            .pipe(untilDestroyed(this))
            .subscribe(page => {
                if (!this.pagesToShow || !this.numPages) {
                    return;
                }

                let pages: number[] = [];
                let _current = (page <= this.pagesToShow) ? 1 : page;

                // current page is near the beginning
                while (_current <= this.pagesToShow && _current <= this.numPages) {
                    pages.push(_current++);
                }

                // current page is near the end
                if (
                    !pages.length &&
                    _current <= this.numPages &&
                    _current > this.pagesToShow &&
                    _current > this.numPages - this.pagesToShow + 1
                ) {
                    let _last = this.numPages;
                    while (this.numPages - this.pagesToShow < _last) {
                        pages.unshift(_last--);
                    }
                }

                // current page is in the middle
                if (!pages.length) {
                    pages.push(1);
                    pages.push(null);

                    pages.push(_current - 1);
                    pages.push(_current);
                    pages.push(_current + 1);
                }

                // prepend if we're at the and
                if (this.numPages > this.pagesToShow && pages[pages.length - 1] === this.numPages) {
                    if (this.numPages === pages.length + 1) {
                        pages = [1, ...pages];
                    } else {
                        pages = [1, null, ...pages];
                    }
                }

                // append if we're in middle
                if (this.numPages > this.pagesToShow && pages[pages.length - 1] !== this.numPages) {
                    if (this.numPages > pages.length + 1) {
                        pages.push(null);
                    }
                    pages.push(this.numPages);
                }

                this.pages$.next(pages);
            });
    }

    ngOnChanges(changes: NgChanges<NxPaginatorComponent>): void {
        if (changes.numPages && (changes.numPages.previousValue !== changes.numPages.currentValue)) {
            // TODO: Remove this with https://networkoptix.atlassian.net/browse/CLOUD-8667 *********
            if (this.CONFIG?.featureFlags.paginatorExperimental) {
                this.showExperimental =
                    this.CONFIG.featureFlags.paginatorExperimental &&
                    changes.numPages.currentValue === 5;
            }
            // *************************************************************************************
            this.numPages$.next(this.numPages);
            this.page$.next((this.numPages < this.page$.value) ? 1 : this.page$.value);
        }
    }
}
