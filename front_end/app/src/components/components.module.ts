import { NgModule }                           from '@angular/core';
import { CommonModule }                       from '@angular/common';
import { TranslateModule }                    from '@ngx-translate/core';
import { RouterModule }                       from '@angular/router';
import { FormsModule }                        from '@angular/forms';
import { NgbModule, NgbToastModule }          from '@ng-bootstrap/ng-bootstrap';
import { DirectivesModule }                   from '../directives/directives.module';
import { NxProcessButtonComponent }           from './process-button/process-button.component';
import { NxCheckboxComponent }                from './checkbox/checkbox.component';
import { NxRadioComponent }                   from './radio/radio.component';
import { NxAlertBlockComponent }              from './content-block/alert/block.component';
import { NxContentBlockComponent }            from './content-block/content-block.component';
import { NxContentBlockSectionComponent }     from './content-block/section/section.component';
import { NxMultiLineEllipsisComponent }       from './multi-line-ellipsis/mle.component';
import { NxExternalVideoComponent }           from './external-video/external-video.component';
import { NxLayoutRightComponent }             from './layout-right/layout.component';
import { NxTagComponent }                     from './tag/tag.component';
import { NxCarouselComponent }                from './carousel/carousel.component';
import { NxRibbonComponent, NxRibbonService } from './ribbon';
import { NxVendorListComponent }              from './vendor-list/vendor-list.component';
import { NxSearchComponent }                  from './search/search.component';
import { NxFooterComponent }                  from './footer/footer.component';
import { NxGenericDropdown }                  from './dropdowns/generic/dropdown.component';
import { NxLanguageDropdown }                 from './dropdowns/language/language.component';
import { NxAccountSettingsDropdown }          from './dropdowns/account-settings/account-settings.component';
import { NxActiveSystemDropdown }             from './dropdowns/active-system/active-system.component';
import { NxSystemsDropdown }                  from './dropdowns/systems/systems.component';
import { NxPermissionsDropdown }              from './dropdowns/permissions/permissions.component';
import { NxMultiSelectDropdown }              from './dropdowns/multi-select/multi-select.component';
import { NxLandingDisplayComponent }          from './landing-display/landing-display.component';
import { NxPasswordComponent }                from './password-input/password.component';
import { NxPasswordValidationComponent }      from './password-input-validation/password-validation.component';
import { NxEmailComponent }                   from './email-input/email.component';
import { NxClientButtonComponent }            from './open-client-button/client-button.component';
import { NxSwitchComponent }                  from './switch/switch.component';
import { ToastsContainer }                    from './toast/toast.component';
import { NxHeaderComponent }                  from './header/header.component';
import { NxNavLocationDropdown }              from './dropdowns/nav-location/nav.component';
import { NxApplyComponent }                   from './apply/apply.component';
import { NxPreLoaderComponent }               from './placeholders/pre-loader/pre-loader.component';
import { NxPagePlaceholderComponent }         from './placeholders/page/page-placeholder.component';
import { NxSectionPlaceholderComponent }      from './placeholders/section/section-placeholder.component';
import { AngularSvgIconModule }               from 'angular-svg-icon';
import { NxPasswordTagValidationComponent }   from './password-input-tag-validation/password-tag-validation.component';
import { NxThreeDotDropdown }                 from './dropdowns/three-dot/three-dot.component';
import { NxProcessCancelButtonComponent } from './process-cancel-Button/process-cancel-button.component';
import { NxDropMenu } from './dropdowns/drop-menu/drop-menu.component';
import { NxHeaderMainButtonComponent } from './header/main-button/main-button.component';
import { NxSystemTileComponent } from './dropdowns/drop-menu/system-tile/system-tile.component';
import { NxNavigiationTileComponent } from './dropdowns/drop-menu/navigation-tile/navigation-tile.component';
import { NxAdditionalSystemsTileComponent } from './dropdowns/drop-menu/additional-systems-tile/additional-systems-tile.component';
import { NxTabsComponent } from './header/tabs/tabs.component';
import { NxNavDropdownComponent } from './header/nav-dropdown/nav-dropdown.component';

@NgModule({
    imports: [
        CommonModule,
        TranslateModule,
        RouterModule,
        FormsModule,
        NgbToastModule,
        NgbModule,
        DirectivesModule,
        AngularSvgIconModule.forRoot()
    ],
    declarations: [
        NxThreeDotDropdown,
        NxGenericDropdown,
        NxLanguageDropdown,
        NxAccountSettingsDropdown,
        NxActiveSystemDropdown,
        NxNavLocationDropdown,
        NxSystemsDropdown,
        NxPermissionsDropdown,
        NxMultiSelectDropdown,
        NxDropMenu,
        NxProcessButtonComponent,
        NxProcessCancelButtonComponent,
        NxPreLoaderComponent,
        NxCheckboxComponent,
        NxRadioComponent,
        NxAlertBlockComponent,
        NxContentBlockComponent,
        NxContentBlockSectionComponent,
        NxMultiLineEllipsisComponent,
        NxExternalVideoComponent,
        NxLayoutRightComponent,
        NxTagComponent,
        NxCarouselComponent,
        NxRibbonComponent,
        NxVendorListComponent,
        NxSearchComponent,
        NxHeaderComponent,
        NxHeaderMainButtonComponent,
        NxFooterComponent,
        NxLandingDisplayComponent,
        NxPasswordComponent,
        NxPasswordValidationComponent,
        NxPasswordTagValidationComponent,
        NxEmailComponent,
        NxClientButtonComponent,
        NxSwitchComponent,
        NxApplyComponent,
        NxPagePlaceholderComponent,
        NxSectionPlaceholderComponent,
        ToastsContainer,
        NxSystemTileComponent,
        NxNavigiationTileComponent,
        NxAdditionalSystemsTileComponent,
        NxTabsComponent,
        NxNavDropdownComponent
    ],
    entryComponents: [
        NxThreeDotDropdown,
        NxGenericDropdown,
        NxLanguageDropdown,
        NxAccountSettingsDropdown,
        NxActiveSystemDropdown,
        NxNavLocationDropdown,
        NxSystemsDropdown,
        NxPermissionsDropdown,
        NxMultiSelectDropdown,
        NxDropMenu,
        NxProcessButtonComponent,
        NxPreLoaderComponent,
        NxCheckboxComponent,
        NxRadioComponent,
        NxAlertBlockComponent,
        NxContentBlockComponent,
        NxContentBlockSectionComponent,
        NxMultiLineEllipsisComponent,
        NxExternalVideoComponent,
        NxLayoutRightComponent,
        NxTagComponent,
        NxCarouselComponent,
        NxRibbonComponent,
        NxVendorListComponent,
        NxSearchComponent,
        NxHeaderComponent,
        NxHeaderMainButtonComponent,
        NxFooterComponent,
        NxLandingDisplayComponent,
        NxPasswordComponent,
        NxPasswordValidationComponent,
        NxPasswordTagValidationComponent,
        NxEmailComponent,
        NxClientButtonComponent,
        NxSwitchComponent,
        NxApplyComponent,
        NxPagePlaceholderComponent,
        NxSectionPlaceholderComponent,
        ToastsContainer,
        NxSystemTileComponent,
        NxNavigiationTileComponent,
        NxAdditionalSystemsTileComponent,
        NxProcessButtonComponent,
        NxProcessCancelButtonComponent
    ],
    providers: [
        NxProcessButtonComponent,
        NxProcessCancelButtonComponent,
        NxPreLoaderComponent,
        NxCheckboxComponent,
        NxRadioComponent,
        NxAlertBlockComponent,
        NxContentBlockComponent,
        NxContentBlockSectionComponent,
        NxMultiLineEllipsisComponent,
        NxLayoutRightComponent,
        NxTagComponent,
        NxCarouselComponent,
        NxRibbonComponent,
        NxVendorListComponent,
        NxSearchComponent,
        NxHeaderComponent,
        NxHeaderMainButtonComponent,
        NxFooterComponent,
        NxLandingDisplayComponent,
        NxPasswordComponent,
        NxPasswordValidationComponent,
        NxPasswordTagValidationComponent,
        NxEmailComponent,
        NxClientButtonComponent,
        NxSwitchComponent,
        NxApplyComponent,
        NxPagePlaceholderComponent,
        NxSectionPlaceholderComponent,
        ToastsContainer,
        NxRibbonService
    ],
    exports: [
        NxThreeDotDropdown,
        NxGenericDropdown,
        NxLanguageDropdown,
        NxAccountSettingsDropdown,
        NxActiveSystemDropdown,
        NxNavLocationDropdown,
        NxSystemsDropdown,
        NxPermissionsDropdown,
        NxMultiSelectDropdown,
        NxDropMenu,
        NxProcessButtonComponent,
        NxProcessCancelButtonComponent,
        NxPreLoaderComponent,
        NxCheckboxComponent,
        NxRadioComponent,
        NxAlertBlockComponent,
        NxContentBlockComponent,
        NxContentBlockSectionComponent,
        NxMultiLineEllipsisComponent,
        NxExternalVideoComponent,
        NxLayoutRightComponent,
        NxTagComponent,
        NxCarouselComponent,
        NxRibbonComponent,
        NxVendorListComponent,
        NxSearchComponent,
        NxHeaderComponent,
        NxHeaderMainButtonComponent,
        NxFooterComponent,
        NxLandingDisplayComponent,
        NxPasswordComponent,
        NxPasswordValidationComponent,
        NxPasswordTagValidationComponent,
        NxEmailComponent,
        NxClientButtonComponent,
        NxSwitchComponent,
        NxApplyComponent,
        NxPagePlaceholderComponent,
        NxSectionPlaceholderComponent,
        ToastsContainer,
        NxSystemTileComponent,
        NxNavigiationTileComponent,
        NxAdditionalSystemsTileComponent,
        NxNavDropdownComponent
    ]
})
export class ComponentsModule {
}
