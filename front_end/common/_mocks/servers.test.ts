export function setupServers(): unknown {
    return {
        addParams: [
            {
                name: 'beta',
                value: '1',
            },
            {
                name: 'cpuArchitecture',
                value: 'x86_64',
            },
            {
                name: 'cpuModelName',
                value: 'AMD Ryzen 9 3950X 16-Core Processor',
            },
            {
                name: 'engineDescriptors',
                value: '[{"key":"{1e5613c4-b7ac-546d-6623-8c179de18114}","value":{"capabilities":"deviceDependent","id":"{1e5613c4-b7ac-546d-6623-8c179de18114}","name":"Hikvision analytics plugin","pluginId":"nx.hikvision"}},{"key":"{a6f9ed2c-261f-be90-5627-5bac6d0e7110}","value":{"capabilities":"deviceDependent","id":"{a6f9ed2c-261f-be90-5627-5bac6d0e7110}","name":"VCA analytics plugin","pluginId":"nx.vca"}},{"key":"{d018384f-8f08-6a40-70a8-1405ba18b455}","value":{"capabilities":"deviceDependent|keepObjectBoundingBoxRotation","id":"{d018384f-8f08-6a40-70a8-1405ba18b455}","name":"Hanwha analytics","pluginId":"nx.hanwha"}},{"key":"{0effea08-d494-aed7-bc53-beab1f45ce9d}","value":{"capabilities":"deviceDependent","id":"{0effea08-d494-aed7-bc53-beab1f45ce9d}","name":"Dahua analytics plugin","pluginId":"nx.dahua"}},{"key":"{cb4a4ec3-31e4-7fe7-ba2a-e3464b407edc}","value":{"capabilities":"deviceDependent","id":"{cb4a4ec3-31e4-7fe7-ba2a-e3464b407edc}","name":"Axis analytics plugin","pluginId":"nx.axis"}},{"key":"{e9d7203c-6255-a4e9-c91a-d8a439523f4e}","value":{"capabilities":"deviceDependent","id":"{e9d7203c-6255-a4e9-c91a-d8a439523f4e}","name":"DW MTT analytics plugin","pluginId":"nx.dw_mtt"}}]',
            },
            {
                name: 'eventTypeDescriptors',
                value: '{"nx.dahua.AlarmLocal":{"flags":"stateDependent","id":"nx.dahua.AlarmLocal","name":"Alarm detection","scopes":[{"engineId":"{0effea08-d494-aed7-bc53-beab1f45ce9d}","groupId":"nx.dahua.group.AlarmEvents"}]},"nx.dahua.AlarmOutput":{"flags":"stateDependent","id":"nx.dahua.AlarmOutput","name":"Alarm output detection","scopes":[{"engineId":"{0effea08-d494-aed7-bc53-beab1f45ce9d}","groupId":"nx.dahua.group.AlarmEvents"}]},"nx.dahua.AudioAnomaly":{"flags":"stateDependent","id":"nx.dahua.AudioAnomaly","name":"Audio anomaly detection (Audio input abnormal detection)","scopes":[{"engineId":"{0effea08-d494-aed7-bc53-beab1f45ce9d}","groupId":"nx.dahua.group.AudioEvents"}]},"nx.dahua.AudioMutation":{"flags":"stateDependent","id":"nx.dahua.AudioMutation","name":"Audio intensity change detection (Audio mutation detection)","scopes":[{"engineId":"{0effea08-d494-aed7-bc53-beab1f45ce9d}","groupId":"nx.dahua.group.AudioEvents"}]},"nx.dahua.CrossLineDetection":{"flags":"stateDependent|regionDependent","id":"nx.dahua.CrossLineDetection","name":"Tripwire detection (Cross line detection)","scopes":[{"engineId":"{0effea08-d494-aed7-bc53-beab1f45ce9d}","groupId":"nx.dahua.group.SimpleAnalyticsEvents"}]},"nx.dahua.CrossRegionDetection":{"flags":"stateDependent|regionDependent","id":"nx.dahua.CrossRegionDetection","name":"Intrusion detection (Cross region detection)","scopes":[{"engineId":"{0effea08-d494-aed7-bc53-beab1f45ce9d}","groupId":"nx.dahua.group.SimpleAnalyticsEvents"}]},"nx.dahua.FaceDetection":{"flags":"stateDependent","id":"nx.dahua.FaceDetection","name":"Face detection","scopes":[{"engineId":"{0effea08-d494-aed7-bc53-beab1f45ce9d}","groupId":"nx.dahua.group.SimpleAnalyticsEvents"}]},"nx.dahua.HeatImagingTemper":{"flags":"stateDependent","id":"nx.dahua.HeatImagingTemper","name":"High temperature detection","scopes":[{"engineId":"{0effea08-d494-aed7-bc53-beab1f45ce9d}","groupId":"nx.dahua.group.SystemEvents"}]},"nx.dahua.LeftDetection":{"flags":"stateDependent|regionDependent","id":"nx.dahua.LeftDetection","name":"Abandoned object detection (Left object detection)","scopes":[{"engineId":"{0effea08-d494-aed7-bc53-beab1f45ce9d}","groupId":"nx.dahua.group.SimpleAnalyticsEvents"}]},"nx.dahua.LoginFailure":{"flags":"noFlags","id":"nx.dahua.LoginFailure","name":"Login error detection","scopes":[{"engineId":"{0effea08-d494-aed7-bc53-beab1f45ce9d}","groupId":"nx.dahua.group.SystemEvents"}]},"nx.dahua.StorageFailure":{"flags":"stateDependent","id":"nx.dahua.StorageFailure","name":"Storage failure detection","scopes":[{"engineId":"{0effea08-d494-aed7-bc53-beab1f45ce9d}","groupId":"nx.dahua.group.SystemEvents"}]},"nx.dahua.StorageLowSpace":{"flags":"stateDependent","id":"nx.dahua.StorageLowSpace","name":"Storage low space detection","scopes":[{"engineId":"{0effea08-d494-aed7-bc53-beab1f45ce9d}","groupId":"nx.dahua.group.SystemEvents"}]},"nx.dahua.StorageNotExist":{"flags":"stateDependent","id":"nx.dahua.StorageNotExist","name":"Storage absence detection","scopes":[{"engineId":"{0effea08-d494-aed7-bc53-beab1f45ce9d}","groupId":"nx.dahua.group.SystemEvents"}]},"nx.dahua.TakenAwayDetection":{"flags":"stateDependent|regionDependent","id":"nx.dahua.TakenAwayDetection","name":"Missing object detection (Taken away detection)","scopes":[{"engineId":"{0effea08-d494-aed7-bc53-beab1f45ce9d}","groupId":"nx.dahua.group.SimpleAnalyticsEvents"}]},"nx.dahua.VideoAbnormalDetection":{"flags":"stateDependent","id":"nx.dahua.VideoAbnormalDetection","name":"Scene change detection (Video abnormal detection)","scopes":[{"engineId":"{0effea08-d494-aed7-bc53-beab1f45ce9d}","groupId":"nx.dahua.group.BasicEvents"}]},"nx.dahua.VideoBlind":{"flags":"stateDependent","id":"nx.dahua.VideoBlind","name":"Video blind detection","scopes":[{"engineId":"{0effea08-d494-aed7-bc53-beab1f45ce9d}","groupId":"nx.dahua.group.BasicEvents"}]},"nx.dahua.VideoLoss":{"flags":"stateDependent","id":"nx.dahua.VideoLoss","name":"Video loss detection","scopes":[{"engineId":"{0effea08-d494-aed7-bc53-beab1f45ce9d}","groupId":"nx.dahua.group.BasicEvents"}]},"nx.dahua.VideoMotion":{"flags":"stateDependent|regionDependent","id":"nx.dahua.VideoMotion","name":"Motion detection","scopes":[{"engineId":"{0effea08-d494-aed7-bc53-beab1f45ce9d}","groupId":"nx.dahua.group.BasicEvents"}]},"nx.dahua.VideoUnFocus":{"flags":"stateDependent","id":"nx.dahua.VideoUnFocus","name":"Defocus detection","scopes":[{"engineId":"{0effea08-d494-aed7-bc53-beab1f45ce9d}","groupId":"nx.dahua.group.BasicEvents"}]},"nx.dw_mtt.AVD.clarityAbnormal":{"flags":"stateDependent","id":"nx.dw_mtt.AVD.clarityAbnormal","name":"Video Blur Detection","scopes":[{"engineId":"{e9d7203c-6255-a4e9-c91a-d8a439523f4e}"}]},"nx.dw_mtt.AVD.colorAbnormal":{"flags":"stateDependent","id":"nx.dw_mtt.AVD.colorAbnormal","name":"Abnormal color detection","scopes":[{"engineId":"{e9d7203c-6255-a4e9-c91a-d8a439523f4e}"}]},"nx.dw_mtt.AVD.sceneChange":{"flags":"stateDependent","id":"nx.dw_mtt.AVD.sceneChange","name":"Scene Change","scopes":[{"engineId":"{e9d7203c-6255-a4e9-c91a-d8a439523f4e}"}]},"nx.dw_mtt.MOTION":{"flags":"stateDependent","id":"nx.dw_mtt.MOTION","name":"Motion Detection","scopes":[{"engineId":"{e9d7203c-6255-a4e9-c91a-d8a439523f4e}"}]},"nx.dw_mtt.PEA.perimeterAlarm":{"flags":"stateDependent","id":"nx.dw_mtt.PEA.perimeterAlarm","name":"Perimeter Intrusion [exclusive]","scopes":[{"engineId":"{e9d7203c-6255-a4e9-c91a-d8a439523f4e}"}]},"nx.dw_mtt.PEA.tripwireAlarm":{"flags":"stateDependent","id":"nx.dw_mtt.PEA.tripwireAlarm","name":"Line Crossing [exclusive]","scopes":[{"engineId":"{e9d7203c-6255-a4e9-c91a-d8a439523f4e}"}]},"nx.hanwha.AlarmInput":{"flags":"stateDependent|hidden","id":"nx.hanwha.AlarmInput","name":"Dry contact input","scopes":[{"engineId":"{d018384f-8f08-6a40-70a8-1405ba18b455}"}]},"nx.hanwha.AudioAnalytics.Explosion":{"flags":"noFlags","id":"nx.hanwha.AudioAnalytics.Explosion","name":"Sound - Explosion","scopes":[{"engineId":"{d018384f-8f08-6a40-70a8-1405ba18b455}"}]},"nx.hanwha.AudioAnalytics.GlassBreak":{"flags":"noFlags","id":"nx.hanwha.AudioAnalytics.GlassBreak","name":"Sound - Glass break","scopes":[{"engineId":"{d018384f-8f08-6a40-70a8-1405ba18b455}"}]},"nx.hanwha.AudioAnalytics.Gunshot":{"flags":"noFlags","id":"nx.hanwha.AudioAnalytics.Gunshot","name":"Sound - Gunshot","scopes":[{"engineId":"{d018384f-8f08-6a40-70a8-1405ba18b455}"}]},"nx.hanwha.AudioAnalytics.Scream":{"flags":"stateDependent","id":"nx.hanwha.AudioAnalytics.Scream","name":"Sound - Scream","scopes":[{"engineId":"{d018384f-8f08-6a40-70a8-1405ba18b455}"}]},"nx.hanwha.AudioDetection":{"flags":"stateDependent","id":"nx.hanwha.AudioDetection","name":"Audio detection","scopes":[{"engineId":"{d018384f-8f08-6a40-70a8-1405ba18b455}"}]},"nx.hanwha.DefocusDetection":{"flags":"stateDependent","id":"nx.hanwha.DefocusDetection","name":"Defocusing detection","scopes":[{"engineId":"{d018384f-8f08-6a40-70a8-1405ba18b455}"}]},"nx.hanwha.FaceDetection":{"flags":"stateDependent","id":"nx.hanwha.FaceDetection","name":"Face detection","scopes":[{"engineId":"{d018384f-8f08-6a40-70a8-1405ba18b455}"}]},"nx.hanwha.FogDetection":{"flags":"stateDependent","id":"nx.hanwha.FogDetection","name":"Fog detection","scopes":[{"engineId":"{d018384f-8f08-6a40-70a8-1405ba18b455}"}]},"nx.hanwha.MotionDetection":{"flags":"stateDependent|regionDependent","id":"nx.hanwha.MotionDetection","name":"Motion detection","scopes":[{"engineId":"{d018384f-8f08-6a40-70a8-1405ba18b455}"}]},"nx.hanwha.ObjectTracking.Start":{"flags":"noFlags","id":"nx.hanwha.ObjectTracking.Start","name":"Object tracking - Start","scopes":[{"engineId":"{d018384f-8f08-6a40-70a8-1405ba18b455}"}]},"nx.hanwha.Queue.1.Level.High":{"flags":"stateDependent","id":"nx.hanwha.Queue.1.Level.High","name":"Queue 1 high level","scopes":[{"engineId":"{d018384f-8f08-6a40-70a8-1405ba18b455}","groupId":"nx.hanwha.Queue"}]},"nx.hanwha.Queue.1.Level.Medium":{"flags":"stateDependent","id":"nx.hanwha.Queue.1.Level.Medium","name":"Queue 1 medium level","scopes":[{"engineId":"{d018384f-8f08-6a40-70a8-1405ba18b455}","groupId":"nx.hanwha.Queue"}]},"nx.hanwha.Queue.2.Level.High":{"flags":"stateDependent","id":"nx.hanwha.Queue.2.Level.High","name":"Queue 2 high level","scopes":[{"engineId":"{d018384f-8f08-6a40-70a8-1405ba18b455}","groupId":"nx.hanwha.Queue"}]},"nx.hanwha.Queue.2.Level.Medium":{"flags":"stateDependent","id":"nx.hanwha.Queue.2.Level.Medium","name":"Queue 2 medium level","scopes":[{"engineId":"{d018384f-8f08-6a40-70a8-1405ba18b455}","groupId":"nx.hanwha.Queue"}]},"nx.hanwha.Queue.3.Level.High":{"flags":"stateDependent","id":"nx.hanwha.Queue.3.Level.High","name":"Queue 3 high level","scopes":[{"engineId":"{d018384f-8f08-6a40-70a8-1405ba18b455}","groupId":"nx.hanwha.Queue"}]},"nx.hanwha.Queue.3.Level.Medium":{"flags":"stateDependent","id":"nx.hanwha.Queue.3.Level.Medium","name":"Queue 3 medium level","scopes":[{"engineId":"{d018384f-8f08-6a40-70a8-1405ba18b455}","groupId":"nx.hanwha.Queue"}]},"nx.hanwha.ShockDetection":{"flags":"noFlags","id":"nx.hanwha.ShockDetection","name":"Shock detection","scopes":[{"engineId":"{d018384f-8f08-6a40-70a8-1405ba18b455}"}]},"nx.hanwha.Tampering":{"flags":"noFlags","id":"nx.hanwha.Tampering","name":"Tampering detection","scopes":[{"engineId":"{d018384f-8f08-6a40-70a8-1405ba18b455}"}]},"nx.hanwha.TemperatureChangeDetection":{"flags":"stateDependent","id":"nx.hanwha.TemperatureChangeDetection","name":"Temperature change detection","scopes":[{"engineId":"{d018384f-8f08-6a40-70a8-1405ba18b455}"}]},"nx.hanwha.VideoAnalytics.AppearDisappear":{"flags":"regionDependent","id":"nx.hanwha.VideoAnalytics.AppearDisappear","name":"Appearing in the area","scopes":[{"engineId":"{d018384f-8f08-6a40-70a8-1405ba18b455}"}]},"nx.hanwha.VideoAnalytics.Entering":{"flags":"regionDependent","id":"nx.hanwha.VideoAnalytics.Entering","name":"Entering the area","scopes":[{"engineId":"{d018384f-8f08-6a40-70a8-1405ba18b455}"}]},"nx.hanwha.VideoAnalytics.Exiting":{"flags":"regionDependent","id":"nx.hanwha.VideoAnalytics.Exiting","name":"Exiting the area","scopes":[{"engineId":"{d018384f-8f08-6a40-70a8-1405ba18b455}"}]},"nx.hanwha.VideoAnalytics.Intrusion":{"flags":"noFlags","id":"nx.hanwha.VideoAnalytics.Intrusion","name":"Intrusion","scopes":[{"engineId":"{d018384f-8f08-6a40-70a8-1405ba18b455}"}]},"nx.hanwha.VideoAnalytics.Loitering":{"flags":"regionDependent","id":"nx.hanwha.VideoAnalytics.Loitering","name":"Loitering","scopes":[{"engineId":"{d018384f-8f08-6a40-70a8-1405ba18b455}"}]},"nx.hanwha.VideoAnalytics.Passing":{"flags":"regionDependent","id":"nx.hanwha.VideoAnalytics.Passing","name":"Virtual line crossing","scopes":[{"engineId":"{d018384f-8f08-6a40-70a8-1405ba18b455}"}]},"nx.hikvision.AttendedBaggage":{"flags":"stateDependent","id":"nx.hikvision.AttendedBaggage","name":"Attended baggage","scopes":[{"engineId":"{1e5613c4-b7ac-546d-6623-8c179de18114}"}]},"nx.hikvision.AudioException":{"flags":"stateDependent","id":"nx.hikvision.AudioException","name":"Audio exception","scopes":[{"engineId":"{1e5613c4-b7ac-546d-6623-8c179de18114}"}]},"nx.hikvision.BlackList":{"flags":"noFlags","id":"nx.hikvision.BlackList","name":"LPR - Black list","scopes":[{"engineId":"{1e5613c4-b7ac-546d-6623-8c179de18114}","groupId":"nx.hikvision.LPR"}]},"nx.hikvision.Defocus":{"flags":"stateDependent","id":"nx.hikvision.Defocus","name":"Defocusing detection","scopes":[{"engineId":"{1e5613c4-b7ac-546d-6623-8c179de18114}"}]},"nx.hikvision.Face":{"flags":"stateDependent","id":"nx.hikvision.Face","name":"Face detection","scopes":[{"engineId":"{1e5613c4-b7ac-546d-6623-8c179de18114}"}]},"nx.hikvision.LineDetect":{"flags":"stateDependent|regionDependent","id":"nx.hikvision.LineDetect","name":"Virtual line crossing","scopes":[{"engineId":"{1e5613c4-b7ac-546d-6623-8c179de18114}"}]},"nx.hikvision.Motion":{"flags":"stateDependent|regionDependent","id":"nx.hikvision.Motion","name":"Motion detection","scopes":[{"engineId":"{1e5613c4-b7ac-546d-6623-8c179de18114}"}]},"nx.hikvision.RegionEntrance":{"flags":"regionDependent","id":"nx.hikvision.RegionEntrance","name":"Entering the area","scopes":[{"engineId":"{1e5613c4-b7ac-546d-6623-8c179de18114}"}]},"nx.hikvision.RegionExiting":{"flags":"regionDependent","id":"nx.hikvision.RegionExiting","name":"Exiting the area","scopes":[{"engineId":"{1e5613c4-b7ac-546d-6623-8c179de18114}"}]},"nx.hikvision.SceneChange":{"flags":"stateDependent","id":"nx.hikvision.SceneChange","name":"Scene changed","scopes":[{"engineId":"{1e5613c4-b7ac-546d-6623-8c179de18114}"}]},"nx.hikvision.Tamper":{"flags":"stateDependent","id":"nx.hikvision.Tamper","name":"Tampering detection","scopes":[{"engineId":"{1e5613c4-b7ac-546d-6623-8c179de18114}"}]},"nx.hikvision.UnattendedBaggage":{"flags":"stateDependent","id":"nx.hikvision.UnattendedBaggage","name":"Unattended baggage","scopes":[{"engineId":"{1e5613c4-b7ac-546d-6623-8c179de18114}"}]},"nx.hikvision.Vehicle":{"flags":"stateDependent","id":"nx.hikvision.Vehicle","name":"Vehicle detected","scopes":[{"engineId":"{1e5613c4-b7ac-546d-6623-8c179de18114}"}]},"nx.hikvision.WhiteList":{"flags":"noFlags","id":"nx.hikvision.WhiteList","name":"LPR - White list","scopes":[{"engineId":"{1e5613c4-b7ac-546d-6623-8c179de18114}","groupId":"nx.hikvision.LPR"}]},"nx.hikvision.fielddetection":{"flags":"stateDependent","id":"nx.hikvision.fielddetection","name":"Intrusion detection","scopes":[{"engineId":"{1e5613c4-b7ac-546d-6623-8c179de18114}"}]},"nx.hikvision.group":{"flags":"stateDependent","id":"nx.hikvision.group","name":"Group detection","scopes":[{"engineId":"{1e5613c4-b7ac-546d-6623-8c179de18114}"}]},"nx.hikvision.loitering":{"flags":"stateDependent","id":"nx.hikvision.loitering","name":"Loitering detection","scopes":[{"engineId":"{1e5613c4-b7ac-546d-6623-8c179de18114}"}]},"nx.hikvision.otherlist":{"flags":"noFlags","id":"nx.hikvision.otherlist","name":"LPR - Other list","scopes":[{"engineId":"{1e5613c4-b7ac-546d-6623-8c179de18114}","groupId":"nx.hikvision.LPR"}]},"nx.hikvision.parking":{"flags":"stateDependent","id":"nx.hikvision.parking","name":"Parking detection","scopes":[{"engineId":"{1e5613c4-b7ac-546d-6623-8c179de18114}"}]},"nx.hikvision.rapidMove":{"flags":"stateDependent","id":"nx.hikvision.rapidMove","name":"Rapid move detection","scopes":[{"engineId":"{1e5613c4-b7ac-546d-6623-8c179de18114}"}]},"nx.hikvision.videoloss":{"flags":"stateDependent","id":"nx.hikvision.videoloss","name":"Video loss detection","scopes":[{"engineId":"{1e5613c4-b7ac-546d-6623-8c179de18114}"}]},"nx.vca.fd":{"flags":"stateDependent","id":"nx.vca.fd","name":"face detected","scopes":[{"engineId":"{a6f9ed2c-261f-be90-5627-5bac6d0e7110}"}]},"nx.vca.md":{"flags":"stateDependent","id":"nx.vca.md","name":"motion detected","scopes":[{"engineId":"{a6f9ed2c-261f-be90-5627-5bac6d0e7110}"}]},"nx.vca.vca":{"flags":"stateDependent","id":"nx.vca.vca","name":"vca event","scopes":[{"engineId":"{a6f9ed2c-261f-be90-5627-5bac6d0e7110}"}]}}',
            },
            {
                name: 'fullVersion',
                value: '4.1.0.30888-2cd7375b7a1e-default-beta',
            },
            {
                name: 'groupDescriptors',
                value: '{"nx.dahua.group.AlarmEvents":{"id":"nx.dahua.group.AlarmEvents","name":"Alarm events","scopes":[{"engineId":"{0effea08-d494-aed7-bc53-beab1f45ce9d}"}]},"nx.dahua.group.AudioEvents":{"id":"nx.dahua.group.AudioEvents","name":"Audio events","scopes":[{"engineId":"{0effea08-d494-aed7-bc53-beab1f45ce9d}"}]},"nx.dahua.group.BasicEvents":{"id":"nx.dahua.group.BasicEvents","name":"Basic events","scopes":[{"engineId":"{0effea08-d494-aed7-bc53-beab1f45ce9d}"}]},"nx.dahua.group.ComplexAnalyticsEvents":{"id":"nx.dahua.group.ComplexAnalyticsEvents","name":"Complex analytics events","scopes":[{"engineId":"{0effea08-d494-aed7-bc53-beab1f45ce9d}"}]},"nx.dahua.group.SimpleAnalyticsEvents":{"id":"nx.dahua.group.SimpleAnalyticsEvents","name":"Simple analytics events","scopes":[{"engineId":"{0effea08-d494-aed7-bc53-beab1f45ce9d}"}]},"nx.dahua.group.SystemEvents":{"id":"nx.dahua.group.SystemEvents","name":"System events","scopes":[{"engineId":"{0effea08-d494-aed7-bc53-beab1f45ce9d}"}]},"nx.hanwha.Queue":{"id":"nx.hanwha.Queue","name":"Queue","scopes":[{"engineId":"{d018384f-8f08-6a40-70a8-1405ba18b455}"}]},"nx.hikvision.LPR":{"id":"nx.hikvision.LPR","name":"LPR","scopes":[{"engineId":"{1e5613c4-b7ac-546d-6623-8c179de18114}"}]}}',
            },
            {
                name: 'hddList',
                value: 'VBOX HARDDISK, VBOX HARDDISK, VBOX HARDDISK, VBOX HARDDISK, VBOX HARDDISK, VBOX HARDDISK, VBOX HARDDISK, CD-ROM',
            },
            {
                name: 'networkInterfaces',
                value: 'enp0s3: 131072000 bps',
            },
            {
                name: 'objectTypeDescriptors',
                value: '{"nx.hanwha.ObjectDetection.Face":{"id":"nx.hanwha.ObjectDetection.Face","name":"Face tracking","scopes":[{"engineId":"{d018384f-8f08-6a40-70a8-1405ba18b455}"}]},"nx.hanwha.ObjectDetection.LicensePlate":{"id":"nx.hanwha.ObjectDetection.LicensePlate","name":"LicensePlate tracking","scopes":[{"engineId":"{d018384f-8f08-6a40-70a8-1405ba18b455}"}]},"nx.hanwha.ObjectDetection.Person":{"id":"nx.hanwha.ObjectDetection.Person","name":"Person tracking","scopes":[{"engineId":"{d018384f-8f08-6a40-70a8-1405ba18b455}"}]},"nx.hanwha.ObjectDetection.Vehicle":{"id":"nx.hanwha.ObjectDetection.Vehicle","name":"Vehicle tracking","scopes":[{"engineId":"{d018384f-8f08-6a40-70a8-1405ba18b455}"}]}}',
            },
            {
                name: 'physicalMemory',
                value: '4127428608',
            },
            {
                name: 'pluginDescriptors',
                value: '{"nx.axis":{"id":"nx.axis","name":"Axis analytics plugin"},"nx.dahua":{"id":"nx.dahua","name":"Dahua analytics plugin"},"nx.dw_mtt":{"id":"nx.dw_mtt","name":"DW MTT analytics plugin"},"nx.hanwha":{"id":"nx.hanwha","name":"Hanwha analytics"},"nx.hikvision":{"id":"nx.hikvision","name":"Hikvision analytics plugin"},"nx.vca":{"id":"nx.vca","name":"VCA analytics plugin"}}',
            },
            {
                name: 'productNameShort',
                value: 'hdwitness',
            },
            {
                name: 'publicIp',
                value: '47.44.180.186',
            },
            {
                name: 'systemRuntime',
                value: 'Ubuntu 18.04.5 LTS',
            },
        ],
        allowAutoRedundancy: false,
        authKey: '{f93ce2fa-7ab7-41fc-a62c-af5ebfaf99ff}',
        backupBitrate: -12500000,
        backupDaysOfTheWeek: '254',
        backupDuration: -1,
        backupStart: 0,
        backupType: 'BackupManual',
        flags: 'SF_HasPublicIP|SF_Has_HDD|SF_SupportsTranscoding',
        id: '{2d624ba5-a762-f38a-60ba-14240c70276f}',
        maxCameras: 0,
        metadataStorageId: '{00000000-0000-0000-0000-000000000000}',
        name: 'Server dev',
        networkAddresses: '10.1.5.110:7001;[fe80::e9c6:d437:11d0:4471%2]:7001;47.44.180.186:7001',
        osInfo: '{"platform":"linux_x64","variant":"ubuntu","variantVersion":"18.04"}',
        parentId: '{00000000-0000-0000-0000-000000000000}',
        status: 'Online',
        storages: [
            {
                addParams: [
                    {
                        name: 'space',
                        value: '105151496192',
                    },
                ],
                id: '{0f2303d3-9493-8cc1-46d4-72b41a5a6617}',
                isBackup: false,
                name: 'Initial',
                parentId: '{2d624ba5-a762-f38a-60ba-14240c70276f}',
                spaceLimit: '10737418240',
                storageType: 'local',
                typeId: '{f8544a40-880e-9442-b78a-9da6db6862b4}',
                url: '/hdd6/HD Witness Media',
                usedForWriting: true,
            },
            {
                addParams: [
                    {
                        name: 'space',
                        value: '105151496192',
                    },
                ],
                id: '{444b3084-c1b6-9d5c-204c-3e200b8c8c85}',
                isBackup: false,
                name: 'Initial',
                parentId: '{2d624ba5-a762-f38a-60ba-14240c70276f}',
                spaceLimit: '10737418240',
                storageType: 'local',
                typeId: '{f8544a40-880e-9442-b78a-9da6db6862b4}',
                url: '/hdd4/HD Witness Media',
                usedForWriting: true,
            },
            {
                addParams: [
                    {
                        name: 'space',
                        value: '105151496192',
                    },
                ],
                id: '{7fbbdadb-1511-e122-a374-d1066646c931}',
                isBackup: false,
                name: 'Initial',
                parentId: '{2d624ba5-a762-f38a-60ba-14240c70276f}',
                spaceLimit: '10737418240',
                storageType: 'local',
                typeId: '{f8544a40-880e-9442-b78a-9da6db6862b4}',
                url: '/hdd2/HD Witness Media',
                usedForWriting: true,
            },
            {
                addParams: [
                    {
                        name: 'space',
                        value: '269488295936',
                    },
                ],
                id: '{a16efb7d-11ec-566a-020c-7e0a73c0d661}',
                isBackup: false,
                name: 'Initial',
                parentId: '{2d624ba5-a762-f38a-60ba-14240c70276f}',
                spaceLimit: '26948829593',
                storageType: 'local',
                typeId: '{f8544a40-880e-9442-b78a-9da6db6862b4}',
                url: '/opt/networkoptix/mediaserver/var/data',
                usedForWriting: true,
            },
            {
                addParams: [
                    {
                        name: 'space',
                        value: '105151496192',
                    },
                ],
                id: '{b5d7f260-bd2c-97f3-436f-cbe05197b6e3}',
                isBackup: false,
                name: 'Initial',
                parentId: '{2d624ba5-a762-f38a-60ba-14240c70276f}',
                spaceLimit: '10737418240',
                storageType: 'local',
                typeId: '{f8544a40-880e-9442-b78a-9da6db6862b4}',
                url: '/hdd5/HD Witness Media',
                usedForWriting: true,
            },
            {
                addParams: [
                    {
                        name: 'space',
                        value: '105151496192',
                    },
                ],
                id: '{e8275267-f16d-10be-010c-7ec761b12077}',
                isBackup: false,
                name: 'Initial',
                parentId: '{2d624ba5-a762-f38a-60ba-14240c70276f}',
                spaceLimit: '10737418240',
                storageType: 'local',
                typeId: '{f8544a40-880e-9442-b78a-9da6db6862b4}',
                url: '/hdd3/HD Witness Media',
                usedForWriting: true,
            },
        ],
        systemInfo: '',
        typeId: '{be5d1ee0-b92c-3b34-86d9-bca2dab7826f}',
        url: 'https://10.1.5.110:7001',
        version: '4.1.0.30888',
        ip: '10.1.5.110',
        port: '7001',
        osName: 'linux_x64',
    };
}
