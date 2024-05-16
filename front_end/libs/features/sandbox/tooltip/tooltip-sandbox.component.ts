import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, OnInit } from '@angular/core';
import { Observable, finalize, map, noop, of, take, timer } from 'rxjs';

import { ExampleCustomTooltipDirective } from '@directives/tooltip-v2/custom/example-custom-tooltip/example-custom-tooltip.directive';
import { NxTooltipV2Directive } from '@directives/tooltip-v2/tooltip-v2.directive';
import { TooltipPosition } from '@directives/tooltip-v2/tooltip-v2.types';
import { MS } from '@utils/general';

@Component({
    selector: 'nx-tooltip-sandbox',
    templateUrl: 'tooltip-sandbox.component.html',
    styleUrls: ['tooltip-sandbox.component.scss'],
    standalone: true,
    imports: [CommonModule, NxTooltipV2Directive, ExampleCustomTooltipDirective],
})
export class NxTooltipSandboxComponent implements OnInit, AfterViewInit {
    onLoadManualOpen = false;

    verticalPositions: TooltipPosition[] = [
        ['N', 'center'],
        ['S', 'center'],
        ['N', 'start'],
        ['S', 'end'],
        ['S', 'start'],
        ['N', 'end'],
    ];
    leftPositions: TooltipPosition[] = [
        ['W', 'end'],
        ['W', 'center'],
        ['W', 'start'],
    ];
    rightPositions: TooltipPosition[] = [
        ['E', 'end'],
        ['E', 'center'],
        ['E', 'start'],
    ];
    hamlet = {
        vertical: [
            'To be, or not to be,',
            'that is the question:',
            "Whether 'tis nobler in the mind to suffer",
            'The slings and arrows of outrageous fortune,',
            'Or to take Arms against a Sea of troubles,',
            'And by opposing end them: to die, to sleep',
        ],
        left: [
            'No more; and by a sleep, to say we end',
            'The heart-ache, and the thousand natural shocks',
            "That Flesh is heir to? 'Tis a consummation",
        ],
        right: [
            'Devoutly to be wished. To die, to sleep,',
            "To sleep, perchance to Dream; aye, there's the rub,",
            'For in that sleep of death, what dreams may come,',
        ],
    };

    pushBuffer = 0;
    pushDelta = 225;
    pushPull(pushed: NxTooltipV2Directive): void {
        this.pushBuffer += this.pushDelta;
        this.pushDelta = -this.pushDelta;
        setTimeout(() => {
            pushed.updatePosition();
        });
    }

    countdown(start: number, final: () => void = noop): Observable<string> {
        return timer(0, 1000).pipe(
            take(start + 1),
            map(i => `${start - i}`),
            finalize(() => final()),
        );
    }

    defaultText = of('Delay');
    delayText: Observable<string> = this.defaultText;
    delayedTrigger(): void {
        if (this.delayText === this.defaultText) {
            this.delayText = this.countdown(3, () => {
                this.delayText = this.defaultText;
            });
        }
    }

    MS = MS;
    slowTransition = false;
    thousandCountdown = timer(0, 1000).pipe(map(i => 1000 - i));
    resetCountdown(): void {
        this.thousandCountdown = timer(0, 1000).pipe(map(i => 1000 - i));
    }

    autohideText = of('Autohide');
    autohideUpdate(state: boolean, start = 5): void {
        if (state) {
            this.autohideText = this.countdown(start);
        } else {
            this.autohideText = of('Autohide');
        }
    }

    hamletColors = [
        'When he himself might his Quietus make',
        'With a bare Bodkin? Who would Fardels bear,',
        'To grunt and sweat under a weary life,',
    ];

    constructor(private self: ElementRef<HTMLElement>) {
        // The CDK overlay doesn't respond to non-scroll movement from content pop
        const int = window.setInterval(() => {
            if (document.querySelector('.menu-level-two')) {
                this.onLoadManualOpen = true;
                clearInterval(int);
            }
        }, 1000);
    }

    ngOnInit(): void {}

    ngAfterViewInit(): void {
        this.pushBuffer =
            document.documentElement.offsetWidth -
            this.self.nativeElement.getBoundingClientRect().x -
            10 -
            this.pushDelta;
    }
}
