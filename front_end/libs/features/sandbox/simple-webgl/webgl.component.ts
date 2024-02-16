import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
// import * as d3 from 'd3';
// import * as fc from 'd3fc';
import { timer } from 'rxjs';

import { NxCheckboxComponent } from '@components/checkbox/checkbox.component';
import { NxMenuService } from '@menu/menu.service';
import { NxAccountService } from '@services/account.service';
import { NxSystem } from '@services/system.service/system';
import { NxSystemService } from '@services/system.service/system.service';
import { NxSystemsService } from '@services/systems.service';
import { SimpleWebGLTimelineModule } from '@vms-client/submodules/timeline/components/simple-chart/webgl-timeline.module';

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
    standalone: true,
    imports: [CommonModule, FormsModule, NxCheckboxComponent, SimpleWebGLTimelineModule],
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
        this.menuService.selectedSection$$.set('colors');
        this.menuService.selectedDetailsSection$$.set('simple-webgl');

        await this.systemsService.getSystemAsPromise(SERVER_ID);
        this.system = this.systemService.createSystem(this.accountService.account.email, SERVER_ID);
        await this.system.update();

        this.system.mediaserver.getRecords(CAMERA_ID, 0, Date.now()).subscribe(records => {
            this.recordsData = records.reply[0].periods;
            this.end = Date.now();

            this.analyticsData = [
                { startTimeMs: '1690700400000', durationMs: '3000000' },
                { startTimeMs: '1690706400000', durationMs: '3000000' },
                { startTimeMs: '1690712400000', durationMs: '300000' },
                { startTimeMs: '1690718400000', durationMs: '1000' },
            ];
            this.bookmarksData = [
                { startTimeMs: '1691800400000', durationMs: '3000000' },
                { startTimeMs: '1691806400000', durationMs: '3000' },
                { startTimeMs: '1691812400000', durationMs: '5000000' },
                { startTimeMs: '1691820400000', durationMs: '5000000' },
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

        // this.initAreaChart();
    }

    prepShowData(): void {
        this.showData = { records: this.showTL, bookmarks: this.showBM, analytics: this.showAN };
    }

    // initAreaChart(): void {
    //     debugger;
    //     const extent = fc.extentLinear();
    //
    //     const xScale = d3.scaleLinear().domain([0, this.recordsData.length - 1]);
    //
    //     const yScale = d3.scaleLinear().domain(extent(this.recordsData));
    //
    //     const container = this.document.querySelector('d3fc-canvas-area');
    //
    //     const series = fc
    //         .seriesWebglArea()
    //         .xScale(xScale)
    //         .yScale(yScale)
    //         .crossValue((_, i) => i)
    //         .mainValue(d => d)
    //         .defined(() => true)
    //         .equals(previousData => previousData.length > 0);
    //
    //     let pixels: unknown = null;
    //     let frame = 0;
    //     // eslint-disable-next-line nx/no-untyped-init
    //     let gl = null;
    //
    //     d3.select(container)
    //         .on('click', () => {
    //             const domain = xScale.domain();
    //             const max = Math.round(domain[1] / 2);
    //             xScale.domain([0, max]);
    //             // container.requestRedraw();
    //         })
    //         .on('measure', event => {
    //             const { width, height } = event.detail;
    //             xScale.range([0, width]);
    //             yScale.range([height, 0]);
    //
    //             gl = container.querySelector('canvas').getContext('webgl');
    //             series.context(gl);
    //         })
    //         .on('draw', () => {
    //             if (pixels === null) {
    //                 pixels = new Uint8Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4);
    //             }
    //             performance.mark(`draw-start-${frame}`);
    //             series(this.recordsData);
    //             // Force GPU to complete rendering to allow accurate performance measurements to be taken
    //             gl.readPixels(
    //                 0,
    //                 0,
    //                 gl.drawingBufferWidth,
    //                 gl.drawingBufferHeight,
    //                 gl.RGBA,
    //                 gl.UNSIGNED_BYTE,
    //                 pixels,
    //             );
    //             performance.measure(`draw-duration-${frame}`, `draw-start-${frame}`);
    //             frame++;
    //         });
    //
    //     // container.requestRedraw();
    // }
}
