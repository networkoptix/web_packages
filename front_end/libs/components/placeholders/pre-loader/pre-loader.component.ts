import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';

/* Usage
<nx-pre-loader
    type?="page">
</nx-pre-loader>
*/

@Component({
    selector: 'nx-pre-loader',
    templateUrl: 'pre-loader.component.html',
    styleUrls: ['pre-loader.component.scss'],
    standalone: true,
    imports: [CommonModule],
})
export class NxPreLoaderComponent implements OnInit {
    @Input() type: string;
    @Input() minHeight: number;

    ngOnInit(): void {
        this.type = this.type || '';
    }
}
