import { NgModule }                       from '@angular/core';
import { CommonModule }                   from '@angular/common';
import { TranslateModule }                from '@ngx-translate/core';
import { RouterModule }                   from '@angular/router';
import { FormsModule }                    from '@angular/forms';
import { NgbModule, NgbToastModule }      from '@ng-bootstrap/ng-bootstrap';
import { DirectivesModule }               from '../directives/directives.module';
import { NxProcessButtonComponent }       from './process-button/process-button.component';
import { NxPreLoaderComponent }           from './pre-loader/pre-loader.component';
import { NxCheckboxComponent }            from './checkbox/checkbox.component';
import { NxRadioComponent }               from './radio/radio.component';
import { MenuModule }                     from './menu/menu.module';
import { NxAlertBlockComponent }          from './content-block/alert/block.component';
import { NxContentBlockComponent }        from './content-block/content-block.component';
import { NxContentBlockSectionComponent } from './content-block/section/section.component';
import { NxMultiLineEllipsisComponent }   from './multi-line-ellipsis/mle.component';
import { NxExternalVideoComponent }       from './external-video/external-video.component';
import { NxLayoutRightComponent }         from './layout-right/layout.component';
import { NxTagComponent }                 from './tag/tag.component';
import { NxCarouselComponent }            from './carousel/carousel.component';
import { NxRibbonComponent }              from './ribbon/ribbon.component';
import { NxRibbonService }                from './ribbon/ribbon.service';
import { NxVendorListComponent }          from './vendor-list/vendor-list.component';
import { NxSearchComponent }              from './search/search.component';
import { NxFooterComponent }              from './footer/footer.component';
import { NxGenericDropdown }              from './dropdowns/generic/dropdown.component';
import { NxLanguageDropdown }             from './dropdowns/language/language.component';
import { NxAccountSettingsDropdown }      from './dropdowns/account-settings/account-settings.component';
import { NxActiveSystemDropdown }         from './dropdowns/active-system/active-system.component';
import { NxSystemsDropdown }              from './dropdowns/systems/systems.component';
import { NxPermissionsDropdown }          from './dropdowns/permissions/permissions.component';
import { NxMultiSelectDropdown }          from './dropdowns/multi-select/multi-select.component';
import { NxLandingDisplayComponent }      from './landing-display/landing-display.component';
import { NxPasswordComponent }            from './password-input/password.component';
import { NxPasswordValidationComponent }    from './password-input-validation/password-validation.component';
import { NxEmailComponent }                 from './email-input/email.component';
import { NxClientButtonComponent }          from './open-client-button/client-button.component';
import { NxSwitchComponent }                from './switch/switch.component';
import { ToastsContainer }                  from './toast/toast.component';
import { NxHeaderComponent }                from './header/header.component';
import { NxNavLocationDropdown }            from './dropdowns/nav-location/nav.component';
import { NxApplyComponent }                 from './apply/apply.component';
import { NxPagePlaceholderComponent }       from './placeholders/page/page-placeholder.component';
import { NxAjsPagePlaceholderComponent }    from './placeholders/ajs-page/page-placeholder.component';
import { NxSectionPlaceholderComponent }    from './placeholders/section/section-placeholder.component';
import { AngularSvgIconModule }             from 'angular-svg-icon';
import { NxPasswordTagValidationComponent } from './password-input-tag-validation/password-tag-validation.component';
import { downgradeComponent }               from '@angular/upgrade/static';

@NgModule({
    imports: [
        CommonModule,
        DirectivesModule,
        TranslateModule,
        RouterModule,
        FormsModule,
        MenuModule,
        NgbToastModule,
        NgbModule,
        AngularSvgIconModule.forRoot()
    ],
    declarations: [
        NxGenericDropdown,
        NxLanguageDropdown,
        NxAccountSettingsDropdown,
        NxActiveSystemDropdown,
        NxNavLocationDropdown,
        NxSystemsDropdown,
        NxPermissionsDropdown,
        NxMultiSelectDropdown,
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
        NxAjsPagePlaceholderComponent,
        NxSectionPlaceholderComponent,
        ToastsContainer
    ],
    entryComponents: [
        NxGenericDropdown,
        NxLanguageDropdown,
        NxAccountSettingsDropdown,
        NxActiveSystemDropdown,
        NxNavLocationDropdown,
        NxSystemsDropdown,
        NxPermissionsDropdown,
        NxMultiSelectDropdown,
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
        NxAjsPagePlaceholderComponent,
        NxSectionPlaceholderComponent,
        ToastsContainer
    ],
    providers: [
        NxProcessButtonComponent,
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
        NxAjsPagePlaceholderComponent,
        NxSectionPlaceholderComponent,
        ToastsContainer,

        NxRibbonService
    ],
    exports: [
        NxGenericDropdown,
        NxLanguageDropdown,
        NxAccountSettingsDropdown,
        NxActiveSystemDropdown,
        NxNavLocationDropdown,
        NxSystemsDropdown,
        NxPermissionsDropdown,
        NxMultiSelectDropdown,
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
        NxAjsPagePlaceholderComponent,
        NxSectionPlaceholderComponent,
        ToastsContainer,

        MenuModule
    ]
})
export class ComponentsModule {
}

declare var angular: angular.IAngularStatic;
angular
    .module('cloudApp.directives')
    .directive('nxAjsPagePlaceholder', downgradeComponent({ component: NxAjsPagePlaceholderComponent }) as angular.IDirectiveFactory);
