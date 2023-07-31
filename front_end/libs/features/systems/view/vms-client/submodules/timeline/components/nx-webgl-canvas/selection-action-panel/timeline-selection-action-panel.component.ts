import {
    Component,
    OnInit,
    ElementRef,
    AfterViewInit,
    TemplateRef,
    ViewContainerRef,
    ViewChild,
} from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';

import { POS_STRATEGY } from '@components/popover/popover-config';
import { NxPopoverService } from '@components/popover/popover.service';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { environment } from '@environments/environment';
import { icons } from '@lib/variables/static-variables';
import { NxAccountService } from '@services/account.service';
import type { NxSystem } from '@services/system.service/system';
import { NxSystemService } from '@services/system.service/system.service';
import { ExportSelection } from '@vms-client/submodules/timeline/components/nx-webgl-canvas/selection/selection.types';
import { NxWebGLService } from '@vms-client/submodules/timeline/components/nx-webgl-canvas/services/webgl.service';
import { SELECTION_DATE_RANGE } from '@vms-client/submodules/timeline/components/nx-webgl-canvas/services/webgl.types';
// import { VideoManagementSystemService } from '@vms-client/submodules/vms/services/vms.service';

// import { TimeRange } from '../../services/TimeRange';
// import { TimelineSelectionService } from '../../services/timeline.selection.service';
// import { TimelineService } from '../../services/timeline.service';
// import type { TimelineSelectionServiceStatus } from '../../services/timeline.services.types';

// type ssRange = { start: number; end: number };

@UntilDestroy()
@Component({
    selector: 'nx-webgl-timeline-selection-action-panel',
    templateUrl: './timeline-selection-action-panel.component.html',
    styleUrls: ['./timeline-selection-action-panel.component.scss'],
})
export class WebGlTimelineSelectionActionPanelComponent implements OnInit, AfterViewInit {
    // protected status: TimelineSelectionServiceStatus;
    protected system: NxSystem;

    exportEnabled: boolean;
    exportLink: string;
    exportName: string;
    icons = icons;

    selection: ExportSelection;

    @ViewChild('exportBtn', { static: true }) exportBtn: ElementRef<HTMLAnchorElement>;

    constructor(
        private self: ElementRef,
        // protected timeline: TimelineService,
        // public selection: TimelineSelectionService,
        protected accountService: NxAccountService,
        protected systemService: NxSystemService,
        // protected vms: VideoManagementSystemService,
        protected dialogs: NxDialogsService,
        private popoverService: NxPopoverService,
        private webglService: NxWebGLService,
        private _viewContainerRef: ViewContainerRef,
    ) {}

    public ngOnInit(): void {
        this.webglService.selection$.pipe(untilDestroyed(this)).subscribe(selection => {
            this.selection = selection;
            this.self.nativeElement.classList.toggle('active', selection.active && !selection.drag);

            if (selection.active) {
                // this.exportUrl();
                this.exportEnabled = true;
                // !!this.vms.selectedCamera.getRecords(
                //     Math.max(this.status.range.start, this.selection.timeline.fullRange.start),
                //     Math.min(this.status.range.end, this.selection.timeline.fullRange.end),
                //     1000
                // ).length;
            } else {
                this.exportLink = '';
                this.exportBtn.nativeElement.href = '#';
            }
        });

        // this.selection.subject
        //     .pipe(untilDestroyed(this))
        //     .subscribe((s: TimelineSelectionServiceStatus) => {
        //         this.onSubjectChange(s);
        //     });

        this.accountService.get().then(account => {
            if (!account) {
                return Promise.reject();
            }
            if (environment.isLocal) {
                this.system = this.systemService.createLocalSystem(
                    this.accountService.mediaServerApi,
                    account.id,
                    account.email,
                );
            } else {
                // this.system = this.systemService.createSystem(
                //     account.email,
                //     this.vms.systemId
                // );
            }
        });
    }

    public ngAfterViewInit(): void {
        // this.selection.$background = this.self.nativeElement;
    }

    downloadFile(): void {
        this.exportBtn.nativeElement.href = this.exportLink;
    }

    // private exportUrl(): void {
    // let transport = this.selection.transport;

    // if (!['mp4', 'mkv'].includes(transport)) {
    //     transport = 'mkv';
    // }
    // this.exportLink = this.system
    //     ? this.system.mediaserver.getExportUrl(this.selection.exportUrlParams as Parameters<typeof this.system.mediaserver.getExportUrl>[0])
    //     : '';
    //
    // this.exportName = `${this.selection.cameraId}.${transport}`;
    // }

    showLegend(template: TemplateRef<unknown>, target: HTMLElement): void {
        this.popoverService.open(
            template,
            target,
            {
                panelClass: 'hint-popover',
                arrowOffset: 4,
                positionStrategy: POS_STRATEGY.DEFAULT,
            },
            this._viewContainerRef,
        );
    }

    closeLegend(): void {
        this.popoverService.close();
    }

    public clearSelection(): void {
        this.webglService.selectionReset();
    }

    // public onSubjectChange(s: TimelineSelectionServiceStatus): void {
    // this.status = s;
    // this.self.nativeElement.classList.toggle('active', s.isActive);
    // if (s.isActive) {
    //     this.exportUrl();
    //     this.exportEnabled = !!this.vms.selectedCamera.getRecords(
    //         Math.max(this.status.range.start, this.selection.timeline.fullRange.start),
    //         Math.min(this.status.range.end, this.selection.timeline.fullRange.end),
    //         1000
    //     ).length;
    // } else {
    //     this.exportLink = '';
    //     this.exportBtn.nativeElement.href = '#';
    // }
    // }

    public initSetTimeDialog(): void {
        const dialog = this.dialogs.selectWebGlTimeRange(this.selection);
        dialog.then(result => this.onTimeSetDialogDone(result));
    }

    private onTimeSetDialogDone = (result: SELECTION_DATE_RANGE): void => {
        this.selection.startDate = result.start;
        this.selection.endDate = result.end;

        this.webglService.selection$.next(this.selection);
        this.webglService.updateSelection();
    };
}
