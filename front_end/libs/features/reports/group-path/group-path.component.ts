import { CommonModule } from '@angular/common';
import { Component, computed, effect, ElementRef, input, OnDestroy } from '@angular/core';

import { NxThemeAttributeDirective } from '@directives/theme-attribute.directive';

@Component({
    selector: 'nx-group-path',
    template: '', // No template, content is set in computedText$$
    styleUrls: ['./group-path.component.scss'],
    imports: [CommonModule],
    standalone: true,
    hostDirectives: [NxThemeAttributeDirective],
})
export class NxGroupPathComponent implements OnDestroy {
    // groupPath is the output of getFormattedGroupPath() in NxGroupPathService
    // It should have the format [groupPathString, systemName]
    groupPath = input.required<string[]>();

    measurement: HTMLDivElement;
    target: ElementRef<HTMLElement>;

    constructor(protected el: ElementRef<HTMLElement>) {
        this.target = el;
        this.createMeasurementElement();

        effect(() => {
            this.target.nativeElement.classList.add('nx-breadcrumbs');
            this.target.nativeElement.innerHTML = this.computedText$$() || '';
        });
    }

    computedText$$ = computed(() => {
        const groupPath = this.groupPath();
        if (groupPath.length === 1 && !groupPath[0].includes('/')) {
            return groupPath[0];
        }

        if (groupPath[0] === '') {
            return groupPath[1];
        }

        let txt = `<span class="group-path">${groupPath[0]}</span>&nbsp;${groupPath[1]}`;
        const styleTarget = window.getComputedStyle(this.target.nativeElement);

        // Find width of text displayed
        this.measurement.innerHTML = txt;
        // Ridiculous default values to help detect missing styling
        this.measurement.style.fontWeight = styleTarget.fontWeight || '900';
        this.measurement.style.fontSize = styleTarget.fontSize || '5px';
        this.measurement.style.fontFamily = styleTarget.fontFamily || 'Roboto, sans-serif';

        const styleElement = window.getComputedStyle(this.measurement);

        const textWidth = parseInt(styleElement.width);
        const maxTextWidth =
            parseInt(styleTarget.width) -
            parseInt(styleTarget.paddingLeft) -
            parseInt(styleTarget.paddingRight);

        if (textWidth > maxTextWidth) {
            const segments = groupPath[0].split('/');
            if (segments[segments.length - 1] === '') {
                segments.pop();
            }

            let idx = 1;
            while (idx < segments.length) {
                segments[idx] = '... ';
                idx++;
            }

            const path = segments.join('/ ');
            txt = `<span class="group-path">${path}/</span>&nbsp;${groupPath[1]}`;
            this.measurement.innerHTML = txt;
            if (parseInt(this.getCssStyle(this.measurement, 'width')) > maxTextWidth) {
                const truncated = '.../'; // in string is breaking closing span tag
                txt = `<span class="group-path">${truncated}&nbsp;</span>${groupPath[1]}`;
            }
        }

        return txt;
    });

    getCssStyle(element: HTMLDivElement, prop: string): string {
        return window.getComputedStyle(element, null).getPropertyValue(prop);
    }

    ngOnDestroy(): void {
        this.measurement.remove();
    }

    private createMeasurementElement(): void {
        this.measurement = document.createElement('div');
        // styles needed to measure text width
        this.measurement.style.position = 'absolute';
        this.measurement.style.visibility = 'hidden';
        this.measurement.style.height = 'auto';
        this.measurement.style.width = 'auto';
        this.measurement.style.whiteSpace = 'nowrap';

        const newContent = document.createTextNode('');
        this.measurement.appendChild(newContent);
        document.body.appendChild(this.measurement);
    }
}
