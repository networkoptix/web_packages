import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
@Component({
    selector: 'nx-ml-ellipsis-clamp',
    templateUrl: 'mle-clamp.component.html',
    styleUrls: ['mle-clamp.component.scss'],
    standalone: true,
    imports: [CommonModule],
})
export class NxMultiLineEllipsisClampComponent {
    @Input() viewLines: number = 0;
}
