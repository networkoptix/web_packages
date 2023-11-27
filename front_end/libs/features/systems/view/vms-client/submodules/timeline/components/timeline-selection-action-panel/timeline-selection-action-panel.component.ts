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
import { NxAccountService } from '@services/account.service';
import type { NxSystem } from '@services/system.service/system';
import { NxSystemService } from '@services/system.service/system.service';
import { icons } from '@static-variables';
import { PlaybackService } from '@view/services/playback.service';
import { VideoManagementSystemService } from '@view/services/vms.service';

import { TimelineSelectionService } from '../../services/timeline.selection.service';
import { TimelineService } from '../../services/timeline.service';
import type { TimelineSelectionServiceStatus } from '../../services/timeline.services.types';

@UntilDestroy()
@Component({
    selector: 'nx-timeline-selection-action-panel',
    templateUrl: './timeline-selection-action-panel.component.html',
    styleUrls: ['./timeline-selection-action-panel.component.scss'],
})
export class TimelineSelectionActionPanelComponent implements OnInit, AfterViewInit {
    private status: TimelineSelectionServiceStatus;
    private system: NxSystem;

    exportEnabled: boolean;
    private exportLink: string;
    exportName: string;
    icons = icons;

    @ViewChild('exportBtn', { static: true }) private exportBtn: ElementRef<HTMLAnchorElement>;

    constructor(
        private self: ElementRef,
        private playback: PlaybackService,
        private timeline: TimelineService,
        private selection: TimelineSelectionService,
        private accountService: NxAccountService,
        private systemService: NxSystemService,
        private vms: VideoManagementSystemService,
        private dialogs: NxDialogsService,
        private popoverService: NxPopoverService,
        private viewContainerRef: ViewContainerRef,
    ) {}

    ngOnInit(): void {
        this.selection.subject.pipe(untilDestroyed(this)).subscribe(s => {
            this.status = s;
            this.self.nativeElement.classList.toggle('active', s.isActive);
            if (s.isActive) {
                this.exportUrl();
                this.exportEnabled = !!this.vms.selectedCamera.getRecords(
                    Math.max(this.status.range.start, this.timeline.fullRange.start),
                    Math.min(this.status.range.end, this.timeline.fullRange.end),
                    1000,
                ).length;
            } else {
                this.exportLink = '';
                this.exportBtn.nativeElement.href = '#';
            }
        });

        // TODO: Remove duplicate system initialize
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
                this.system = this.systemService.createSystem(account.email, this.vms.systemId$$());
            }
        });
    }

    ngAfterViewInit(): void {
        this.selection.background = this.self.nativeElement;
    }

    downloadFile(): void {
        this.exportBtn.nativeElement.href = this.exportLink;
    }

    private exportUrl(): void {
        let transport = this.playback.state.transport;

        if (!['mp4', 'mkv'].includes(transport)) {
            transport = 'mkv';
        }
        this.exportLink = this.system
            ? this.system.mediaserver.getExportUrl(this.selection.exportUrlParams)
            : '';

        this.exportName = `${this.vms.selectedCamera.id}.${transport}`;
    }

    showLegend(template: TemplateRef<unknown>, target: HTMLElement): void {
        this.popoverService.open(
            template,
            target,
            {
                panelClass: 'hint-popover',
                arrowOffset: 4,
                positionStrategy: POS_STRATEGY.DEFAULT,
            },
            this.viewContainerRef,
        );
    }

    closeLegend(): void {
        this.popoverService.close();
    }

    clearSelection(): void {
        this.selection.reset();
    }

    initSetTimeDialog(): void {
        this.dialogs
            .selectTimeRange({
                selection: this.selection,
                start: this.timeline.fullRange.start,
                end: this.timeline.fullRange.end,
            })
            .then(result => {
                if (result?.start) {
                    this.selection.range = result;
                }
            });
    }
}
