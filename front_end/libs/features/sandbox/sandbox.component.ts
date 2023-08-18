import { Component, effect } from '@angular/core';

import { NxMenuService } from '@menu/menu.service';
import type { Content } from '@menu/menu.types';

@Component({
    selector: 'sandbox-component',
    templateUrl: 'sandbox.component.html',
    styleUrls: ['sandbox.component.scss'],
})
export class NxSandboxComponent {
    content: Content;
    menuReady = false;

    constructor(private menuService: NxMenuService) {
        effect(() => {
            const selection = this.menuService.selectedSection();
            const detailSelection = this.menuService.selectedDetailsSection();
            if (
                !this.content ||
                (this.content.selectedSection === selection &&
                    this.content.selectedDetailsSection === detailSelection)
            ) {
                return;
            }
            this.content.selectedSection = selection;
            this.content.selectedDetailsSection = detailSelection;
            this.content = { ...this.content }; // trigger onChange
        });

        effect(() => {
            if (this.content) {
                this.content.selectedDetailsSection = this.menuService.selectedDetailsSection();
                this.content = { ...this.content }; // trigger onChange
            }
        });
    }

    ngOnInit(): void {
        this.content = {
            base: '/sandbox',
            selectedSection: 'components',
            selectedSubSection: 'table',
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
                            path: '/basic-colors',
                        },
                        {
                            id: 'customColors',
                            label: 'Customizations',
                            path: '/custom-colors',
                        },
                        {
                            id: 'themeColors',
                            label: 'Themes',
                            path: '/theme-colors',
                        },
                        {
                            id: 'themeHSL',
                            label: 'HSL colors',
                            path: '/hsl-theme',
                        },
                        {
                            id: 'webgl',
                            label: 'WebGL',
                            path: '/webgl',
                        },
                        {
                            id: 'simple-webgl',
                            label: 'Simple WebGL',
                            path: '/simple-webgl',
                        },
                    ],
                },
                {
                    id: 'components',
                    svg: 'system',
                    label: 'Components',
                    path: '',
                    level3: [
                        {
                            id: 'applyServiceForm',
                            label: 'Apply service (form)',
                            path: '/apply-service-form',
                        },
                        {
                            id: 'applyServiceSection',
                            label: 'Apply service (section)',
                            path: '/apply-service-section',
                        },
                        {
                            id: 'buttons',
                            label: 'Buttons',
                            path: '/buttons',
                        },
                        {
                            id: 'dropdowns',
                            label: 'Dropdowns',
                            path: '/dropdowns',
                        },
                        {
                            id: 'demoLayout',
                            label: 'Demo layout',
                            path: '/demo-layout',
                        },
                        {
                            id: 'search',
                            label: 'Search',
                            path: '/search',
                        },
                        {
                            id: 'masonryGrid',
                            label: 'Masonry grid',
                            path: '/masonry-grid',
                        },
                        {
                            id: 'formElements',
                            label: 'Form elements',
                            path: '/form-elements',
                        },
                        {
                            id: 'validation',
                            label: 'Validation',
                            path: '/validation',
                        },
                        {
                            id: 'table',
                            label: 'Table',
                            path: '/table',
                        },
                        {
                            id: 'tags',
                            label: 'Tags',
                            path: '/tags',
                        },
                        {
                            id: 'toaster',
                            label: 'Ribbon,  Banner, Toaster & Buttons',
                            path: '/toaster',
                        },
                        {
                            id: 'archsvg',
                            label: 'Architecture (SVG)',
                            path: '/arch',
                        },
                    ],
                },
            ],
        };
        this.menuReady = true;
    }
}
