import { Component, Input, SimpleChanges } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { BehaviorSubject, combineLatest, Observable } from 'rxjs';
import { map, pairwise, startWith } from 'rxjs/operators';

import { IConfig, NxConfigService } from '@services/nx-config';

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
    @Input() showPrevNext = false

    CONFIG: IConfig;
    page$: Observable<number>;
    pages$: Observable<number[]>;
    numPages$ = new BehaviorSubject(0)

    constructor(
        configService: NxConfigService,
        private route: ActivatedRoute
    ) {
        this.CONFIG = configService.config;
        this.page$ = this.route.queryParams.pipe(
            untilDestroyed(this),
            map(
                ({ page }) => {
                    let pageNum = parseInt(page || 1);
                    if (isNaN(pageNum) || !pageNum) {
                        pageNum = 1;
                    }
                    return Math.max(Math.min(this.numPages, pageNum), 1);
                }
            )
        );
        this.pages$ = combineLatest([this.page$, this.numPages$]).pipe(
            map(([page, numPages]): [number,  number[]] => {
                let curPage = Math.max(Math.min(page, numPages - this.pagesToShow), 1);
                const end = curPage + this.pagesToShow + 1;
                const pages: number[] = [];

                while (curPage < end && curPage <= numPages) {
                    pages.push(curPage);
                    curPage++;
                }

                if (pages.length > 3 && pages[pages.length - 1] !== numPages) {
                    pages[pages.length - 1] = numPages;
                    pages[pages.length - 2] = null;
                }

                return [page, pages];
            }),
            startWith(<unknown>[] as [number,  number[]]),
            pairwise(),
            map(([[_, prevPages], [page, pages]]) =>
                prevPages?.slice(1, prevPages.length - 1).includes(page)
                    ? prevPages
                    : pages
            )
        );
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes.numPages.previousValue !== changes.numPages.currentValue) {
            this.numPages$.next(this.numPages);
        }
    }
};
