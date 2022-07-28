import { NgModule } from '@angular/core';

import { ApplyModule } from './apply/apply.module';
import { CarouselModule } from './carousel/carousel.module';
import { CheckboxModule } from './checkbox/checkbox.module';
import { AlertBlockModule } from './content-block/alert/block.module';
import { ContentBlockModule } from './content-block/content-block.module';
import { ContentBlockSectionModule } from './content-block/section/section.module';
import { CookieBannerModule } from './cookie-banner/cookie-banner.module';
import { AccountSettingsModule } from './dropdowns/account-settings/account-settings.module';
import { ActiveSystemModule } from './dropdowns/active-system/active-system.module';
import { AdditionalSystemsTileModule } from './dropdowns/drop-menu/additional-systems-tile/additional-systems-tile.module';
import { DropMenuModule } from './dropdowns/drop-menu/drop-menu.module';
// import { LayoutRightModule } from './layout-right/layout.module'; - This was commented out previously in components.module.ts before this module change
import { NavigationTileModule } from './dropdowns/drop-menu/navigation-tile/navigation-tile.module';
import { SystemTileModule } from './dropdowns/drop-menu/system-tile/system-tile.module';
import { LanguageModule } from './dropdowns/language/language.module';
import { MultiSelectModule } from './dropdowns/multi-select/multi-select.module';
import { NavModule } from './dropdowns/nav-location/nav.module';
import { PermissionsModule } from './dropdowns/permissions/permissions.module';
import { SearchableModule } from './dropdowns/searchable/searchable.module';
import { ThreeDotsModule } from './dropdowns/three-dot/three-dots.module';
import { EditableModule } from './editable/editable.module';
import { EmailModule } from './email-input/email.module';
import { ExternalVideoModule } from './external-video/external-video.module';
import { FooterModule } from './footer/footer.module';
import { HeaderModule } from './header/header.module';
import { MainButtonModule } from './header/main-button/main-button.module';
import { NavDropdownModule } from './header/nav-dropdown/nav-dropdown.module';
import { HeaderLevelOneModule } from './header/new-header/header-level-one/header-level-one.module';
import { HeaderLevelTwoModule } from './header/new-header/header-level-two/header-level-two.module';
import { HeaderLogoAreaModule } from './header/new-header/logo-area/logo-area.module';
import { MobileHeaderMenuModule } from './header/new-header/mobile/mobile-menu/mobile-menu.module';
import { HeaderMobileModule } from './header/new-header/mobile/mobile.module';
import { NewHeaderModule } from './header/new-header/new-header.module';
import { TabsModule } from './header/tabs/tabs.module';
import { HtmlInputModule } from './html-input/html-input.module';
import { LandingDisplayModule } from './landing-display/landing-display.module';
import { LoggerModule } from './logger/logger.module';
import { NumericModule } from './numeric-input/numeric.module';
import { ClientButtonModule } from './open-client-button/client-button.module';
import { OverlayModalModule } from './overlay-modal/overlay-modal.module';
import { PasswordTagValidationModule } from './password-input-tag-validation/password-tag-validation.module';
import { PasswordValidationModule } from './password-input-validation/password-validation.module';
import { PasswordModule } from './password-input/password.module';
import { PreLoaderModule } from './placeholders/pre-loader/pre-loader.module';
import { ProcessButtonModule } from './process-button/process-button.module';
import { ProcessCancelButtonModule } from './process-cancel-Button/process-cancel-Button.module';
import { RadioModule } from './radio/radio.module';
import { RibbonModule } from './ribbon/ribbon.module';
import { SwtichModule } from './switch/switch.module';
import { TagModule } from './tag/tag.module';
import { ThemeSwitcherModule } from './theme-switcher/theme-switcher.module';
import { ToastContainerModule } from './toast/toast-container.module';
import { ToastModule } from './toast/toast.module';
import { TooltipModule } from './tooltip/tooltip.module';
import { UpdateWebadminSessionModule } from './update-webadmin-session/update-webadmin-session.module';

@NgModule({
    imports: [
        AccountSettingsModule,
        ActiveSystemModule,
        AdditionalSystemsTileModule,
        AlertBlockModule,
        ApplyModule,
        ContentBlockSectionModule,
        CarouselModule,
        CheckboxModule,
        ClientButtonModule,
        CookieBannerModule,
        ContentBlockModule,
        DropMenuModule,
        EditableModule,
        EmailModule,
        ExternalVideoModule,
        FooterModule,
        HeaderLevelOneModule,
        HeaderLevelTwoModule,
        HeaderLogoAreaModule,
        HeaderMobileModule,
        HeaderModule,
        HtmlInputModule,
        LandingDisplayModule,
        LanguageModule,
        // LayoutRightModule,
        LoggerModule,
        MainButtonModule,
        MobileHeaderMenuModule,
        MultiSelectModule,
        NavModule,
        NewHeaderModule,
        NumericModule,
        OverlayModalModule,
        PasswordModule,
        PasswordTagValidationModule,
        PasswordValidationModule,
        PermissionsModule,
        PreLoaderModule,
        ProcessButtonModule,
        ProcessCancelButtonModule,
        RadioModule,
        RibbonModule,
        NavDropdownModule,
        NavigationTileModule,
        SearchableModule,
        SwtichModule,
        SystemTileModule,
        TabsModule,
        TagModule,
        ThemeSwitcherModule,
        ThreeDotsModule,
        ToastContainerModule,
        ToastModule,
        TooltipModule,
        UpdateWebadminSessionModule,
    ],
    exports: [
        AccountSettingsModule,
        ActiveSystemModule,
        AdditionalSystemsTileModule,
        AlertBlockModule,
        ApplyModule,
        ContentBlockSectionModule,
        CarouselModule,
        CheckboxModule,
        ClientButtonModule,
        CookieBannerModule,
        ContentBlockModule,
        DropMenuModule,
        EditableModule,
        EmailModule,
        ExternalVideoModule,
        FooterModule,
        HeaderLevelOneModule,
        HeaderLevelTwoModule,
        HeaderLogoAreaModule,
        HeaderMobileModule,
        HeaderModule,
        HtmlInputModule,
        LandingDisplayModule,
        LanguageModule,
        LoggerModule,
        MainButtonModule,
        MobileHeaderMenuModule,
        MultiSelectModule,
        NavModule,
        NewHeaderModule,
        NumericModule,
        OverlayModalModule,
        PasswordModule,
        PasswordTagValidationModule,
        PasswordValidationModule,
        PermissionsModule,
        PreLoaderModule,
        ProcessButtonModule,
        ProcessCancelButtonModule,
        RadioModule,
        RibbonModule,
        NavDropdownModule,
        NavigationTileModule,
        SearchableModule,
        SwtichModule,
        SystemTileModule,
        TabsModule,
        TagModule,
        ThemeSwitcherModule,
        ThreeDotsModule,
        ToastContainerModule,
        ToastModule,
        TooltipModule,
        UpdateWebadminSessionModule,
    ]
})

export class ComponentsCommonModule { }
