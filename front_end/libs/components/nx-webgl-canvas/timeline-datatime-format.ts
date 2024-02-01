import { timeFormat } from 'd3';

// xAxisMinor labels format?
// Establish the desired formatting options using locale.format():
// https://github.com/d3/d3-time-format/blob/master/README.md#locale_format
export const formatMinorMillisecond = timeFormat('%Lms');
export const formatMinorSecond = timeFormat('%Ss');
export const formatMinorMinute = timeFormat('%I:%M');
export const formatMinorHour = timeFormat('%I %p');
export const formatMinorDay = timeFormat('%a %d');
export const formatMinorWeek = timeFormat('%b %d');
export const formatMinorMonth = timeFormat('%b');
export const formatMinorYear = timeFormat('%Y');

export const formatYear = timeFormat('%Y');
export const formatMonth = timeFormat('%B %Y');
export const formatDay = timeFormat('%d %B %Y');
export const formatMinute = timeFormat('%d %B %Y %I:%M');
export const formatSecond = timeFormat('%d %B %Y %I:%M:%S');
