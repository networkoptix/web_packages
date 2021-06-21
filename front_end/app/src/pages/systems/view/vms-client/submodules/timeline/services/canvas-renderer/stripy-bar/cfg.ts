import { deg, px, pxPerSecond, color } from './types';
import colors from '../drawingConfigs/colors'

export default {
    stripeWidth     : 8 as px,
    slope           : 45 as deg,
    speed           : 24 as pxPerSecond,
    backgroundColor : `${colors.light3}88` as color,
    stripeColor     : `${colors.light5}88` as color,
};
