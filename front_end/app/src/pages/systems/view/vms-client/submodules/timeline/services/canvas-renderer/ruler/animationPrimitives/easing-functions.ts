export type EASING = 'linear' | 'ease-in-out' | 'ease-in-out-sine'

export function linear (x: number): number {
    return x;
}

export function easeInOutSine (x: number): number {
    return -(Math.cos(Math.PI * x) - 1) / 2;
}
