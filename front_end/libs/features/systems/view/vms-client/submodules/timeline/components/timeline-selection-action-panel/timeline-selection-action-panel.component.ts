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
import { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import type { NxSystem } from '@services/system.service/system';
import { NxSystemService } from '@services/system.service/system.service';
import { VideoManagementSystemService } from '@vms-client/submodules/vms/services/vms.service';

import { TimeRange } from '../../services/TimeRange';
import {
    TimelineSelectionService,
} from '../../services/timeline.selection.service';
import { TimelineService } from '../../services/timeline.service';
import type {
    TimelineSelectionServiceStatus,
} from '../../services/timeline.services.types';

type ssRange = { start: number, end: number };

@UntilDestroy()
@Component({
    selector: 'nx-timeline-selection-action-panel',
    templateUrl: './timeline-selection-action-panel.component.html',
    styleUrls: ['./timeline-selection-action-panel.component.scss']
})
export class TimelineSelectionActionPanelComponent implements OnInit, AfterViewInit {
    CONFIG: IConfig;

    protected status: TimelineSelectionServiceStatus;
    protected system: NxSystem;

    exportLink: string;
    exportName: string;

    @ViewChild('exportBtn', { static: true }) exportBtn: ElementRef<HTMLAnchorElement>;

    constructor(
        configService: NxConfigService,
        private self: ElementRef,
        protected timeline: TimelineService,
        public selection: TimelineSelectionService,
        protected accountService: NxAccountService,
        protected systemService: NxSystemService,
        protected vms: VideoManagementSystemService,
        protected dialogs: NxDialogsService,
        private popoverService: NxPopoverService,
        private _viewContainerRef: ViewContainerRef,
    ) {
        this.CONFIG = configService.getConfig();
    }

    public ngOnInit(): void {
        this.selection.subject
            .pipe(untilDestroyed(this))
            .subscribe((s: TimelineSelectionServiceStatus) => {
                this.onSubjectChange(s);
            });

        this.accountService.get().then(account => {
            if (!account) {
                return Promise.reject();
            }
            if (environment.isLocal) {
                this.system = this.systemService.createLocalSystem(
                    this.accountService.mediaServerApi,
                    account.id,
                    account.email
                );
            } else {
                this.system = this.systemService.createSystem(
                    account.email,
                    this.vms.systemId,
                    undefined,
                    true
                );
            }
        });
    }

    public ngAfterViewInit(): void {
        this.selection.$background = this.self.nativeElement;
    }

    downloadFile(): void {
        this.exportBtn.nativeElement.href = this.exportLink;
    }

    private exportUrl(): void {
        let transport = this.selection.transport;

        if (!['mp4', 'mkv'].includes(transport)) {
            transport = 'mkv';
        }
        this.exportLink = this.system
            ? this.system.getExportUrl(this.selection.exportUrlParams)
            : '';

        this.exportName = `${this.selection.cameraId}.${transport}`;
    }

    showLegend(template: TemplateRef<unknown>, target: HTMLElement): void {
        this.popoverService.open(
            template,
            target,
            {
                panelClass: 'hint-popover',
                arrowOffset: 4,
                positionStrategy: POS_STRATEGY.DEFAULT
            },
            this._viewContainerRef);
    }

    closeLegend(): void {
        this.popoverService.close();
    }

    public clearSelection(): void {
        this.selection.reset();
    }

    public onSubjectChange(s: TimelineSelectionServiceStatus): void {
        this.status = s;
        this.self.nativeElement.classList.toggle('active', s.isActive);
        if (s.isActive) {
            this.exportUrl();
        } else {
            this.exportLink = '';
            this.exportBtn.nativeElement.href = '#';
        }
    }

    public initSetTimeDialog(): void {
        const dialog = this.dialogs.selectTimeRange(this.selection);
        dialog.then(this._onTimeSetDialogDone);
    }

    public _onTimeSetDialogDone = (result: boolean | ssRange): void => {
        // eslint-disable-next-line @typescript-eslint/dot-notation
        if (result['start']) {
            this.selection.range = result as TimeRange;
        }
    };
}
