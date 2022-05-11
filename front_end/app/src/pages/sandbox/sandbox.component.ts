import { Component } from '@angular/core';
import { Subscription } from 'rxjs';

import { NxMenuService } from '@src/menu/menu.service';
import type { Content } from '@src/menu/menu.types';

@Component({
    selector: 'sandbox-component',
    templateUrl: 'sandbox.component.html',
    styleUrls: ['sandbox.component.scss']
})

export class NxSandboxComponent {
    content: Content;
    menuReady = false;

    private menuSectionSubscription: Subscription;
    private menuSelectedDetailsSubscription: Subscription;

    constructor(
        private menuService: NxMenuService,
    ) {
    }

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
                            id: 'themeLight',
                            label: 'Light theme',
                            path: ''
                        }, {
                            id: 'themeDark',
                            label: 'Dark theme',
                            path: ''
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
                            id: 'multiSelect',
                            label: 'Multi select',
                            path: '/multi-select'
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
                            id: 'websocket',
                            label: 'Websocket',
                            path: '/websocket'
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

        this.menuSectionSubscription = this.menuService
            .selectedSectionSubject
            .subscribe(selection => {
                if (this.content.selectedSection === selection) {
                    return;
                }
                this.content.selectedSection = selection;
                this.content = { ...this.content }; // trigger onChange
            });

        this.menuSelectedDetailsSubscription = this.menuService
            .selectedDetailsSection
            .subscribe(selection => {
                this.content.selectedDetailsSection = selection;
                this.content = { ...this.content }; // trigger onChange
            });
    }
}
