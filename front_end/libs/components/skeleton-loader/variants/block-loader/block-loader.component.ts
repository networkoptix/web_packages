import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';

import { NxSkeletonLoaderComponent } from '@components/skeleton-loader/skeleton-loader.component';

@Component({
    selector: 'nx-block-loader',
    templateUrl: 'block-loader.component.html',
    styleUrls: ['block-loader.component.scss'],
    standalone: true,
    imports: [CommonModule, NxSkeletonLoaderComponent, NgxSkeletonLoaderModule],
})
export class NxBlockLoaderComponent {}
