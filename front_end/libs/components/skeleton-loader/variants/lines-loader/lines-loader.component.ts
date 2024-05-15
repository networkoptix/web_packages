import { CommonModule } from '@angular/common';
import { Component, booleanAttribute, computed, input } from '@angular/core';
import { random } from 'lodash-es';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';

import { NxSkeletonLoaderComponent } from '@components/skeleton-loader/skeleton-loader.component';

@Component({
    selector: 'nx-lines-loader',
    templateUrl: 'lines-loader.component.html',
    styleUrls: ['lines-loader.component.scss'],
    standalone: true,
    imports: [CommonModule, NxSkeletonLoaderComponent, NgxSkeletonLoaderModule],
})
export class NxLinesLoaderComponent {
    count$$ = input(10, { alias: 'count' });
    randomWidth$$ = input(false, { alias: 'randomWidth', transform: booleanAttribute });

    randomWidths$$ = computed(() => {
        if (!this.randomWidth$$()) {
            return null;
        }

        return Array.from({ length: this.count$$() }, () => random(50, 100, false));
    });
}
