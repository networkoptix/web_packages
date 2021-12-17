import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, Input } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { DropdownItem } from '@components/dropdowns/generic/dropdown.component.types';
import { NxDynamicWidgetComponent } from '@components/dynamic-widget/dynamic-widget.component';
import { WidgetCard } from '@components/widgets/helper-classes';
import { NxThirdPartyWidgetComponent } from '@components/widgets/third-party/third-party-widget.component';
import { DashboardConfiguration } from '@pages/dashboard/dashboard.component';
import { NxConfigService, IConfig } from '@services/nx-config';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxProcessService, Process } from '@services/process.service';
import { delayInitial, NxUtilsService } from '@services/utils.service';

import { environment } from '../../../environments/environment';

@Component({
    selector: 'nx-modal-add-widget-content',
    templateUrl: 'add-widget.component.html',
    styleUrls: ['add-widget.component.scss']
})
export class AddWidgetModalContent {
    @Input() widgets: WidgetCard[];
    @Input() gridSize: number;
    @Input() gridGap: number;
    @Input() closable: boolean;
    @Input() dashboardMenu: DashboardConfiguration[];
    @Input() activeDashboard: DashboardConfiguration;
    @Input() updateSelectedDashboard: (id: string, dashboard: DashboardConfiguration) => void;

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

    isFirstPartyWidget = NxDynamicWidgetComponent.findWidget

    updateSelected(selected) {
        this.selectedWidget = null;
        this.cd.detectChanges();
        this.selectedWidget = NxUtilsService.deepCopy(selected);
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
        public activeModal: NgbActiveModal,
        private processService: NxProcessService,
        private cd: ChangeDetectorRef,
        private route: ActivatedRoute,
        private http: HttpClient
    ) {
        this.CONFIG = configService.config;
        this.LANG = language.translations;
    }

    downloadWidget = async (widgetUrl) => {
        // To handle cors issue when developing locally
        widgetUrl = this.environment.isLocal ? widgetUrl : widgetUrl.split(this.environment.cloudHost).reverse()[0];
        this.downloadingThirdParty = true;
        this.selectedWidget.value.config = await delayInitial(this.http.get(widgetUrl)).toPromise();
        this.downloadingThirdParty = false;
    }

    ngOnInit() {
        this.dashboardOptions = this.dashboardMenu.map(({ dashboardName: name, id: value }) => ({ name, value }));
        const { dashboardName: name, id: value } = this.activeDashboard || {};
        this.selectedDashboard = { name, value };
        const { widgetUrl } = this.route.snapshot.queryParams;
        this.widgetDropdownOptions = this.widgets.sort(({ title: a }, { title: b }) => a > b ? 1 : -1).map((widget) => ({ name: widget.title, value: { ...widget, editMode: true } }));
        if (widgetUrl) {
            this.selectedWidget = NxUtilsService.deepCopy(this.widgetDropdownOptions.find(({ name }) => name === NxThirdPartyWidgetComponent.NAME));
            this.downloadWidget(widgetUrl);
        } else {
            this.selectedWidget = NxUtilsService.deepCopy(this.widgetDropdownOptions[0]);
        }

        this.addWidget = this.processService.createProcess(
            () => new Promise((resolve) => setTimeout(resolve, 100)),
            {},
            () => this.activeModal.close(this.selectedWidget.value)
        );
    }
}
