Base abstraction for connecting with and communication with mediaserver api.

This will probably eventually be packaged to publish on npm. Do not include application specific behavior.

To use within our projects we'll create fascaded or adapters to allow swapping connection methods.

TODO:

The mediaserver supports HTTP POST as a transport option. Not sure if there's any reason to add that except maybe as a fallback.

We might benefit from using WebRTC as a transport option. The mediaserver doesn't currently support this and it's not very standard but could lower latency quiet a bit using a peer to peer connection.