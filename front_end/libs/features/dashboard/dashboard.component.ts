import { CdkDragDrop, CdkDragEnter, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { HttpClient } from '@angular/common/http';
import {
    Component,
    ElementRef,
    HostListener,
    QueryList,
    ViewChild,
    ViewChildren,
} from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { last } from 'lodash-es';
import { CookieService } from 'ngx-cookie-service';
import { Subject } from 'rxjs';
import { debounceTime, startWith, switchMap } from 'rxjs/operators';
import { v4 as uuid } from 'uuid';

import { NxDynamicWidgetComponent } from '@components/dynamic-widget/dynamic-widget.component';
import { ToastType } from '@components/toast-container/toast.types';
import { FirstPartyWidget, WidgetCard, WidgetSize } from '@components/widgets/helper-classes';
import { NxSystemsListWidgetComponent } from '@components/widgets/systems-list/systems-list-widget.component';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { environment } from '@environments/environment';
import staticLang from '@language_static';
import { NxAccountService } from '@services/account.service';
import { NxCloudApiService } from '@services/nx-cloud-api';
import type { CustomAccountProperty } from '@services/nx-cloud-api/custom-account-property';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxPageService } from '@services/page.service';
import { NxToastService } from '@services/toast.service';
import { icons } from '@static-variables';

import { DashboardConfiguration } from './dashboard-configuration';

/**
 * Configuration JSON format for saving, retrieving, uploading, or downloading dashboard settings
 */
class DashboardGroup {
    constructor(
        public dashboardGroupName: string,
        public menu?: DashboardConfiguration[],
        public activeId?: string,
        public dragEnabled = true,
    ) {
        const systemsWidget = FirstPartyWidget.getConfig(
            NxSystemsListWidgetComponent as typeof FirstPartyWidget,
        );
        systemsWidget.size = systemsWidget.sizes[2];
        if (!this.menu || !this.menu.length) {
            this.menu = [new DashboardConfiguration('Systems', [systemsWidget])];
        }
        this.activeId ||= this.menu[0].id;
    }

    static validateDashboard(dashboard: DashboardGroup, fallbackName: string) {
        const invalid = dashboard?.dashboardGroupName === undefined || !dashboard?.menu?.length;
        return invalid ? new DashboardGroup(fallbackName) : dashboard;
    }
}

@UntilDestroy()
@Component({
    selector: 'nx-dashboard',
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.scss'],
})
export class NxDashboardComponent implements DashboardGroup {
    readonly CUSTOM_PROPERTY_KEY = 'aggregated-dashboard';
    readonly MIN_COLUMNS = 4;
    readonly MAX_COLUMNS = 16;
    readonly MIN_GRID_SIZE = 108;
    readonly GRID_GAP = 0;

    CONFIG: IConfig;
    LANG = staticLang;

    readonly environment = environment;

    dashboardCustomProperty: CustomAccountProperty<DashboardGroup>;

    dashboardGroupName = 'Drag and Drop Dashboard';
    activeId: string;
    activeDashboard: DashboardConfiguration;
    updatePersisted$ = new Subject();
    updated$ = new Subject();
    gridColumns = 12;
    gridSize = 0;
    activeCellIndex = -1;
    hoverCellIndex = -1;
    settingsDownloadLink: SafeUrl = '';
    backupDownloadLink = '';
    dragEnabled: boolean;
    cards: WidgetCard[];
    menu: DashboardConfiguration[] = [];
    loading = false;
    hidePreview = false;
    editingTitle = false;
    showSettings = false;
    showSidePanel = true;
    downloadFileName;
    activeAction;
    icons = icons;

    /**
     * Handles moving a selected card using arrows, or using tab and shift + tab to move forward and back between selected cards.
     */
    @ViewChildren(CdkDropList) dropsQuery: QueryList<CdkDropList>;

    @ViewChildren(NxDynamicWidgetComponent) firstPartyWidgets: QueryList<NxDynamicWidgetComponent>;

    @ViewChild('actionFrame', { static: true }) actionFrame: ElementRef;

    @HostListener('window:keydown', ['$event'])
    keyEvent(event: KeyboardEvent): void {
        const moveForward = ['ArrowDown', 'ArrowRight'].includes(event.key);
        const moveBackward = ['ArrowUp', 'ArrowLeft'].includes(event.key);

        if (!this.dragEnabled || this.activeCellIndex === -1 || !(moveForward || moveBackward)) {
            if (event.key === 'Tab') {
                event.preventDefault();
                const nextCell =
                    this.activeCellIndex < 0
                        ? event.shiftKey
                            ? this.cards.length - 1
                            : 0
                        : this.activeCellIndex + (event.shiftKey ? -1 : 1);
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
    showActive(): void {
        const active = this.dropsQuery.find(({ data }) => data === this.activeCellIndex);
        const activeElement = active?.element?.nativeElement;
        const { top, bottom } = activeElement?.getBoundingClientRect?.() || {};
        if ((activeElement && top < 0) || bottom > window.innerHeight) {
            activeElement.scrollIntoView({ behavior: 'smooth' });
        }
    }

    isFirstPartyWidget = NxDynamicWidgetComponent.findWidget;

    /**
     * Handles updating order when cards are dragged
     * @param $event CdkDragEnter
     */
    entered($event: CdkDragEnter): void {
        this.activeCellIndex = $event.container.data;
        moveItemInArray(this.cards, $event.item.data, $event.container.data);
        this.updatePersistedConfig();
    }

    removeCard(i): void {
        this.cards.splice(i, 1);
        this.updatePersistedConfig();
    }

    updateActive(index, e: any = {}): void {
        e.stopPropagation?.();
        this.activeCellIndex = index;
    }

    toggleSidePanel(): void {
        this.gridSize = 0;
        this.showSidePanel = !this.showSidePanel;
        setTimeout(() => {
            this.loading = false;
        });
    }

    adjustGridHeight({ width }: any): void {
        const calculatedColumns =
            Math.floor(width / this.MIN_GRID_SIZE / this.MIN_COLUMNS) * this.MIN_COLUMNS;
        this.gridColumns = Math.min(
            Math.max(
                this.showSidePanel ? calculatedColumns : calculatedColumns - 4,
                this.MIN_COLUMNS,
            ),
            this.MAX_COLUMNS,
        );
        this.gridSize = Math.ceil(
            (width - this.gridColumns * (this.GRID_GAP || 1)) / this.gridColumns,
        );
    }

    /**
     *
     * @returns DashboardGroup
     */
    getPreparedConfig(config?): DashboardGroup {
        const { dashboardGroupName, dragEnabled, menu, activeId } = config || this;
        return {
            dashboardGroupName,
            dragEnabled,
            activeId,
            menu: menu.map(({ id, ...menu }) => ({ ...menu, id: id || uuid() })),
        };
    }

    /**
     * Triggers saving changes to cloud. Subject is used to rate limit saves
     */
    updatePersistedConfig() {
        this.menu = this.menu.map(dashboard =>
            dashboard.id === this.activeDashboard.id ? this.activeDashboard : dashboard,
        );
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
            return false as const;
        }

        // Used to prevent cors issue when developing locally
        const dashboardUrlCleaned = this.environment.isWebadmin
            ? dashboardUrl
            : last(dashboardUrl.split(this.environment.cloudHost));

        const downloaded = (await this.http
            .get(dashboardUrlCleaned)
            .toPromise()
            .catch(_ => {
                this.toastService.show(
                    'Unable to download dashboard requested dashboard, please check link and try again. If you keep having issues try downloading the dashboard first and applying config directly.',
                    ToastType.Danger,
                );
                return false as const;
            })) as Promise<Record<any, any>>;
        return downloaded;
    }

    async confirmDashboardUpdate(downloadedDashboard, currentDashboard, url) {
        this.prepareConfigDownload(currentDashboard);
        const date = new Date().toLocaleDateString().replace(/\//g, '_');
        const fileName = `${this.CUSTOM_PROPERTY_KEY}-${date}-settings-backup.dsh`;
        const message = `<p>Your dashboard <b>"${
            currentDashboard.dashboardName
        }"</b> is being updated to downloaded dashboard${
            downloadedDashboard.dashboardName
                ? ' <b>"' + downloadedDashboard.dashboardName + '"</b>'
                : ''
        }.</p><p>This dashboard was downloaded from <b>"${url}"</b>.</p> <div class="mt-3 d-flex justify-content-center"><a href="${
            this.backupDownloadLink
        }" download="${fileName}">Download backup of <b>"${
            currentDashboard.dashboardName
        } dashboard"</b></a></div>`;
        const state = await this.dialogs.confirm({
            title: 'Confirm dashboard update?',
            message,
            safeHTML: true,
            footer: {
                actionLabel: 'Update dashboard',
                cancelLabel: "Don't update",
            },
        });

        return state ? downloadedDashboard : currentDashboard;
    }

    /**
     * Retrieves existing dashboard from cloud
     */
    getPersistedConfig = async (): Promise<void> => {
        const {
            widgetUrl,
            dashboardUrl,
            devServer = this.cookieService.get('devServer'),
        } = this.route.snapshot.queryParams;
        const downloadedDashboard = await this.updateDashboard(dashboardUrl);
        const currentDashboard = DashboardGroup.validateDashboard(
            await this.dashboardCustomProperty.get(false, true),
            `${this.accountService.account.first_name}'s Dashboards`,
        );
        const beingUpdated = downloadedDashboard && downloadedDashboard?.cards.length;

        // Update logic to replace or add to dashboard
        const dashboard = beingUpdated
            ? await this.confirmDashboardUpdate(downloadedDashboard, currentDashboard, dashboardUrl)
            : currentDashboard;
        const {
            dragEnabled = true,
            menu = [],
            dashboardGroupName = 'Drag and Drop Dashboard',
            activeId = '',
        } = dashboard;
        const dashboardId = this.route.snapshot.queryParams?.dashboardId || activeId;
        this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { widgetUrl, dashboardUrl: '', dashboardId },
            queryParamsHandling: 'merge',
        });
        this.menu = menu;
        this.dragEnabled = Boolean(widgetUrl || (dragEnabled && menu.length));
        this.dashboardGroupName = menu.length ? dashboardGroupName : this.LANG.pageTitles.systems;
        this.pageService.pageTitle(this.dashboardGroupName);

        this.updateCards(dashboardId, this.menu);

        const dashboardUpdated = dashboard === downloadedDashboard;

        if (dashboardUpdated) {
            this.updatePersistedConfig();
        }

        if (widgetUrl || devServer) {
            setTimeout(() => this.addWidget());
        }
    };

    updateSelectedDashboard = (
        dashboardId,
        dashboardToAddIfNotExisting?: DashboardConfiguration,
    ): void => {
        if (!this.menu.find(({ id }) => id === dashboardId) && dashboardToAddIfNotExisting) {
            this.menu.push(dashboardToAddIfNotExisting);
        }
        this.updateCards(dashboardId);
        this.router.navigate([], { queryParams: { dashboardId } });
    };

    private updateCards(activeId: string, menu: DashboardConfiguration[] = this.menu): void {
        // Default to show systems widget if not configured
        const systemsWidget = FirstPartyWidget.getConfig(
            NxSystemsListWidgetComponent as typeof FirstPartyWidget,
        );
        systemsWidget.size = systemsWidget.sizes[2];
        this.activeDashboard =
            menu.find(({ id }) => id === activeId) || menu.find(({ cards }) => cards.length);
        const hasCards = this.menu.length || !!this.activeDashboard?.cards?.length;
        this.activeId = hasCards ? this.activeDashboard.id : uuid();

        if (!hasCards) {
            this.activeDashboard = {
                id: this.activeId,
                dashboardName: 'Systems',
                cards: [systemsWidget],
            };
            menu = [this.activeDashboard];
        }

        this.menu = menu.map(({ id, ...menu }) => ({ id: id || uuid(), ...menu }));
        this.cards = this.validateCards(hasCards ? this.activeDashboard.cards : [systemsWidget]);
    }

    @HostListener('window:message', ['$event'])
    async onMessage({ data: { route, options } }): Promise<void> {
        const updatedDashboard = options.queryParams.dashboardUrl;

        if (updatedDashboard) {
            this.activeAction = null;
        }

        await this.router
            .navigate(route, options)
            .then(_ => updatedDashboard && this.getPersistedConfig());
        this.hidePreview = true;
        if (options.queryParams.widgetUrl && (await this.addWidget())) {
            this.activeAction = null;
        }
        this.hidePreview = false;
    }

    openAction(action?): void {
        if (!action) {
            this.activeAction = null;
            return;
        }
        const brokenRoute = ['/systems', '/developers'].some(route => action.url.startsWith(route));
        const url =
            action.url +
            '?' +
            Object.entries(action.params || {}).reduce(
                (params, [key, val]) => `${params}&${key}=${val}`,
                '',
            ) +
            `${action.params && !brokenRoute ? '&' : ''}${brokenRoute ? '' : 'adminPreview=true'}`;
        const label = action.label || action.name;
        if (brokenRoute) {
            window.open(url, 'dashboard_tab');
        } else {
            this.activeAction = { url, label };
        }
    }

    async openPage(newWindow = false): Promise<void> {
        this.loading = !newWindow;
        const url = this.activeAction.url.replace('adminPreview=true', '');
        if (
            !newWindow &&
            this.activeAction.url.startsWith('/') &&
            !this.activeAction.url.startsWith('/admin')
        ) {
            await this.router.navigateByUrl(url);
        } else {
            window.open(url, 'dashboard_tab');
        }
        this.activeAction = '';
        this.loading = false;
    }

    /**
     * Prepares download link to allow downloading of current configuration
     */
    prepareConfigDownload(config?): void {
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
        const newDashboard = new DashboardConfiguration('Add New Dashboard +');
        const card = await this.dialogs.addWidget(
            this.gridSize,
            this.GRID_GAP,
            firstPartyWidgets,
            [...this.menu, newDashboard],
            this.activeDashboard,
            this.updateSelectedDashboard,
        );
        if (card) {
            this.router.navigate([], {
                relativeTo: this.route,
                queryParams: { widgetUrl: '' },
                queryParamsHandling: 'merge',
            });
            const activeMatchingId = this.menu.findIndex(({ id }) => id === this.activeId);
            let activeIndex;

            if (activeMatchingId >= 0) {
                activeIndex = activeMatchingId;
            } else {
                this.menu.push(newDashboard);
                activeIndex = newDashboard.id;
            }
            this.cards = this.validateCards([...this.cards, card]);
            this.menu[activeIndex].cards = this.cards;
            // @ts-expect-error
            this.activeDashboard = this.cards;
            this.updatePersistedConfig();
            setTimeout(() => {
                this.activeCellIndex = this.cards.length - 1;
                this.showActive();
            });
            return true;
        }
    }

    moveDashboard(event: CdkDragDrop<string[]>): void {
        moveItemInArray(this.menu, event.previousIndex, event.currentIndex);
        this.updatePersistedConfig();
    }

    async removeDashboard(dashboardId): Promise<void> {
        const removeIndex = this.menu.findIndex(({ id }) => id === dashboardId);
        const result = await this.dialogs.confirm({
            title: 'Confirm Remove Dashboard',
            message: `Are you sure that you want to remove "${this.menu[removeIndex].dashboardName}" dashboard?`,
            footer: {
                actionLabel: 'Remove',
                cancelLabel: 'Cancel',
            },
        });
        if (!result) {
            return;
        }
        this.menu = this.menu.filter((_, index) => index !== removeIndex);

        if (dashboardId === this.activeId) {
            const dashboardToShow = this.menu[Math.min(removeIndex, this.menu.length - 1)];
            this.updateSelectedDashboard(dashboardToShow.id);
        }

        this.updatePersistedConfig();
    }

    addDashboard(): void {
        const newDashboard = new DashboardConfiguration();
        const existingNewDashboard = this.menu.find(
            ({ dashboardName, cards }) =>
                dashboardName === newDashboard.dashboardName && !cards.length,
        );
        if (!existingNewDashboard) {
            this.menu.push(newDashboard);
        }
        this.updateSelectedDashboard((existingNewDashboard || newDashboard).id);
    }

    updateSelectedSize(size: WidgetSize, card: WidgetCard): void {
        card.size = size;
        this.updatePersistedConfig();
    }

    toggleEditMode(card: WidgetCard): void {
        card.editMode = !card.editMode;
        if (!card.editMode) {
            this.updatePersistedConfig();
        }
    }

    /**
     * Handles updating dashboard configuration from user uploaded json
     */
    handleConfigUpload({ target: { files } }: any): void {
        this.cards = [];
        const settingsFile = files.item(0);
        const fileReader = new FileReader();
        fileReader.onload = e => {
            const { menu, dragEnabled, dashboardGroupName, activeId } = JSON.parse(
                fileReader.result as string,
            );
            if (!menu) {
                return;
            }
            this.updateCards(activeId, menu);
            this.dragEnabled = dragEnabled;
            this.dashboardGroupName = dashboardGroupName;
            this.pageService.pageTitle(dashboardGroupName);
            this.updatePersistedConfig();
        };
        fileReader.readAsText(settingsFile);
    }

    toggleDragEnabled(enabled): void {
        this.showSettings &&= enabled;
        this.dragEnabled = enabled;
        if (!enabled) {
            this.cards.forEach(card => {
                card.editMode = false;
            });
        }
        this.updatePersistedConfig();
    }

    drops: CdkDropList[];

    ngAfterViewInit(): void {
        this.dropsQuery.changes.pipe(startWith('')).subscribe(() => {
            this.drops = this.dropsQuery.toArray();
        });
    }

    ngOnInit(): void {
        this.route.queryParams.subscribe(({ dashboardId }) => {
            if (this.menu?.length && dashboardId && dashboardId !== this.activeId) {
                this.updateSelectedDashboard(dashboardId);
            }
        });
        this.updatePersisted$
            .pipe(
                debounceTime(250),
                switchMap(_ => this.dashboardCustomProperty.save(this.getPreparedConfig())),
                untilDestroyed(this),
            )
            .subscribe(this.updated$);
        this.getPersistedConfig();
        const date = new Date().toLocaleDateString().replace(/\//g, '_');
        this.downloadFileName = `${this.CUSTOM_PROPERTY_KEY}-${date}-settings.dsh`;
    }

    constructor(
        configService: NxConfigService,
        private cloudApi: NxCloudApiService,
        private sanitizer: DomSanitizer,
        private route: ActivatedRoute,
        private router: Router,
        private http: HttpClient,
        private dialogs: NxDialogsService,
        private toastService: NxToastService,
        private pageService: NxPageService,
        private accountService: NxAccountService,
        private cookieService: CookieService,
    ) {
        this.CONFIG = configService.config;
        this.dashboardCustomProperty = this.cloudApi.customAccountPropertyFactory(
            this.CUSTOM_PROPERTY_KEY,
            new DashboardGroup(`${this.accountService.account.first_name}'s Dashboards`),
        );
    }
}
