import { CdkStepperModule } from '@angular/cdk/stepper';
import { CdkTableModule } from '@angular/cdk/table';
import { TextFieldModule } from '@angular/cdk/text-field';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgbModule, NgbToastModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { EditorModule, TINYMCE_SCRIPT_SRC } from '@tinymce/tinymce-angular';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { QuicklinkModule } from 'ngx-quicklink';

import { NxTextEditableComponent } from '@components/editable/editable.component';
import { NxHTMLComponent } from '@components/html-input/html-input.component';
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
import { NxContentBlockComponent } from './content-block/content-block.component';
import { NxContentBlockSectionComponent } from './content-block/section/section.component';
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
import { NxGenericDropdown } from './dropdowns/generic/dropdown.component';
import {
    NxLanguageDropdown,
    NxHeaderLanguageDropdown
} from './dropdowns/language/language.component';
import { NxMultiSelectDropdown } from './dropdowns/multi-select/multi-select.component';
import { NxNavLocationDropdown } from './dropdowns/nav-location/nav.component';
import { NxPermissionsDropdown } from './dropdowns/permissions/permissions.component';
import { NxThreeDotDropdown } from './dropdowns/three-dot/three-dot.component';
import { NxEditableHeading } from './editable/heading/editable-heading.component';
import { NxExternalVideoComponent } from './external-video/external-video.component';
import { NxFooterComponent } from './footer/footer.component';
import { NxHeaderComponent } from './header/header.component';
import { NxHeaderMainButtonComponent } from './header/main-button/main-button.component';
import { NxNavDropdownComponent } from './header/nav-dropdown/nav-dropdown.component';
import { NxTabsComponent } from './header/tabs/tabs.component';
import { NxInfoBlockComponent } from './info-block/info-block.component';
import { NxLandingDisplayComponent } from './landing-display/landing-display.component';
// import { NxLayoutRightComponent } from './layout-right/layout.component';
import { NxClientButtonComponent } from './open-client-button/client-button.component';
import { NxOverlayModalComponent } from './overlay-modal/overlay-modal.component';
import { NxPagePlaceholderComponent } from './placeholders/page/page-placeholder.component';
import { NxPlayerPlaceholderComponent } from './placeholders/player/player-placeholder.component';
import { NxSectionPlaceholderComponent } from './placeholders/section/section-placeholder.component';
import { NxRadioComponent } from './radio/radio.component';
import { NxRibbonComponent } from './ribbon';
import { NxSearchComponent } from './search/search.component';
import { NxStepperComponent } from './stepper/stepper.component';
import { NxSwitchComponent } from './switch/switch.component';
import { ToastsContainer } from './toast/toast.component';
import { NxVendorListComponent } from './vendor-list/vendor-list.component';

@NgModule({
    imports: [
        CommonModule,
        TranslateModule,
        RouterModule,
        FormsModule,
        NgbToastModule,
        NgbModule,
        DirectivesModule,
        PipesModule,
        CdkStepperModule,
        AngularSvgIconModule.forRoot(),
        QuicklinkModule,
        CdkTableModule,
        TextFieldModule,
        EditorModule,
        SharedComponentsModule
    ],
    declarations: [
        NxThreeDotDropdown,
        NxGenericDropdown,
        NxLanguageDropdown,
        NxHeaderLanguageDropdown,
        NxAccountSettingsDropdown,
        NxActiveSystemDropdown,
        NxNavLocationDropdown,
        NxPermissionsDropdown,
        NxMultiSelectDropdown,
        NxDropMenu,
        NxRadioComponent,
        NxAlertBlockComponent,
        NxContentBlockComponent,
        NxContentBlockSectionComponent,
        NxExternalVideoComponent,
        // NxLayoutRightComponent,
        NxCarouselComponent,
        NxRibbonComponent,
        NxVendorListComponent,
        NxSearchComponent,
        NxHeaderComponent,
        NxHeaderMainButtonComponent,
        NxFooterComponent,
        NxLandingDisplayComponent,
        NxNumericComponent,
        NxClientButtonComponent,
        NxSwitchComponent,
        NxApplyComponent,
        NxPagePlaceholderComponent,
        NxSectionPlaceholderComponent,
        NxPlayerPlaceholderComponent,
        NxInfoBlockComponent,
        ToastsContainer,
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
        NxTextEditableComponent,
        NxStepperComponent,
        UpdateWebadminSessionComponent
    ],
    providers: [
        { provide: TINYMCE_SCRIPT_SRC, useValue: 'static/tinymce/tinymce.min.js' },
        NxRadioComponent,
        NxAlertBlockComponent,
        NxContentBlockComponent,
        NxContentBlockSectionComponent,
        // NxLayoutRightComponent,
        NxCarouselComponent,
        NxRibbonComponent,
        NxVendorListComponent,
        NxSearchComponent,
        NxHeaderComponent,
        NxHeaderMainButtonComponent,
        NxFooterComponent,
        NxLandingDisplayComponent,
        NxNumericComponent,
        NxClientButtonComponent,
        NxSwitchComponent,
        NxApplyComponent,
        NxPagePlaceholderComponent,
        NxSectionPlaceholderComponent,
        NxPlayerPlaceholderComponent,
        ToastsContainer,
        NxInfoBlockComponent,
        NxOverlayModalComponent,
        NxDevelopersMenuComponent,
        NxImageComponent,
        NxEditableHeading,
        NxPaginatorComponent,
        NxHTMLComponent,
        NxAdvancedFilterComponent,
        NxConsoleTableComponent,
        NxTextEditableComponent,
        NxStepperComponent,
        UpdateWebadminSessionComponent
    ],
    exports: [
        QuicklinkModule,
        NxThreeDotDropdown,
        NxGenericDropdown,
        NxLanguageDropdown,
        NxHeaderLanguageDropdown,
        NxAccountSettingsDropdown,
        NxActiveSystemDropdown,
        NxNavLocationDropdown,
        NxPermissionsDropdown,
        NxMultiSelectDropdown,
        NxDropMenu,
        NxRadioComponent,
        NxAlertBlockComponent,
        NxContentBlockComponent,
        NxContentBlockSectionComponent,
        NxExternalVideoComponent,
        // NxLayoutRightComponent,
        NxCarouselComponent,
        NxRibbonComponent,
        NxVendorListComponent,
        NxSearchComponent,
        NxHeaderComponent,
        NxHeaderMainButtonComponent,
        NxFooterComponent,
        NxLandingDisplayComponent,
        NxNumericComponent,
        NxClientButtonComponent,
        NxSwitchComponent,
        NxApplyComponent,
        NxPagePlaceholderComponent,
        NxSectionPlaceholderComponent,
        NxPlayerPlaceholderComponent,
        ToastsContainer,
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
        NxTextEditableComponent,
        NxStepperComponent,
        SharedComponentsModule,
        CdkStepperModule,
        TextFieldModule,
        UpdateWebadminSessionComponent
    ]
})
export class ComponentsModule {
}
