import { Component } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { animationFrameScheduler, interval } from 'rxjs';

import { NxMenuService } from '@menu/menu.service';

@UntilDestroy()
@Component({
    selector: 'webgl',
    templateUrl: 'webgl.component.html',
    styleUrls: ['webgl.component.scss'],
})
export class WebglComponent {
    data: Array<{ durationMs: string; startTimeMs: string }>;
    newData: Array<{ durationMs: string; startTimeMs: string }>;

    constructor(private menuService: NxMenuService) {
        this.initData();
    }

    ngOnInit(): void {
        this.menuService.selectedSection.set('colors');
        this.menuService.selectedDetailsSection.set('webgl');

        interval(0, animationFrameScheduler)
            .pipe(untilDestroyed(this))
            .subscribe(() => {
                this.newData = [];
                this.newData.push({ durationMs: '1000', startTimeMs: `${Date.now()}` });
            });
    }

    initData(): void {
        this.data.push({ durationMs: '1000', startTimeMs: `${Date.now()}` });
    }
}
