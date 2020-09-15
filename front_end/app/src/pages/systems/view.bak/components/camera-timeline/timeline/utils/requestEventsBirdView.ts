import { NxSystem } from "../../../../../../../services/system.service"
import TimeRange from '../time_range/TimeRange'
import DuratedEvent from '../archive/events/DuratedEvent'
import IEventBirdView from '../archive/birdViews/IEventBirdView'


export function requestEventsBirdView (
    system: NxSystem,
    cameraId: string,
    range: TimeRange = new TimeRange(-Infinity, + Infinity),
    roughness = Infinity
):Promise<IEventBirdView> {
    range.startTime = Math.max(0, range.startTime)
    range.endTime = Math.min(Date.now(), range.endTime)
    roughness = Math.round(Math.min(roughness, range.duration))
    
    return system.getCameraRecords(
        cameraId,
        range.startTime,
        range.endTime,
        roughness
    ).then(response => ({
            range,
            roughness,

            events: response['reply'].map(r => {
                const startTime = parseInt(r.startTimeMs)
                const duration = parseInt(r.durationMs)
                return new DuratedEvent(startTime, duration === -1 ? Date.now() : startTime + duration)
            })
        })
    )
}

export default requestEventsBirdView
