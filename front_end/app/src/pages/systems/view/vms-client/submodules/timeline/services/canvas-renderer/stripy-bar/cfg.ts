import getSlopeWidth from './slope';
import { deg, px, pxPerSecond, color } from './types';

export default {
    stripeWidth     : 8 as px,
    slope           : 45 as deg,
    speed           : 24 as pxPerSecond,
    backgroundColor : '#EBEFF188' as color, // $light3 + opacity .5
    stripeColor     : '#D7DFE388' as color // $light5 + opacity .5
};
