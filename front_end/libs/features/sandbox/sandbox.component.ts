import { CdkAccordion, CdkAccordionModule } from '@angular/cdk/accordion';
import { CommonModule } from '@angular/common';
import { Component, ViewChild, effect, signal, untracked } from '@angular/core';
import { RouterModule } from '@angular/router';
import { capitalize } from 'lodash-es';

import { alphaNumericSort } from '@utils/general';
import { keyValueNoSort } from '@utils/nx';

interface NavItem {
    name: string;
    link: string[];
}

function navName(path: string): string {
    return path.split('-').map(capitalize).join(' ');
}

@Component({
    selector: 'sandbox-component',
    templateUrl: 'sandbox.component.html',
    styleUrls: ['sandbox.component.scss'],
    standalone: true,
    imports: [CommonModule, RouterModule, CdkAccordionModule],
})
export class NxSandboxComponent {
    navSections = signal<Record<string, NavItem[]>>({});
    nosort = keyValueNoSort;

    @ViewChild(CdkAccordion) set _accordion(a: CdkAccordion) {
        this.cdkAccordion.set(a);
    }
    private cdkAccordion = signal<CdkAccordion | null>(null);

    private initialized = signal(false);
    protected initialOpenEffect = effect(
        () => {
            const [navSections, cdkAccordion, initialized] = [
                this.navSections(),
                this.cdkAccordion(),
                untracked(this.initialized),
            ];
            if (!initialized) {
                if (Object.keys(navSections).length && cdkAccordion) {
                    cdkAccordion.openAll();
                    this.initialized.set(true);
                }
            }
        },
        { allowSignalWrites: true },
    );

    activeSection = 'sandbox';

    constructor() {
        /* Automatically generate menu for navigation.
        The path is converted from kebab-case to Title Case. */
        import('./sandbox.module').then(m => {
            const navAccordian: Record<string, NavItem[]> = { sandbox: [] };
            for (const route of m.appRoutes[0].children!) {
                const path = route.path!;
                if (path === '') {
                    /* Top level redirect */
                    continue;
                } else if (route.component) {
                    const name = navName(route.path!);
                    const link = ['/sandbox', path];
                    navAccordian.sandbox.push({ name, link });
                } else if (route.children) {
                    navAccordian[path] = [];
                    for (const child of route.children) {
                        const name = navName(child.path!);
                        const link = ['/sandbox', path, child.path!];
                        navAccordian[path].push({ name, link });
                    }
                    /* Only one level deep, no lazy loading */
                } else {
                    /* Lazy loaded module */
                    const name = path.split('-').map(capitalize).join(' ');
                    const link = ['/sandbox', path];
                    navAccordian.sandbox.push({ name, link });
                }
            }
            for (const key of Object.keys(navAccordian)) {
                navAccordian[key].sort(alphaNumericSort(n => n.name));
            }
            this.navSections.set(navAccordian);
        });
    }
}
