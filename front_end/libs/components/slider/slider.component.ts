import { CdkDragMove } from '@angular/cdk/drag-drop';
import {
    Component,
    ElementRef,
    EventEmitter,
    Input, OnChanges,
    OnInit,
    Output,
    Renderer2,
    ViewChild
} from '@angular/core';

import { CoercedBoolInput, IBool } from '@decorators/ibool';
import { NgChanges } from '@utils/ng-changes';

type SliderRange = { start: number; end: number; decimal?: boolean };

@Component({
    selector: 'nx-slider',
    templateUrl: 'slider.component.html',
    styleUrls: ['slider.component.scss'],
})
export class NxSliderComponent implements OnInit, OnChanges {
    @Input() id: string;
    @Input() name: string;
    @IBool() @Input() disabled: CoercedBoolInput;
    @Input() value: number;
    @Input() label: string;
    @Input() range: SliderRange = { start: 0, end: 100, decimal: false };
    @IBool() @Input() showWarning: CoercedBoolInput;
    @Output() onDrag = new EventEmitter<number>();

    componentId: string;
    endValue: number;
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

    ngOnChanges(changes: NgChanges<NxSliderComponent>): void {
        if (changes.value?.currentValue) {
            this.value = changes.value.currentValue;
        }
    }

    sliderDragMove(event: CdkDragMove<unknown>): void {
        if (this.range.decimal) {
            this.value = this.endValue + parseFloat((event.distance.x / this.scale).toFixed(1));
            this.value = parseFloat(this.value.toFixed(1));
        } else {
            this.value = this.endValue + Math.round(event.distance.x / this.scale);
        }

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
