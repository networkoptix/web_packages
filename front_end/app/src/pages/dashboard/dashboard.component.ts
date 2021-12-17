import { Component, ViewChildren, QueryList, HostListener, Inject, ElementRef, ViewChild } from '@angular/core';
import { Subject } from 'rxjs';
import { startWith, switchMap, debounceTime } from 'rxjs/operators';
import {
    CdkDropList,
    CdkDragEnter,
    moveItemInArray
} from '@angular/cdk/drag-drop';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';

import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { NxCloudApiService } from '@services/nx-cloud-api';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { WINDOW } from '@services/window-provider';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { IConfig, NxConfigService } from '@services/nx-config';
import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { FirstPartyWidget, WidgetCard } from '@components/widgets/helper-classes';
import { NxDynamicWidgetComponent } from '@components/dynamic-widget/dynamic-widget.component';
import { NxSystemsListWidgetComponent } from '@components/widgets/systems-list/systems-list-widget.component';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '@environments/environment';
import { NxToastService } from '@dialogs/toast.service';

/**
 * Configuration JSON format for saving, retrieving, uploading, or downloading dashboard settings
 */
export interface DashboardConfiguration {
    dashboardName: string,
    dragEnabled: boolean,
    cards: WidgetCard[]
}

@UntilDestroy()
@Component({
    selector: 'nx-dashboard',
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.scss']
})
export class NxDashboardComponent {
    readonly CUSTOM_PROPERTY_KEY = 'aggregated-dashboard';
    readonly MIN_COLUMNS = 4;
    readonly MAX_COLUMNS = 16;
    readonly MIN_GRID_SIZE = 108;
    readonly GRID_GAP = 16;

    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    readonly environment = environment;

    dashboardName = 'Drag and Drop Dashboard';
    updatePersisted$ = new Subject();
    updated$ = new Subject();
    gridColumns = 12;
    gridSize = 0;
    activeCellIndex = -1;
    settingsDownloadLink: SafeUrl = ''
    backupDownloadLink = ''
    dragEnabled: boolean;
    cards: WidgetCard[];
    loading = false;
    hidePreview = false;
    downloadFileName;
    activeAction;

    /**
     * Handles moving a selected card using arrows, or using tab and shift + tab to move forward and back between selected cards.
     */
    @ViewChildren(CdkDropList) dropsQuery: QueryList<CdkDropList>;

    @ViewChildren(NxDynamicWidgetComponent) firstPartyWidgets: QueryList<NxDynamicWidgetComponent>;

    @ViewChild('actionFrame', { static: true }) actionFrame: ElementRef;

    @HostListener('window:keydown', ['$event'])
    keyEvent(event: KeyboardEvent) {
        const moveForward = ['ArrowDown', 'ArrowRight'].includes(event.key);
        const moveBackward = ['ArrowUp', 'ArrowLeft'].includes(event.key);

        if (!this.dragEnabled || this.activeCellIndex === -1 || !(moveForward || moveBackward)) {
            if (event.key === 'Tab') {
                event.preventDefault();
                const nextCell = this.activeCellIndex < 0 ? (event.shiftKey ? this.cards.length - 1 : 0) : this.activeCellIndex + (event.shiftKey ? -1 : 1);
                this.activeCellIndex = nextCell >= this.cards.length ? 0 : nextCell;
                this.showActive();
            }
            return;
        }

        event.preventDefault();

        if (moveForward) {
            moveItemInArray(this.cards, this.activeCellIndex, this.activeCellIndex + 1);
            const nextCell = this.activeCellIndex + 1;
            this.activeCellIndex = nextCell >= this.cards.length ? -1 : nextCell;
        } else if (moveBackward) {
            moveItemInArray(this.cards, this.activeCellIndex, this.activeCellIndex - 1);
            this.activeCellIndex = this.activeCellIndex - 1;
        }

        this.showActive();
    }

    /**
     * Scrolls active / selected widget if not currently fully visible
     */
    showActive() {
        const active = this.dropsQuery.find(({ data }) => data === this.activeCellIndex);
        const activeElement = active?.element?.nativeElement;
        const { top, bottom } = activeElement?.getBoundingClientRect?.() || {};
        if (activeElement && top < 0 || bottom > this.window.innerHeight) {
            activeElement.scrollIntoView({ behavior: 'smooth' });
        }
    }

    isFirstPartyWidget = NxDynamicWidgetComponent.findWidget

    /**
     * Handles updating order when cards are dragged
     * @param $event CdkDragEnter
     */
    entered($event: CdkDragEnter) {
        this.activeCellIndex = $event.container.data;
        moveItemInArray(this.cards, $event.item.data, $event.container.data);
        this.updatePersistedConfig();
    }

    removeCard(i) {
        this.cards.splice(i, 1);
        this.updatePersistedConfig();
    }

    updateActive(index, e: any = {}) {
        e.stopPropagation?.();
        this.activeCellIndex = index;
    }

    adjustGridHeight({ width }: any) {
        const calculatedColumns = Math.floor(width / this.MIN_GRID_SIZE / this.MIN_COLUMNS) * this.MIN_COLUMNS;
        this.gridColumns = Math.min(Math.max(calculatedColumns, this.MIN_COLUMNS), this.MAX_COLUMNS);
        this.gridSize = Math.ceil((width - (this.gridColumns * this.GRID_GAP)) / this.gridColumns);
    }

    /**
     *
     * @returns DashboardConfiguration
     */
    getPreparedConfig(config?): DashboardConfiguration {
        const { dashboardName, dragEnabled, cards } = config || this;
        return { dashboardName, dragEnabled, cards: cards.map(({ editMode, ...card }) => card) };
    }

    /**
     * Triggers saving changes to cloud. Subject is used to rate limit saves
     */
    updatePersistedConfig() {
        this.updatePersisted$.next('updated');
        return this.updated$.toPromise();
    }

    /**
     * Todo: Might need some kind of validation not sure
     *
     * @param cards WidgetCard[]
     * @returns WidgetCard[]
     */
    validateCards(cards: any) {
        return cards;
    }

    async updateDashboard(dashboardUrl) {
        if (!dashboardUrl) {
            return false as false;
        }

        // Used to prevent cors issue when developing locally
        const dashboardUrlCleaned = this.environment.isLocal ? dashboardUrl : dashboardUrl.split(this.environment.cloudHost).reverse()[0];

        const downloaded = await this.http.get(dashboardUrlCleaned).toPromise().catch(_ => {
            const options = {
                classname: this.CONFIG.toast.danger
            };
            this.toastService.show(
                'Unable to download dashboard requested dashboard, please check link and try again. If you keep having issues try downloading the dashboard first and applying config directly.',
                options
            );
            return false as false;
        }) as Promise<Record<any, any>>;
        return downloaded;
    }

    async confirmDashboardUpdate(downloadedDashboard, currentDashboard, url) {
        this.prepareConfigDownload(currentDashboard);
        const date = new Date().toLocaleDateString().replace(/\//g, '_');
        const fileName = `${this.CUSTOM_PROPERTY_KEY}-${date}-settings-backup.dsh`;
        const state = await this.dialogs.confirm(
            `<p>Your dashboard <b>"${currentDashboard.dashboardName}"</b> is being updated to downloaded dashboard${downloadedDashboard.dashboardName ? ' <b>"' + downloadedDashboard.dashboardName + '"</b>' : ''
            }.</p><p>This dashboard was downloaded from <b>"${url}"</b>.</p> <div class="mt-3 d-flex justify-content-center"><a href="${this.backupDownloadLink
            }" download="${fileName
            }">Download backup of <b>"${currentDashboard.dashboardName
            } dashboard"</b></a></div>`,
            'Confirm dashboard update?',
            'Update dashboard',
            'btn-primary',
            "Don't update"
        );

        const updated = state === true;

        return updated ? downloadedDashboard : currentDashboard;
    }

    /**
     * Retrieves existing dashboard from cloud
     */
    getPersistedConfig = async () => {
        const { widgetUrl, dashboardUrl } = this.route.snapshot.queryParams;
        const downloadedDashboard = await this.updateDashboard(dashboardUrl);
        const currentDashboard = await this.cloudApi.getCustomAccountProperty(this.CUSTOM_PROPERTY_KEY).toPromise().catch(_ => ({}));
        const beingUpdated = downloadedDashboard && downloadedDashboard?.cards.length;
        const dashboard = beingUpdated ? await this.confirmDashboardUpdate(downloadedDashboard, currentDashboard, dashboardUrl) : currentDashboard;
        this.router.navigate([], { relativeTo: this.route, queryParams: { widgetUrl, dashboardUrl: '' }, queryParamsHandling: 'merge' });
        const { dragEnabled = true, cards = [], dashboardName = 'Drag and Drop Dashboard' } = dashboard;
        this.dragEnabled = widgetUrl || dragEnabled && cards.length;
        this.dashboardName = cards.length ? dashboardName : this.LANG.pageTitles.systems();

        // Default to show systems widget if not configured
        const systemsWidget = FirstPartyWidget.getConfig(NxSystemsListWidgetComponent);
        systemsWidget.size = systemsWidget.sizes[2];
        this.cards = this.validateCards(cards.length ? cards : [systemsWidget]);

        const dashboardUpdated = dashboard === downloadedDashboard;

        if (dashboardUpdated) {
            this.updatePersistedConfig();
        }

        if (widgetUrl) {
            setTimeout(() => this.addWidget());
        }
    }

    @HostListener('window:message', ['$event'])
    async onMessage({ data: { route, options } }) {
        const updatedDashboard = options.queryParams.dashboardUrl;

        if (updatedDashboard) {
            this.activeAction = null;
        }

        await this.router.navigate(route, options).then(_ => updatedDashboard && this.getPersistedConfig());
        this.hidePreview = true;
        if (options.queryParams.widgetUrl && await this.addWidget()) {
            this.activeAction = null;
        }
        this.hidePreview = false;
    }

    openAction(action?) {
        if (!action) {
            this.activeAction = null;
            return;
        }
        const brokenRoute = ['/systems', '/developers'].some(route => action.url.startsWith(route));
        const url = action.url + '?' + Object.entries(action.params || {}).reduce((params, [key, val]) => `${params}&${key}=${val}`, '') + `${action.params && !brokenRoute ? '&' : ''}${brokenRoute ? '' : 'adminPreview=true'}`;
        const label = action.label || action.name;
        if (brokenRoute) {
            this.window.open(url, 'dashboard_tab');
        } else {
            this.activeAction = { url, label };
        }
    }

    async openPage(newWindow = false) {
        this.loading = !newWindow;
        const url = this.activeAction.url.replace('adminPreview=true', '');
        if (!newWindow && this.activeAction.url.startsWith('/') && !this.activeAction.url.startsWith('/admin')) {
            await this.router.navigateByUrl(url);
        } else {
            this.window.open(url, 'dashboard_tab');
        }
        this.activeAction = '';
        this.loading = false;
    }

    /**
     * Prepares download link to allow downloading of current configuration
     */
    prepareConfigDownload(config?) {
        const settings = JSON.stringify(this.getPreparedConfig(config));
        const dataUri = 'data:text/json;charset=UTF-8,' + encodeURIComponent(settings);
        if (config) {
            this.backupDownloadLink = dataUri;
        } else {
            this.settingsDownloadLink = this.sanitizer.bypassSecurityTrustUrl(dataUri);
        }
    }

    /**
     * Opens widget selection / preview modal and sets focus to widget card if one was added
     */
    async addWidget() {
        const firstPartyWidgets = NxDynamicWidgetComponent.getFirstPartyWidgetConfigs();
        const card = await this.dialogsService.addWidget(
            this.gridSize,
            this.GRID_GAP,
            firstPartyWidgets
        );
        if (card) {
            this.router.navigate([], { relativeTo: this.route, queryParams: { widgetUrl: '' }, queryParamsHandling: 'merge' });
            this.cards = this.validateCards([...this.cards, card]);
            this.updatePersistedConfig();
            setTimeout(() => {
                this.activeCellIndex = this.cards.length - 1;
                this.showActive();
            });
            return true;
        }
    }

    updateSelectedSize(size, card: WidgetCard) {
        card.size = size;
        this.updatePersistedConfig();
    }

    toggleEditMode(card: WidgetCard) {
        card.editMode = !card.editMode;
        if (!card.editMode) {
            this.updatePersistedConfig();
        }
    }

    /**
     * Handles updating dashboard configuration from user uploaded json
     */
    handleConfigUpload({ target: { files } }: any) {
        this.cards = [];
        const settingsFile = files.item(0);
        const fileReader = new FileReader();
        fileReader.onload = (e) => {
            const { cards, dragEnabled, dashboardName } = JSON.parse(fileReader.result as string);
            if (!cards) {
                return;
            }
            this.cards = this.validateCards(cards);
            this.dragEnabled = dragEnabled;
            this.dashboardName = dashboardName;
            this.updatePersistedConfig();
        };
        fileReader.readAsText(settingsFile);
    }

    toggleDragEnabled(enabled) {
        this.dragEnabled = enabled;
        if (!enabled) {
            this.cards.forEach(card => {
                card.editMode = false;
            });
        }
        this.updatePersistedConfig();
    }

    drops: CdkDropList[];

    ngAfterViewInit() {
        this.dropsQuery.changes.pipe(startWith('')).subscribe(() => {
            this.drops = this.dropsQuery.toArray();
        });
    }

    ngOnInit() {
        this.updatePersisted$.pipe(
            debounceTime(250),
            switchMap(_ => this.cloudApi.saveCustomAccountProperty(this.getPreparedConfig(), this.CUSTOM_PROPERTY_KEY)),
            untilDestroyed(this)
        ).subscribe(this.updated$);
        this.getPersistedConfig();
        const date = new Date().toLocaleDateString().replace(/\//g, '_');
        this.downloadFileName = `${this.CUSTOM_PROPERTY_KEY}-${date}-settings.dsh`;
    }

    constructor(
        languageService: NxLanguageProviderService,
        configService: NxConfigService,
        private cloudApi: NxCloudApiService,
        private sanitizer: DomSanitizer,
        private dialogsService: NxDialogsService,
        private route: ActivatedRoute,
        private router: Router,
        private http: HttpClient,
        private dialogs: NxDialogsService,
        private toastService: NxToastService,
        @Inject(WINDOW) private window: Window
    ) {
        this.CONFIG = configService.config;
        this.LANG = languageService.translations;
    }
}
