import { CdkAccordion, CdkAccordionModule } from '@angular/cdk/accordion';
import { CommonModule } from '@angular/common';
import { Component, ViewChild, effect, signal, untracked } from '@angular/core';
import { RouterModule } from '@angular/router';
import { capitalize } from 'lodash-es';

import { alphaNumericSort } from '@utils/general';

interface NavItem {
    name: string;
    link: string[];
}

function navName(componentName: string): string {
    return componentName
        .replace(/^Nx/, '')
        .replace(/Component$/, '')
        .replace(/sandbox/i, '')
        .replace(/example/i, '')
        .replaceAll(/([A-Z][a-z])/g, ' $1');
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
    nosort = (): 0 => 0;

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
        import('./sandbox.module').then(m => {
            const navAccordian: Record<string, NavItem[]> = { sandbox: [] };
            for (const route of m.appRoutes[0].children!) {
                const path = route.path!;
                if (path === '') {
                    /* Top level redirect */
                    continue;
                } else if (route.component) {
                    const name = navName(route.component.name);
                    const link = ['/sandbox', path];
                    navAccordian.sandbox.push({ name, link });
                } else if (route.children) {
                    navAccordian[path] = [];
                    for (const child of route.children) {
                        const name = navName(child.component!.name);
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
