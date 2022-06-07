import { CdkAccordionModule } from '@angular/cdk/accordion';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { OverlayModule } from '@angular/cdk/overlay';
import { PortalModule } from '@angular/cdk/portal';
import { CdkStepperModule } from '@angular/cdk/stepper';
import { CdkTableModule } from '@angular/cdk/table';
import { TextFieldModule } from '@angular/cdk/text-field';
import { CdkTreeModule } from '@angular/cdk/tree';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { NgxChartsModule } from '@swimlane/ngx-charts';
import { EditorModule, TINYMCE_SCRIPT_SRC } from '@tinymce/tinymce-angular';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { NgxFileDropModule } from 'ngx-file-drop';
import { QuicklinkModule } from 'ngx-quicklink';

import { NxTextEditableComponent } from '@components/editable/editable.component';
import { NxMonitoringGraphComponent } from '@components/graph/graph.component';
import { NxHTMLComponent } from '@components/html-input/html-input.component';
import { NxLoggerComponent } from '@components/logger/logger.component';
import { NxNumericComponent } from '@components/numeric-input/numeric.component';
import { NxPaginatorComponent } from '@components/paginator/paginator.component';
import { SharedComponentsModule } from '@components/shared-components.module';
import {
    UpdateWebadminSessionComponent
} from '@components/update-webadmin-session/update-webadmin-session.component';
import { DirectivesModule } from '@directives/directives.module';
import {
    NxImageComponent
} from '@pages/health/table-components/image/image.component';
import { PipesModule } from '@src/pipes/pipes.module';

import {
    NxAdvancedFilterComponent
} from './advanced-filter/advanced-filter.component';
import { NxApplyComponent } from './apply/apply.component';
import { NxCarouselComponent } from './carousel/carousel.component';
import { NxConsoleTableComponent } from './console-table/console-table.component';
import { NxAlertBlockComponent } from './content-block/alert/block.component';
import { NxCookieBannerComponent } from './cookie-banner/cookie-banner.component';
import { NxDevelopersMenuComponent } from './developers-menu/developers-menu.component';
import { NxAccountSettingsDropdown } from './dropdowns/account-settings/account-settings.component';
import { NxActiveSystemDropdown } from './dropdowns/active-system/active-system.component';
import {
    NxAdditionalSystemsTileComponent
} from './dropdowns/drop-menu/additional-systems-tile/additional-systems-tile.component';
import { NxDropMenu } from './dropdowns/drop-menu/drop-menu.component';
import {
    NxNavigationTileComponent
} from './dropdowns/drop-menu/navigation-tile/navigation-tile.component';
import {
    NxSystemTileComponent
} from './dropdowns/drop-menu/system-tile/system-tile.component';
import { NxGenericDropdownModule } from './dropdowns/generic/dropdown.module';
import {
    NxLanguageDropdown,
    NxHeaderLanguageDropdown
} from './dropdowns/language/language.component';
import { NxMultiSelectDropdown } from './dropdowns/multi-select/multi-select.component';
import { NxNavLocationDropdown } from './dropdowns/nav-location/nav.component';
import { NxPermissionsDropdown } from './dropdowns/permissions/permissions.component';
import { NxThreeDotDropdown } from './dropdowns/three-dot/three-dot.component';
import { NxDynamicWidgetComponent } from './dynamic-widget/dynamic-widget.component';
import { NxEditableHeading } from './editable/heading/editable-heading.component';
import { NxExternalVideoComponent } from './external-video/external-video.component';
import { NxHeaderComponent } from './header/header.component';
import { NxHeaderMainButtonComponent } from './header/main-button/main-button.component';
import { NxNavDropdownComponent } from './header/nav-dropdown/nav-dropdown.component';
import { NxHeaderLevelOneComponent } from './header/new-header/header-level-one/header-level-one.component';
import { NxHeaderLevelTwoComponent } from './header/new-header/header-level-two/header-level-two.component';
import { NxHeaderLogoAreaComponent } from './header/new-header/logo-area/logo-area.component';
import { NxMobileHeaderMenuComponent } from './header/new-header/mobile/mobile-menu/mobile-menu.component';
import { NxHeaderMobileComponent } from './header/new-header/mobile/mobile.component';
import { NxNewHeaderComponent } from './header/new-header/new-header.component';
import { NxTabsComponent } from './header/tabs/tabs.component';
import { NxInfoBlockComponent } from './info-block/info-block.component';
import { NxLandingDisplayComponent } from './landing-display/landing-display.component';
// import { NxLayoutRightComponent } from './layout-right/layout.component';
import { NxNoSystemsComponent } from './no-systems/no-systems.component';
import { NxClientButtonComponent } from './open-client-button/client-button.component';
import { NxOverlayModalComponent } from './overlay-modal/overlay-modal.component';
import { NxOpenClientSectionPlaceholderComponent } from './placeholders/open-client-section/open-client-section.component';
import { NxPagePlaceholderComponent } from './placeholders/page/page-placeholder.component';
import { NxPlayerPlaceholderComponent } from './placeholders/player/player-placeholder.component';
import { NxSectionPlaceholderComponent } from './placeholders/section/section-placeholder.component';
import { NxRibbonComponent } from './ribbon/ribbon.component';
import { NxSearchComponent } from './search/search.component';
import { NxStepperComponent } from './stepper/stepper.component';
import { NxSwitchComponent } from './switch/switch.component';
import { NxSystemsListComponent } from './systems-list/list.component';
import { NxAssetExplorerWidgetComponent } from './widgets/asset-explorer/asset-explorer-widget.component';
import { NxBookmarksWidgetComponent } from './widgets/bookmarks/bookmarks-widget.component';
import { NxEventGeneratorWidgetComponent } from './widgets/event-generator/event-generator.component';
import { NxHealthMonitorWidgetComponent } from './widgets/health-monitor/health-monitor-widget.component';
import { NxLiveViewWidgetComponent } from './widgets/live-view/live-view-widget.component';
import { NxServerLoggerWidgetComponent } from './widgets/server-logger/server-logger-widget.component';
import { NxServerMonitorWidgetComponent } from './widgets/server-monitor/server-monitor-widget.component';
import { NxSystemsListWidgetComponent } from './widgets/systems-list/systems-list-widget.component';
import { NxThirdPartyWidgetComponent } from './widgets/third-party/third-party-widget.component';

@NgModule({
    imports: [
        NgxChartsModule,
        CommonModule,
        TranslateModule,
        RouterModule,
        FormsModule,
        DirectivesModule,
        PipesModule,
        CdkStepperModule,
        AngularSvgIconModule.forRoot(),
        QuicklinkModule,
        CdkTableModule,
        CdkStepperModule,
        CdkTreeModule,
        NgxFileDropModule,
        EditorModule,
        CdkAccordionModule,
        DragDropModule,
        OverlayModule,
        TextFieldModule,
        EditorModule,
        SharedComponentsModule,
        PortalModule,

        NxGenericDropdownModule,
    ],
    declarations: [
        NxThreeDotDropdown,
        NxLanguageDropdown,
        NxHeaderLanguageDropdown,
        NxAccountSettingsDropdown,
        NxActiveSystemDropdown,
        NxNavLocationDropdown,
        NxPermissionsDropdown,
        NxMultiSelectDropdown,
        NxDropMenu,
        NxAlertBlockComponent,
        NxExternalVideoComponent,
        // NxLayoutRightComponent,
        NxCarouselComponent,
        NxRibbonComponent,
        NxSearchComponent,
        NxHeaderComponent,
        NxHeaderMainButtonComponent,
        NxLandingDisplayComponent,
        NxNumericComponent,
        NxClientButtonComponent,
        NxSwitchComponent,
        NxApplyComponent,
        NxOpenClientSectionPlaceholderComponent,
        NxPagePlaceholderComponent,
        NxSectionPlaceholderComponent,
        NxPlayerPlaceholderComponent,
        NxInfoBlockComponent,
        NxSystemTileComponent,
        NxNavigationTileComponent,
        NxAdditionalSystemsTileComponent,
        NxTabsComponent,
        NxNavDropdownComponent,
        NxOverlayModalComponent,
        NxDevelopersMenuComponent,
        NxImageComponent,
        NxEditableHeading,
        NxPaginatorComponent,
        NxHTMLComponent,
        NxCookieBannerComponent,
        NxAdvancedFilterComponent,
        NxConsoleTableComponent,
        NxDynamicWidgetComponent,
        NxHealthMonitorWidgetComponent,
        NxAssetExplorerWidgetComponent,
        NxThirdPartyWidgetComponent,
        NxLiveViewWidgetComponent,
        NxBookmarksWidgetComponent,
        NxSystemsListComponent,
        NxNoSystemsComponent,
        NxSystemsListWidgetComponent,
        NxEventGeneratorWidgetComponent,
        NxTextEditableComponent,
        NxStepperComponent,
        NxLoggerComponent,
        NxMonitoringGraphComponent,
        UpdateWebadminSessionComponent,
        NxServerMonitorWidgetComponent,
        NxServerLoggerWidgetComponent,
        NxHeaderLevelOneComponent,
        NxHeaderLevelTwoComponent,
        NxNewHeaderComponent,
        NxHeaderMobileComponent,
        NxHeaderLogoAreaComponent,
        NxMobileHeaderMenuComponent
    ],
    providers: [
        { provide: TINYMCE_SCRIPT_SRC, useValue: 'static/tinymce/tinymce.min.js' },
        NxAlertBlockComponent,
        // NxLayoutRightComponent,
        NxCarouselComponent,
        NxRibbonComponent,
        NxSearchComponent,
        NxHeaderComponent,
        NxHeaderMainButtonComponent,
        NxLandingDisplayComponent,
        NxNumericComponent,
        NxClientButtonComponent,
        NxSwitchComponent,
        NxApplyComponent,
        NxOpenClientSectionPlaceholderComponent,
        NxPagePlaceholderComponent,
        NxSectionPlaceholderComponent,
        NxPlayerPlaceholderComponent,
        NxInfoBlockComponent,
        NxOverlayModalComponent,
        NxDevelopersMenuComponent,
        NxImageComponent,
        NxEditableHeading,
        NxPaginatorComponent,
        NxHTMLComponent,
        NxAdvancedFilterComponent,
        NxConsoleTableComponent,
        NxDynamicWidgetComponent,
        NxHealthMonitorWidgetComponent,
        NxAssetExplorerWidgetComponent,
        NxThirdPartyWidgetComponent,
        NxLiveViewWidgetComponent,
        NxBookmarksWidgetComponent,
        NxSystemsListComponent,
        NxNoSystemsComponent,
        NxSystemsListWidgetComponent,
        NxEventGeneratorWidgetComponent,
        NxTextEditableComponent,
        NxStepperComponent,
        NxLoggerComponent,
        NxMonitoringGraphComponent,
        UpdateWebadminSessionComponent,
        NxServerMonitorWidgetComponent,
        NxServerLoggerWidgetComponent
    ],
    exports: [
        QuicklinkModule,
        NxThreeDotDropdown,
        NxGenericDropdownModule,
        NxLanguageDropdown,
        NxHeaderLanguageDropdown,
        NxAccountSettingsDropdown,
        NxActiveSystemDropdown,
        NxNavLocationDropdown,
        NxPermissionsDropdown,
        NxMultiSelectDropdown,
        NxDropMenu,
        NxAlertBlockComponent,
        NxExternalVideoComponent,
        // NxLayoutRightComponent,
        NxCarouselComponent,
        NxRibbonComponent,
        NxSearchComponent,
        NxHeaderComponent,
        NxHeaderMainButtonComponent,
        NxLandingDisplayComponent,
        NxNumericComponent,
        NxClientButtonComponent,
        NxSwitchComponent,
        NxApplyComponent,
        NxOpenClientSectionPlaceholderComponent,
        NxPagePlaceholderComponent,
        NxSectionPlaceholderComponent,
        NxPlayerPlaceholderComponent,
        NxInfoBlockComponent,
        NxSystemTileComponent,
        NxNavigationTileComponent,
        NxAdditionalSystemsTileComponent,
        NxNavDropdownComponent,
        NxOverlayModalComponent,
        NxDevelopersMenuComponent,
        NxImageComponent,
        NxEditableHeading,
        NxPaginatorComponent,
        NxHTMLComponent,
        NxCookieBannerComponent,
        NxAdvancedFilterComponent,
        NxConsoleTableComponent,
        NxDynamicWidgetComponent,
        NxHealthMonitorWidgetComponent,
        NxAssetExplorerWidgetComponent,
        NxThirdPartyWidgetComponent,
        NxLiveViewWidgetComponent,
        NxBookmarksWidgetComponent,
        NxSystemsListComponent,
        NxNoSystemsComponent,
        NxSystemsListWidgetComponent,
        NxEventGeneratorWidgetComponent,
        NxTextEditableComponent,
        NxStepperComponent,
        NxLoggerComponent,
        SharedComponentsModule,
        CdkStepperModule,
        TextFieldModule,
        NxMonitoringGraphComponent,
        UpdateWebadminSessionComponent,
        NxServerMonitorWidgetComponent,
        NxServerLoggerWidgetComponent,
    ]
})
export class ComponentsModule {
}
