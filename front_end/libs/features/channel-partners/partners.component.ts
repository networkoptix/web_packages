import { Component, OnDestroy, OnInit } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { distinctUntilChanged, Subject, takeUntil } from 'rxjs';

import staticLang from '@app/language/language_i18n_static.json';
import { NxMenuService } from '@app/menu/menu.service';
import { Content, ContentToggle, Level1Item } from '@app/menu/menu.types';
import { menus, ribbonHeight } from '@app/variables/static-variables';
import { environment } from '@environments/environment';
import { NxPartnersService } from '@pages/channel-partners/partners.service';
import { NxApplyService } from '@services/apply.service';
import { NxAppStateService } from '@services/nx-app-state.service';
import {
    BrandInfo,
    OrganizationInfo,
    PartnerInfo,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxScrollMechanicsService } from '@services/scroll-mechanics.service';
import { GridBreakpoints } from '@styles/theme-variables-common';

@UntilDestroy()
@Component({
    selector: 'nx-channel-partners-component',
    templateUrl: 'partners.component.html',
    styleUrls: ['partners.component.scss'],
})
export class NxChannelPartnersComponent implements OnInit, OnDestroy {
    readonly environment = environment;
    LANG = staticLang;
    CONFIG: IConfig;

    customizations: BrandInfo[] = [];
    organizations: OrganizationInfo[] = [];
    partners: PartnerInfo[] = [];

    content: Content = { base: '', selectedSection: '', level1: [] };
    _menuSearchMode: boolean;
    menuSearchable: boolean;
    menuVisible: boolean = true;
    headerHeight: number;

    private cancelPrevious$ = new Subject<boolean>();

    private origSelectedSection: string;
    private origSelectedSubSection: string;
    private origSelectedDetailSection: string;

    constructor(
        private configService: NxConfigService,
        private menuService: NxMenuService,
        private applyService: NxApplyService,
        private appStateService: NxAppStateService,
        private scrollMechanicsService: NxScrollMechanicsService,
        private partnersService: NxPartnersService,
    ) {
        this.CONFIG = this.configService.getConfig();
        this.menuService.section = 'users';
    }

    public ngOnInit(): void {
        this.partnersService.loadCustomizations();

        this.menuSearchable = false;
        this.content = {
            selectedSection: '',
            selectedSubSection: '', // updated by selectedSubSectionSubject
            base: menus.customization.baseUrl,
            level1: []
        };

        this.updateMenu();

        this.menuService
            .selectedSectionSubject
            .pipe(
                untilDestroyed(this),
                distinctUntilChanged()
            )
            .subscribe(selection => {
                this.canNavMenu(
                    this.origSelectedSection,
                    'selectedSection',
                    selection
                );
            });

        this.menuService
            .selectedSubSectionSubject
            .pipe(
                untilDestroyed(this),
                distinctUntilChanged()
            )
            .subscribe(selection => {
                this.canNavMenu(
                    this.origSelectedSubSection,
                    'selectedSubSection',
                    selection
                );
            });

        this.menuService
            .selectedDetailsSection
            .pipe(
                untilDestroyed(this),
                distinctUntilChanged()
            )
            .subscribe(selection => {
                this.canNavMenu(
                    this.origSelectedDetailSection,
                    'selectedDetailsSection',
                    selection
                );
            });

        this.scrollMechanicsService.windowSizeSubject
            .pipe(untilDestroyed(this))
            .subscribe(({ width }) => {
                if (width >= GridBreakpoints.MD) {
                    this.setHeaderHeight();
                }
            });

        this.partnersService.customizationsSubject
            .subscribe(customizations => {
                this.customizations = customizations;
                this.updateMenu();
            });

        this.partnersService.partnersSubject
            .subscribe(partners => {
                this.partners = partners;
                this.updateMenu();
            });

        this.partnersService.organizationsSubject
            .subscribe(organizations => {
                this.organizations = organizations;
                this.updateMenu();
            });
    }

    updateMenu(): void {
        this.content.level1 = [];

        const customizationNode: Level1Item = {
            id: menus.customization.id,
            svg: menus.customization.icon,
            label: this.LANG.menu.titles.customizations,
            path: '',
            level2: [
                {
                    id: menus.customization.buttons.id,
                    items: [
                        {
                            id: 'addCustomization',
                            label: this.LANG['Add Customization'] || 'Add Customization',
                            disabled: false
                        }
                    ],
                    level3: []
                }
            ]
        };
        this.content.level1.push(customizationNode);

        // Retain buttons
        if (customizationNode.level2.length && customizationNode.level2[0].id === 'buttons') {
            customizationNode.level2[0].items[0].disabled = false;
        } else {
            customizationNode.level2 = [];
        }
        customizationNode.level3 = [];

        if (this.customizations.length) {
            for (const customization of this.customizations) {
                const node: Level1Item = {
                    id: customization.id + '',
                    svg: menus.customization.icon,
                    label: customization.name,
                    path: '/customizations/' + customization.id,
                    level2: [{
                        id: menus.customization.buttons.id,
                        items: [
                            {
                                id: 'addPartner',
                                label: this.LANG['Add Partner'] || 'Add Partner',
                                disabled: false
                            }
                        ],
                    }],
                    level3: [],
                };

                for (const partner of this.partners) {
                    node.level3.push({
                        id: partner.id + '',
                        svg: menus.customization.icon,
                        label: partner.name,
                        path: `/customizations/${customization.id}/channel/${partner.id}`,
                    });
                }

                this.content.level1.push(node);
            }
        }

        this.content = { ...this.content };
    }

    setHeaderHeight(): void {
        this.headerHeight = this.appStateService.ribbonVisibility
            ? this.CONFIG.headerHeight + ribbonHeight
            : this.CONFIG.headerHeight;
    }

    ngOnDestroy(): void {

    }

    contentToggle(event: ContentToggle): void {
        this.content.level1.find(node => {
            if (node.id === event.nodeId) {
                node.toggle = event.state;
                return true;
            } else {
                return false;
            }
        });
    }

    private canNavMenu(
        origTargetValue: string,
        contentTarget: 'selectedSection' |
            'selectedSubSection' |
            'selectedDetailsSection',
        selection: string,
    ): void {
        if (this.applyService.locked) {
            origTargetValue = selection;

            this.cancelPrevious$.next(true);
            this.applyService.applyOnNavSubject.pipe(
                takeUntil(this.cancelPrevious$)
            ).subscribe(status => {
                if (!['', 'canceled'].includes(status)) {
                    this.content[contentTarget] = origTargetValue;
                    this.content = { ...this.content }; // trigger onChange
                }
            });
        } else {
            this.content[contentTarget] = selection;
            this.content = { ...this.content }; // trigger onChange
        }
    }

    menuMode(event: boolean): void {
        setTimeout(() => {
            this._menuSearchMode = event;
        });
    }
}
