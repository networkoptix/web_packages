import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, Inject, Input } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { cloneDeep, last } from 'lodash-es';
import { CookieService } from 'ngx-cookie-service';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { DropdownItem } from '@components/dropdowns/generic/dropdown.component.types';
import { NxDynamicWidgetComponent } from '@components/dynamic-widget/dynamic-widget.component';
import { WidgetCard } from '@components/widgets/helper-classes';
import { NxThirdPartyWidgetComponent } from '@components/widgets/third-party/third-party-widget.component';
import { DIALOG_DATA, DialogRef } from '@dialogs/dialog-ref';
import { environment } from '@environments/environment';
import { DashboardConfiguration } from '@pages/dashboard/dashboard.component';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxProcessService, Process } from '@services/process.service';
import { pickFrom, delayInitial } from '@utils/general';

@Component({
    selector: 'nx-modal-add-widget-content',
    templateUrl: 'add-widget.component.html',
    styleUrls: ['add-widget.component.scss']
})
export class AddWidgetModalContent {
    @Input() closable: boolean = true;

    widgets: WidgetCard[];
    gridSize: number;
    gridGap: number;
    dashboardMenu: DashboardConfiguration[];
    activeDashboard: DashboardConfiguration;
    updateSelectedDashboard: (id: string, dashboard: DashboardConfiguration) => void;

    addWidget: Process;
    selectedWidget: DropdownItem<WidgetCard>;
    dashboardOptions: DropdownItem<string>[];
    selectedDashboard: DropdownItem<string>;

    widgetDropdownOptions: DropdownItem<WidgetCard>[];

    LANG: LanguageI18NStaticTypes;
    CONFIG: IConfig;

    downloadingThirdParty = false;
    readonly environment = environment;

    updateSize(size) {
        this.selectedWidget.value.size = size;
    }

    isFirstPartyWidget = NxDynamicWidgetComponent.findWidget;

    updateSelected(selected) {
        this.selectedWidget = null;
        this.cd.detectChanges();
        this.selectedWidget = cloneDeep(selected);
    }

    findDashboard(dashboardId) {
        return this.dashboardMenu.find(({ id }) => id === dashboardId);
    }

    toggleEditMode(card: WidgetCard) {
        card.editMode = !card.editMode;
    }

    constructor(
        configService: NxConfigService,
        language: NxLanguageProviderService,
        private processService: NxProcessService,
        private cd: ChangeDetectorRef,
        private route: ActivatedRoute,
        private http: HttpClient,
        private dialogRef: DialogRef,
        @Inject(DIALOG_DATA) private dialogData: any,
        private cookieService: CookieService
    ) {
        this.CONFIG = configService.config;
        this.LANG = language.translations;
    }

    downloadWidget = async (widgetUrl, isDevServer = false) => {
        // To handle cors issue when developing locally
        widgetUrl = this.environment.isLocal ? widgetUrl : last(widgetUrl.split(this.environment.cloudHost));
        const devSource = `${widgetUrl}/widget.html`;
        const devEditSource = `${widgetUrl}/edit.html`;
        this.downloadingThirdParty = true;
        if (isDevServer) {
            Object.assign(this.selectedWidget.value.config, { editMode: false, devSource, devEditSource });
        } else {
            this.selectedWidget.value.config = await delayInitial(this.http.get(widgetUrl)).toPromise();
        }
        this.downloadingThirdParty = false;
    };

    ngOnInit() {
        pickFrom(
            this.dialogData,
            [
                'widgets',
                'gridSize',
                'gridGap',
                'dashboardMenu',
                'activeDashboard',
                'updateSelectedDashboard',
            ],
            this
        );

        this.dashboardOptions = this.dashboardMenu.map(({ dashboardName: name, id: value }) => ({ name, value }));
        const { dashboardName: name, id: value } = this.activeDashboard || {};
        this.selectedDashboard = { name, value };
        const { widgetUrl, devServer = this.cookieService.get('devServer') } = this.route.snapshot.queryParams;
        this.widgetDropdownOptions = this.widgets.sort(({ title: a }, { title: b }) => a > b ? 1 : -1).map(widget => ({ name: widget.title, value: { ...widget, editMode: true } }));
        if (widgetUrl || devServer) {
            this.selectedWidget = cloneDeep(this.widgetDropdownOptions.find(({ name }) => name === NxThirdPartyWidgetComponent.NAME));
            this.downloadWidget(devServer || widgetUrl, !!devServer);
        } else {
            this.selectedWidget = cloneDeep(this.widgetDropdownOptions[0]);
        }

        this.addWidget = this.processService.createProcess(
            () => new Promise(resolve => setTimeout(resolve, 100)),
            {},
            () => this.close(this.selectedWidget.value)
        );
    }

    close = (msg?: WidgetCard) => {
        this.dialogRef.close(msg);
    };
}
