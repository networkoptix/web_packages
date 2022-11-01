import {
    Component,
    OnInit,
    ElementRef,
    AfterViewInit, TemplateRef, ViewContainerRef
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
    selector: 'timeline-selection-action-panel',
    templateUrl: './timeline-selection-action-panel.component.html',
    styleUrls: ['./timeline-selection-action-panel.component.scss']
})
export class TimelineSelectionActionPanelComponent implements OnInit, AfterViewInit {
    CONFIG: IConfig;

    protected status: TimelineSelectionServiceStatus;
    protected system: NxSystem;

    export: string;

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

    public exportUrl(): void {
        let transport = this.selection.transport;

        if (!['mp4', 'mkv'].includes(transport)) {
            transport = 'mkv';
        }
        this.export = this.system
            ? this.system.getExportUrl(this.selection.exportUrlParams)
            : '';

        const e = document.createElement('a');
        const href = 'data:application/octet-stream;charset=utf-8,' + encodeURIComponent(this.export);
        e.setAttribute('href', href);
        e.setAttribute('download', `${this.selection.cameraId}.${transport}`);
        document.body.appendChild(e);
        e.click();
        document.body.removeChild(e);
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
