import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
    selector: 'masonry-grid',
    templateUrl: 'masonry-grid.component.html',
    styleUrls: ['masonry-grid.component.scss'],
    standalone: true,
    imports: [CommonModule],
})
export class MasonryGridComponent {}
