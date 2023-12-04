import { CommonModule } from '@angular/common';
import { Component, ElementRef, Inject, Input, ViewChild } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { NxArrowNavDirective } from '@directives/nx-arrow-nav';
import { NxClickElsewhereDirective } from '@directives/nx-click-elsewhere';
import { environment } from '@environments/environment';
import { NxHeaderService } from '@services/nx-header.service';
import { WINDOW } from '@services/window-provider';
import { icons } from '@static-variables';

import { BaseDropdown } from '../../dropdowns/injDropdown';

@Component({
    selector: 'nx-nav-dropdown',
    templateUrl: 'nav-dropdown.component.html',
    styleUrls: [
        environment.isLocal
            ? 'nav-dropdown-webadmin.component.scss'
            : 'nav-dropdown.component.scss',
    ],
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,
        AngularSvgIconModule,
        NxAddSvgSrcDirective,
        NxArrowNavDirective,
        NxClickElsewhereDirective,
    ],
})
export class NxNavDropdownComponent extends BaseDropdown {
    @ViewChild('dropDownButton') dropDownButton: ElementRef<HTMLButtonElement>;
    @Input() nodeLocation;
    @Input() dropdownNode;
    @Input() enableDropdownOnly = false;

    name = '';
    offset = 0;
    icons = icons;

    get path() {
        return this.nodeLocation?.path || false;
    }

    get nodes() {
        const nodes =
            this.dropdownNode?.nodes ||
            this.nodeLocation?.parentNode?.nodes ||
            this.nodeLocation?.nodes;
        if (!nodes) {
            return [];
        }

        const node = nodes.find(({ url }) => {
            return url === this.path;
        });
        // eslint-disable-next-line camelcase
        this.name = node?.name || this.dropdownNode?.display_name || ''; // set name to '' until nodes update
        return nodes;
    }

    constructor(public headerService: NxHeaderService, @Inject(WINDOW) private window: Window) {
        super();
    }

    hide() {
        this.show = false;
        return false;
    }

    updateOffset(): void {
        this.offset =
            this.window.innerWidth > 420
                ? 0
                : -this.dropDownButton.nativeElement.getBoundingClientRect().left;
    }

    get hideDropdown() {
        return this.nodes.length < 2 && !this.dropdownNode;
    }
}
