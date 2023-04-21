/*eslint-disable */
import { Component } from '@angular/core';

import { NxMenuService } from '@app/menu/menu.service';
import { UntilDestroy/*, untilDestroyed*/ } from "@ngneat/until-destroy";
// import { /*animationFrameScheduler, */interval } from "rxjs";

@UntilDestroy()
@Component({
    selector: 'simple-webgl',
    templateUrl: 'webgl.component.html',
    styleUrls: ['webgl.component.scss'],
})
export class SimpleWebglComponent {
    data: Array<{ durationMs: string; startTimeMs: string; }>;
    newData: Array<{ durationMs: string; startTimeMs: string; }>;

    constructor(private menuService: NxMenuService) {
        this.initData();
    }

    ngOnInit(): void {
        this.menuService.section = 'colors';
        this.menuService.detail = 'simple-webgl';

        // interval(1000)
        //     .pipe(untilDestroyed(this))
        //     .subscribe(() => {
        //         this.newData = [];
        //         this.newData.push({ durationMs: '1000', startTimeMs: `${new Date().getTime()}` });
        //     });
    }

    initData(): void {
        this.data.push({ durationMs: '1000', startTimeMs: `${Date.now()}` })
    }
}
