import { Injectable } from '@angular/core'
import TimelineService from './timeline.service'


@Injectable({
  providedIn: 'root',
 })
export class TimelineRecordsService {

  constructor (
    protected timeline: TimelineService
  ) {
  }
}

export default TimelineRecordsService
