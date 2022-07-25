import { NgModule } from '@angular/core';

import { AdvancedFilterModule } from './advanced-filter/advanced-filter.module';
import { ApplyModule } from './apply/apply.module';
import { CarouselModule } from './carousel/carousel.module';
import { CheckboxModule } from './checkbox/checkbox.module';
import { ConsoleTableModule } from './console-table/console-table.module';
import { AlertBlockModule } from './content-block/alert/block.module';
import { ContentBlockModule } from './content-block/content-block.module';
import { ContentBlockSectionModule } from './content-block/section/section.module';
import { CookieBannerModule } from './cookie-banner/cookie-banner.module';
import { DevelopersMenuModule } from './developers-menu/developers-menu.module';
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
import { DynamicWidgetModule } from './dynamic-widget/dynamic-widget.module';
import { EditableModule } from './editable/editable.module';
import { EmailModule } from './email-input/email.module';
import { ExternalVideoModule } from './external-video/external-video.module';
import { FooterModule } from './footer/footer.module';
import { MonitoringGraphModule } from './graph/graph.module';
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
import { InfoBlockModule } from './info-block/info-block.module';
import { LandingDisplayModule } from './landing-display/landing-display.module';
import { LoggerModule } from './logger/logger.module';
import { NoSystemsModule } from './no-systems/no-systems.module';
import { NumericModule } from './numeric-input/numeric.module';
import { ClientButtonModule } from './open-client-button/client-button.module';
import { OverlayModalModule } from './overlay-modal/overlay-modal.module';
import { PaginatorModule } from './paginator/paginator.module';
import { PasswordTagValidationModule } from './password-input-tag-validation/password-tag-validation.module';
import { PasswordValidationModule } from './password-input-validation/password-validation.module';
import { PasswordModule } from './password-input/password.module';
import { OpenClientSectionPlaceholderModule } from './placeholders/open-client-section/open-client-section.module';
import { PagePlaceHolderModule } from './placeholders/page/page-placeholder.module';
import { PlayerPlaceholderModule } from './placeholders/player/player-placeholder.module';
import { PreLoaderModule } from './placeholders/pre-loader/pre-loader.module';
import { SectionPlaceholderModule } from './placeholders/section/section-placeholder.module';
import { ProcessButtonModule } from './process-button/process-button.module';
import { ProcessCancelButtonModule } from './process-cancel-Button/process-cancel-Button.module';
import { RadioModule } from './radio/radio.module';
import { RibbonModule } from './ribbon/ribbon.module';
import { SearchModule } from './search/search.module';
import { StepperModule } from './stepper/stepper.module';
import { SwtichModule } from './switch/switch.module';
import { SystemListModule } from './systems-list/list.module';
import { TagModule } from './tag/tag.module';
import { ThemeSwitcherModule } from './theme-switcher/theme-switcher.module';
import { ToastContainerModule } from './toast/toast-container.module';
import { ToastModule } from './toast/toast.module';
import { TooltipModule } from './tooltip/tooltip.module';
import { UpdateWebadminSessionModule } from './update-webadmin-session/update-webadmin-session.module';
import { AssetExplorerWidgetModule } from './widgets/asset-explorer/asset-explorer-widget.module';
import { BookmarksWidgetModule } from './widgets/bookmarks/bookmarks-widget.module';
import { EventGeneratorModule } from './widgets/event-generator/event-generator.module';
import { HealthMonitorWidgetModule } from './widgets/health-monitor/health-monitor-widget.module';
import { LiveViewWidgetModule } from './widgets/live-view/live-view-widget.module';
import { ServerLoggerWidgetModule } from './widgets/server-logger/server-logger-widget.module';
import { ServerMonitorWidgetModule } from './widgets/server-monitor/server-monitor-widget.module';
import { SystemListWidgetModule } from './widgets/systems-list/system-list-widget.module';
import { ThirdsPartyWidgetModule } from './widgets/third-party/third-party-widget.module';

@NgModule({
    imports: [
        AccountSettingsModule,
        ActiveSystemModule,
        AdvancedFilterModule,
        AdditionalSystemsTileModule,
        AlertBlockModule,
        ApplyModule,
        AssetExplorerWidgetModule,
        BookmarksWidgetModule,
        ContentBlockSectionModule,
        CarouselModule,
        CheckboxModule,
        ClientButtonModule,
        CookieBannerModule,
        ConsoleTableModule,
        ContentBlockModule,
        DevelopersMenuModule,
        DropMenuModule,
        DynamicWidgetModule,
        EditableModule,
        EmailModule,
        EventGeneratorModule,
        ExternalVideoModule,
        HealthMonitorWidgetModule,
        FooterModule,
        HeaderLevelOneModule,
        HeaderLevelTwoModule,
        HeaderLogoAreaModule,
        HeaderMobileModule,
        HeaderModule,
        HtmlInputModule,
        InfoBlockModule,
        LandingDisplayModule,
        LanguageModule,
        LiveViewWidgetModule,
        // LayoutRightModule,
        LoggerModule,
        MainButtonModule,
        MobileHeaderMenuModule,
        MonitoringGraphModule,
        MultiSelectModule,
        NavModule,
        NewHeaderModule,
        NumericModule,
        OpenClientSectionPlaceholderModule,
        OverlayModalModule,
        NoSystemsModule,
        PagePlaceHolderModule,
        PaginatorModule,
        PasswordModule,
        PasswordTagValidationModule,
        PasswordValidationModule,
        PermissionsModule,
        PlayerPlaceholderModule,
        PreLoaderModule,
        ProcessButtonModule,
        ProcessCancelButtonModule,
        RadioModule,
        RibbonModule,
        NavDropdownModule,
        NavigationTileModule,
        SearchModule,
        SearchableModule,
        SectionPlaceholderModule,
        ServerLoggerWidgetModule,
        ServerMonitorWidgetModule,
        StepperModule,
        SwtichModule,
        SystemListModule,
        SystemListWidgetModule,
        SystemTileModule,
        TabsModule,
        TagModule,
        ThemeSwitcherModule,
        ThreeDotsModule,
        ThirdsPartyWidgetModule,
        ToastContainerModule,
        ToastModule,
        TooltipModule,
        UpdateWebadminSessionModule,
    ],
    exports: [
        AccountSettingsModule,
        ActiveSystemModule,
        AdvancedFilterModule,
        AdditionalSystemsTileModule,
        AlertBlockModule,
        ApplyModule,
        AssetExplorerWidgetModule,
        BookmarksWidgetModule,
        ContentBlockSectionModule,
        CarouselModule,
        CheckboxModule,
        ClientButtonModule,
        CookieBannerModule,
        ConsoleTableModule,
        ContentBlockModule,
        DevelopersMenuModule,
        DropMenuModule,
        DynamicWidgetModule,
        EditableModule,
        EmailModule,
        EventGeneratorModule,
        ExternalVideoModule,
        HealthMonitorWidgetModule,
        FooterModule,
        HeaderLevelOneModule,
        HeaderLevelTwoModule,
        HeaderLogoAreaModule,
        HeaderMobileModule,
        HeaderModule,
        HtmlInputModule,
        InfoBlockModule,
        LandingDisplayModule,
        LanguageModule,
        LiveViewWidgetModule,
        // LayoutRightModule,
        LoggerModule,
        MainButtonModule,
        MobileHeaderMenuModule,
        MonitoringGraphModule,
        MultiSelectModule,
        NavModule,
        NewHeaderModule,
        NumericModule,
        OpenClientSectionPlaceholderModule,
        OverlayModalModule,
        PagePlaceHolderModule,
        PaginatorModule,
        PasswordModule,
        PasswordTagValidationModule,
        PasswordValidationModule,
        PermissionsModule,
        PlayerPlaceholderModule,
        PreLoaderModule,
        ProcessButtonModule,
        ProcessCancelButtonModule,
        RadioModule,
        RibbonModule,
        NavDropdownModule,
        NoSystemsModule,
        NavigationTileModule,
        SearchModule,
        SearchableModule,
        SectionPlaceholderModule,
        ServerLoggerWidgetModule,
        ServerMonitorWidgetModule,
        StepperModule,
        SwtichModule,
        SystemListModule,
        SystemListWidgetModule,
        SystemTileModule,
        TabsModule,
        TagModule,
        ThemeSwitcherModule,
        ThreeDotsModule,
        ThirdsPartyWidgetModule,
        ToastContainerModule,
        ToastModule,
        TooltipModule,
        UpdateWebadminSessionModule,
    ]
})

export class ComponentsCommonModule {}
