import { Component } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { timer } from 'rxjs';

import { NxMenuService } from '@menu/menu.service';
import { NxAccountService } from '@services/account.service';
import { NxSystem } from '@services/system.service/system';
import { NxSystemService } from '@services/system.service/system.service';
import { NxSystemsService } from '@services/systems.service';

// SOFIA
// const SERVER_ID = '5231712d-503a-41fc-bc51-96f3ab13567c';
// const CAMERA_ID = '28211a91-4d61-e6b9-da49-172c127da68b?time=live';
// DESKTOP-UBUNTU
const SERVER_ID = '4087425b-f052-413d-96d9-79385ae2cdb6';
const CAMERA_ID = 'd4650aab-4812-f660-683e-a2c3f866028b?time=live';
// QA
// const SERVER_ID = 'b1012488-9fd0-449d-99f9-8c0604b99a45';
// const CAMERA_ID = '3645c7ee-ca91-e579-e753-1d85af1fd08c';

// const QA = 'b1012488-9fd0-449d-99f9-8c0604b99a45';
// const CAMERA_ID = '3645c7ee-ca91-e579-e753-1d85af1fd08c';

@UntilDestroy()
@Component({
    selector: 'simple-webgl',
    templateUrl: 'webgl.component.html',
    styleUrls: ['webgl.component.scss'],
})
export class SimpleWebglComponent {
    end: number;
    recordsData: Array<{ durationMs: string; startTimeMs: string }>;
    bookmarksData: Array<{ durationMs: string; startTimeMs: string }>;
    analyticsData: Array<{ durationMs: string; startTimeMs: string }>;
    newRecordsData: Array<{ durationMs: string; startTimeMs: string }>;

    system: NxSystem;
    showTL: boolean = true;
    showBM: boolean = true;
    showAN: boolean = true;
    showData: Record<string, boolean>;

    constructor(
        private menuService: NxMenuService,
        private systemsService: NxSystemsService,
        private systemService: NxSystemService,
        private accountService: NxAccountService,
    ) {
        this.recordsData = [];
        this.bookmarksData = [];
        this.analyticsData = [];
    }

    async ngOnInit(): Promise<void> {
        this.menuService.selectedSection.set('colors');
        this.menuService.selectedDetailsSection.set('simple-webgl');

        await this.systemsService.getSystemAsPromise(SERVER_ID);
        this.system = this.systemService.createSystem(this.accountService.account.email, SERVER_ID);
        await this.system.update();

        this.system.mediaserver.getRecords(CAMERA_ID, 0, Date.now()).subscribe(records => {
            this.recordsData = records.reply[0].periods;
            this.end = Date.now();

            this.analyticsData = [
                { startTimeMs: '1676231643552', durationMs: '300000' },
                { startTimeMs: '1676133984000', durationMs: '300000' },
                { startTimeMs: '1676017275000', durationMs: '300000' },
            ];
            this.bookmarksData = [
                { startTimeMs: '1676231653552', durationMs: '300000' },
                { startTimeMs: '1676221653552', durationMs: '3000' },
                { startTimeMs: '1676052229000', durationMs: '500000' },
                { startTimeMs: '1676082443000', durationMs: '500000' },
            ];
        });

        timer(3000, 5000)
            .pipe(untilDestroyed(this))
            .subscribe(() => {
                // this.newData = [];
                // this.newData.push({ durationMs: '-1', startTimeMs: `${this.end}` });
                this.system.mediaserver
                    .getRecords(CAMERA_ID, this.end, Date.now())
                    .subscribe(records => {
                        this.newRecordsData = records.reply.length ? records.reply[0].periods : [];
                        this.end = Date.now();
                    });
            });
    }

    prepShowData(): void {
        this.showData = { records: this.showTL, bookmarks: this.showBM, analytics: this.showAN };
    }
}
