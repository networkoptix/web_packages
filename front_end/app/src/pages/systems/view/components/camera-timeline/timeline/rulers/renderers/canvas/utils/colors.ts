type ByteHexString = string

// import {
//     ColorComponent,
//     OpacityComponent,
//     RGB,
//     RGBA,
//     RgbaString,
//     ByteHexString,
// } from '../types/colors'
// import { Percentage } from '../types/basic'

import { percentage } from '../../../../numberTypeAliases';

// export function normalizeColorComponent (c: ColorComponent) {
//     if (c !== 0 && !c) return 0
//     if (c < 0) return 0
//     if (c > 255) return 255
//     return Math.round(c)
// }

// export function normalizeOpacityComponent (opacity: OpacityComponent = 1) {
//     if (opacity > 1 || opacity < 0 || opacity !== 0 && !opacity) {
//         return 1
//     }
//     return opacity
// }

// export function rgba2rgb (color: RGBA): RGB {
//     const [r, g, b, ] = color
//     return [r, g, b] as RGB
// }

// export function rgb2rgba (color: RGB, opacity: OpacityComponent = 1): RGBA {
//     return [...color, normalizeOpacityComponent(opacity)] as RGBA
// }

// export function normalizeRgbColor (color: RGB): RGB {
//     return color.map(normalizeColorComponent) as RGB
// }

// export function normalizeRgbaColor (color: RGBA): RGBA {
//     return rgb2rgba(normalizeRgbColor(rgba2rgb(color)), color[3])
// }

// export function normalizeColor (color: RGB|RGBA, opacity: OpacityComponent = 1): RGBA {
//     if (color.length === 3) {
//         return [...normalizeRgbColor(color), normalizeOpacityComponent(opacity)] as RGBA
//     } else if (color.length === 4) {
//         return normalizeRgbaColor(color)
//     }
//     return [0, 0, 0, 0] as RGBA
// }

// export function rgbaToCss (color: RGB|RGBA, opacity?: OpacityComponent): RgbaString {
//     const c: RGBA = normalizeColor(color, opacity)
//     return `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${c[3]})`
// }

export function percentageToHex (p: percentage): ByteHexString {
    return Math.round(p * 255).toString(16)
}
