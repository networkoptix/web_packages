import { animate, animation, style, transition, trigger, useAnimation } from '@angular/animations';

// Animations for transitions
export const show = animation([
    style({
        height: '0%',
        opacity: 0,
        visibility: 'hidden',
    }),
    animate('5s', style({ opacity: 1, height: '100%', visibility: 'visible' })),
]);

export const leave = animation([
    style({
        height: '100%',
        opacity: 1,
        visibility: 'visible',
    }),
    animate('5s', style({ opacity: 0, height: '0%', visibility: 'hidden' })),
]);

// Transitions (These are applied directly to the elements)
export const transitionEnter = trigger('transitionEnter', [
    transition(':enter', [useAnimation(show)]),
]);

export const transitionLeave = trigger('transitionLeave', [
    transition(':leave', [useAnimation(leave)]),
]);