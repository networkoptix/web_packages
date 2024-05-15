import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';

/**
 * Wrapper to provide styles
 */
@Component({
    selector: 'nx-skeleton-loader',
    templateUrl: 'skeleton-loader.component.html',
    styleUrls: ['skeleton-loader.component.scss'],
    standalone: true,
    imports: [CommonModule, NgxSkeletonLoaderModule],
})
export class NxSkeletonLoaderComponent {}
