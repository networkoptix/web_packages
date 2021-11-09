import { Component, OnInit, OnDestroy, HostListener, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { TimelineSelectionService, TimelineSelectionServiceStatus } from '../../services/timeline.selection.service';
import { interval, Observable, Subject, Subscription } from 'rxjs';
import TimelineService from '../../services/timeline.service';
import { msDurationToString } from './utils';
import { throttle, map, distinctUntilChanged } from 'rxjs/operators';
import { NxAccountService } from '../../../../../../../../services/account.service';
import { NxSystem, NxSystemService } from '../../../../../../../../services/system.service';
import { IConfig, NxConfigService } from '../../../../../../../../services/nx-config';
import VideoManagementSystemService from '../../../vms/services/vms.service';
import TimeRange from '../../services/TimeRange';
import { NxDialogsService } from '@dialogs/dialogs.service';

const THROTTLE_MS = 50;
const EAR_WIDTH = 120;

type ssRange = { start: number, end: number }

@Component({
    selector: 'timeline-selection-action-panel',
    templateUrl: './timeline-selection-action-panel.component.html',
    styleUrls: ['./timeline-selection-action-panel.component.scss']
})
export class TimelineSelectionActionPanelComponent implements OnInit, OnDestroy, AfterViewInit {
    protected subscription: Subscription
    protected status: TimelineSelectionServiceStatus
    protected system: NxSystem

    CONFIG: IConfig;

    public get duration (): string {
        return msDurationToString(Math.floor(this.selection.range.duration / 1000) * 1000);
    }

    public get exportUrl (): string {
        // return this.selection.exportUrl
        return this.system ? this.system.getExportUrl(this.selection.exportUrlParams) : '';
    }

    constructor(
        configService: NxConfigService,
        private self: ElementRef,
        protected timeline: TimelineService,
        protected selection: TimelineSelectionService,
        protected accountService: NxAccountService,
        protected systemService: NxSystemService,
        protected vms: VideoManagementSystemService,
        protected dialogs: NxDialogsService,
    ) {
        this.CONFIG = configService.getConfig();
        this.onSubjectChange = this.onSubjectChange.bind(this);
    }

    protected get $self (): HTMLElement {
        return this.self.nativeElement;
    }

    public duration$: Observable<String>

    public ngOnInit (): void {
        this.subscription = this.selection.subject.subscribe(this.onSubjectChange);

        // supposed to reduce jitter; doesn't quite work, though
        // this.duration$ = this.selection.subject
        //     .pipe(throttle(ev => interval(THROTTLE_MS)))
        //     .pipe(map(s => msDurationToString(Math.floor(s.range.duration / 1000) * 1000)))

        // a fallback jitter reduction solution
        this.duration$ = interval(THROTTLE_MS).pipe(map(_ => this.duration)).pipe(distinctUntilChanged());

        this.accountService.get().then((account) => {
            if (!account) {
                return Promise.reject();
            }
            if (this.CONFIG.isLocal) {
                this.system = this.systemService.createLocalSystem(this.accountService.mediaServerApi, account.id, account.email);
            } else {
                this.system = this.systemService.createSystem(account.email, this.vms.systemId, undefined, true);
            }
        });
    }

    public ngAfterViewInit (): void {
        this.selection.$background = this.self.nativeElement;
    }

    public ngOnDestroy (): void {
        this.subscription.unsubscribe();
    }

    protected _prev

    public onSubjectChange (s: TimelineSelectionServiceStatus) {
        this.status = s;
        this.$self.classList.toggle('active', s.isActive);
    }

    public handleDurationClick (e: MouseEvent) {
        this.timeline.jumpScrollTo(
            this.selection.range.start -
            this.timeline.domWidthToDuration(EAR_WIDTH)
        );
    }

    public handleDurationDoubleClick (e: MouseEvent, recalibrate: boolean = false) {
        const margin = this.timeline.domWidthToDuration(EAR_WIDTH);
        this.timeline.visibleRange = new TimeRange(
            this.selection.range.start - margin,
            this.selection.range.end + margin
        );
        if (recalibrate) {
            setTimeout(() => this.handleDurationDoubleClick(e), 0);
        }
    }

    public initSetTimeDialog () {
        const dialog = this.dialogs.selectTimeRange();
        dialog.then(this._onTimeSetDialogDone);
    }

    public _onTimeSetDialogDone = (result: boolean | ssRange) => {
        if (result['start']) {
            this.selection.range = result as TimeRange
        }
    }
}

export default TimelineSelectionActionPanelComponent;
