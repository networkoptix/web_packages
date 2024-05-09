import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';

// Styles a number as follows:
//   Positive => green prepended with "+" (eg, +200)
//   Zero => default
//   Negative => red

@Component({
    selector: 'nx-quantity-change',
    templateUrl: './quantity-change.component.html',
    styleUrls: ['./quantity-change.component.scss'],
    imports: [CommonModule],
    standalone: true,
})
export class NxQuantityChangeComponent {
    number$$ = input.required<number>({ alias: 'number' });
}
