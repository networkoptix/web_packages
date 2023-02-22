import { Component } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';

import { NxMenuService } from '@app/menu/menu.service';
import type { Content } from '@app/menu/menu.types';

@UntilDestroy()
@Component({
    selector: 'sandbox-component',
    templateUrl: 'sandbox.component.html',
    styleUrls: ['sandbox.component.scss'],
})
export class NxSandboxComponent {
    content: Content;
    menuReady = false;

    constructor(
        private menuService: NxMenuService,
    ) {}

    ngOnInit(): void {
        this.content = {
            base: '/sandbox',
            selectedSection: 'components',
            selectedSubSection: 'formComponents',
            level1: [
                {
                    id: 'colors',
                    svg: 'system',
                    label: 'Colors',
                    path: '',
                    level3: [
                        {
                            id: 'basicColors',
                            label: 'Basic',
                            path: '/basic-colors'
                        }, {
                            id: 'customColors',
                            label: 'Customizations',
                            path: '/custom-colors'
                        }, {
                            id: 'themeColors',
                            label: 'Themes',
                            path: '/theme-colors'
                        }, {
                            id: 'themeHSL',
                            label: 'HSL colors',
                            path: '/hsl-theme'
                        }, {
                            id: 'webgl',
                            label: 'WebGL',
                            path: '/webgl'
                        }
                    ]
                }, {
                    id: 'components',
                    svg: 'system',
                    label: 'Components',
                    path: '',
                    level3: [
                        {
                            id: 'applyServiceForm',
                            label: 'Apply service (form)',
                            path: '/apply-service-form'
                        }, {
                            id: 'applyServiceSection',
                            label: 'Apply service (section)',
                            path: '/apply-service-section'
                        }, {
                            id: 'dropdowns',
                            label: 'Dropdowns',
                            path: '/dropdowns'
                        }, {
                            id: 'demoLayout',
                            label: 'Demo layout',
                            path: '/demo-layout'
                        }, {
                            id: 'search',
                            label: 'Search',
                            path: '/search'
                        }, {
                            id: 'masonryGrid',
                            label: 'Masonry grid',
                            path: '/masonry-grid'
                        }, {
                            id: 'formElements',
                            label: 'Form elements',
                            path: '/form-elements'
                        }, {
                            id: 'validation',
                            label: 'Validation',
                            path: '/validation'
                        }, {
                            id: 'tags',
                            label: 'Tags',
                            path: '/tags'
                        }, {
                            id: 'toaster',
                            label: 'Ribbon,  Banner, Toaster & Buttons',
                            path: '/toaster'
                        }, {
                            id: 'archsvg',
                            label: 'Architecture (SVG)',
                            path: '/arch'
                        }
                    ]
                }
            ]
        };
        this.menuReady = true;

        this.menuService.selectedSectionSubject
            .pipe(untilDestroyed(this))
            .subscribe(selection => {
                if (this.content.selectedSection === selection) {
                    return;
                }
                this.content.selectedSection = selection;
                this.content = { ...this.content }; // trigger onChange
            });

        this.menuService.selectedDetailsSection
            .pipe(untilDestroyed(this))
            .subscribe(selection => {
                this.content.selectedDetailsSection = selection;
                this.content = { ...this.content }; // trigger onChange
            });
    }
}
