import { Directive, Input, ElementRef } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';

import { NxIntersectionObserver } from './nx-intersection.directive';
import { IntersectionStatus } from './nx-intersection.directive.types';

@UntilDestroy()
@Directive({
    selector: '[nxForceVisibility]',
    hostDirectives: [
        {
            directive: NxIntersectionObserver,
            inputs: [
                'intersectionRootMargin: visibilityMargin',
                'emitVisibleOnlyOnce: forceVisibilityOnce',
                'intersectionThreshold: visibilityThreshold',
                'intersectionDebounce',
            ],
            // eslint-disable-next-line @angular-eslint/no-outputs-metadata-property
            outputs: ['nxOnIntersect'],
        },
    ],
    standalone: true,
})
export class NxForceVisibility {
    @Input() nxForceVisibility: boolean;

    constructor(
        private element: ElementRef,
        private intersectionObserver: NxIntersectionObserver,
    ) {}

    ngOnInit(): void {
        this.intersectionObserver.nxOnIntersect
            .pipe(untilDestroyed(this))
            .subscribe((isIntersect: IntersectionStatus) => {
                this.handleVisible(isIntersect === IntersectionStatus.Visible);
            });
    }

    handleVisible(isVisible: boolean): void {
        if (this.nxForceVisibility && !isVisible) {
            this.element.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
}
