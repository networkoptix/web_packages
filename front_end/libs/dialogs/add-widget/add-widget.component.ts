import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, Inject, Input, LOCALE_ID } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { cloneDeep, last } from 'lodash-es';
import { CookieService } from 'ngx-cookie-service';

import { DropdownItem } from '@components/dropdowns/generic/dropdown.component.types';
import { NxGenericDropdownModule } from '@components/dropdowns/generic/dropdown.module';
import { NxDynamicWidgetComponent } from '@components/dynamic-widget/dynamic-widget.component';
import { NxProcessButtonComponent } from '@components/process-button/process-button.component';
import { NxProcessCancelButtonComponent } from '@components/process-cancel-Button/process-cancel-button.component';
import { WidgetCard } from '@components/widgets/helper-classes';
import { NxThirdPartyWidgetComponent } from '@components/widgets/third-party/third-party-widget.component';
import { environment } from '@environments/environment';
import staticLang from '@language_static';
import { DashboardConfiguration } from '@pages/dashboard/dashboard-configuration';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';
import { icons } from '@static-variables';
import { assignFrom, delayInitial, alphabeticalSort } from '@utils/general';

type WidgetDropdownItem = DropdownItem<WidgetCard>;
type DashboardDropdownItem = DropdownItem<string>;

@Component({
    selector: 'nx-modal-add-widget-content',
    templateUrl: 'add-widget.component.html',
    styleUrls: ['add-widget.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        TranslateModule,
        AngularSvgIconModule,

        NxGenericDropdownModule,
        NxDynamicWidgetComponent,
        NxProcessButtonComponent,
        NxProcessCancelButtonComponent,
    ],
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
    selectedWidget: WidgetDropdownItem;
    dashboardOptions: DashboardDropdownItem[];
    selectedDashboard: DashboardDropdownItem;

    widgetDropdownOptions: WidgetDropdownItem[];

    LANG = staticLang;
    CONFIG: IConfig;

    downloadingThirdParty = false;
    icons = icons;
    readonly environment = environment;

    updateSize(size): void {
        this.selectedWidget.value.size = size;
    }

    isFirstPartyWidget = NxDynamicWidgetComponent.findWidget;

    updateSelected(selected: WidgetDropdownItem): void {
        this.selectedWidget = null;
        this.cd.detectChanges();
        this.selectedWidget = cloneDeep(selected);
    }

    findDashboard(dashboardId: string): DashboardConfiguration {
        return this.dashboardMenu.find(({ id }) => id === dashboardId);
    }

    toggleEditMode(card: WidgetCard): void {
        card.editMode = !card.editMode;
    }

    constructor(
        configService: NxConfigService,
        private processService: NxProcessService,
        private cd: ChangeDetectorRef,
        private route: ActivatedRoute,
        private http: HttpClient,
        private dialogRef: DialogRef,
        @Inject(DIALOG_DATA) private dialogData: any,
        private cookieService: CookieService,
        @Inject(LOCALE_ID) private locale: string,
    ) {
        this.CONFIG = configService.config;
    }

    downloadWidget = async (widgetUrl, isDevServer = false): Promise<void> => {
        // To handle cors issue when developing locally
        widgetUrl = this.environment.isLocal
            ? widgetUrl
            : last(widgetUrl.split(this.environment.cloudHost));
        const devSource = `${widgetUrl}/widget.html`;
        const devEditSource = `${widgetUrl}/edit.html`;
        this.downloadingThirdParty = true;
        if (isDevServer) {
            Object.assign(this.selectedWidget.value.config, {
                editMode: false,
                devSource,
                devEditSource,
            });
        } else {
            this.selectedWidget.value.config = (await delayInitial(
                this.http.get(widgetUrl),
            ).toPromise()) as Record<string, unknown>;
        }
        this.downloadingThirdParty = false;
    };

    ngOnInit(): void {
        assignFrom(
            this.dialogData,
            [
                'widgets',
                'gridSize',
                'gridGap',
                'dashboardMenu',
                'activeDashboard',
                'updateSelectedDashboard',
            ],
            this,
        );

        this.dashboardOptions = this.dashboardMenu.map(({ dashboardName: name, id: value }) => ({
            name,
            value,
        }));
        const { dashboardName: name, id: value } = this.activeDashboard || {};
        this.selectedDashboard = { name, value };
        const { widgetUrl, devServer = this.cookieService.get('devServer') } =
            this.route.snapshot.queryParams;
        this.widgetDropdownOptions = this.widgets
            .sort(alphabeticalSort(this.locale, w => w.title))
            .map(widget => ({ name: widget.title, value: { ...widget, editMode: true } }));
        if (widgetUrl || devServer) {
            this.selectedWidget = cloneDeep(
                this.widgetDropdownOptions.find(
                    ({ name }) => name === NxThirdPartyWidgetComponent.NAME,
                ),
            );
            this.downloadWidget(devServer || widgetUrl, !!devServer);
        } else {
            this.selectedWidget = cloneDeep(this.widgetDropdownOptions[0]);
        }

        this.addWidget = this.processService.createProcess(
            () => new Promise(resolve => setTimeout(resolve, 100)),
            {},
            () => this.close(this.selectedWidget.value),
        );
    }

    close = (msg?: WidgetCard): void => {
        this.dialogRef.close(msg);
    };
}
