import { CdkDragMove } from '@angular/cdk/drag-drop';
import {
    Component,
    ElementRef,
    EventEmitter,
    Input,
    OnInit,
    Output,
    Renderer2,
    ViewChild,
} from '@angular/core';

import { CoercedBoolInput, IBool } from '@decorators/ibool';

type SliderRange = { start: number, end: number };

@Component({
    selector: 'nx-slider',
    templateUrl: 'slider.component.html',
    styleUrls: ['slider.component.scss'],
})
export class NxSliderComponent implements OnInit {
    @Input() id: string;
    @Input() name: string;
    @IBool() @Input() disabled: CoercedBoolInput;
    @Input() value: number = 0;
    @Input() label: string;
    @Input() range: SliderRange = { start: 0, end: 100 };
    @IBool() @Input() showWarning: CoercedBoolInput;
    @Output() onDrag = new EventEmitter<number>();

    componentId: string;
    endValue: number = 0;
    sliderWidth: number;
    scale: number;

    @ViewChild('sliderBoundary', { static: true }) sliderBoundary: ElementRef<HTMLDivElement>;
    @ViewChild('slider', { static: true }) slider: ElementRef<HTMLDivElement>;

    constructor(
        private renderer: Renderer2,
    ) { }

    private setValue(value: number): void {
        if (value) {
            this.renderer.setStyle(
                this.slider.nativeElement,
                'transform',
                'translateX(' + this.value * this.scale + 'px'
            );
            this.endValue = value;
        }
    }

    ngOnInit(): void {
        this.componentId = (this.id || this.name) + '-slider';
        this.sliderWidth = this.sliderBoundary.nativeElement.clientWidth - 24; // knob width
        this.scale = this.sliderWidth / this.range.end;

        this.setValue(this.value);
    }

    sliderDragMove(event: CdkDragMove<unknown>): void {
        this.value = this.endValue + Math.round(event.distance.x / this.scale);
        // adjust rounding error
        if (this.value > this.range.end) {
            this.value = this.range.end;
        }
        if (this.value < this.range.start) {
            this.value = this.range.start;
        }

        this.onDrag.emit(this.value);
    }

    sliderDragEnd(): void {
        this.endValue = this.value;
    }
}
