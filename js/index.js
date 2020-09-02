const MIMETYPE_VIDEO_AUDIO = 'video/webm; codecs="opus,vp8"';
const MIME_TYPE_USE = MIMETYPE_VIDEO_AUDIO;
const STREAM_ID = "remote"

var video = document.getElementById("remote")
video.id = STREAM_ID;

//Config for camera recorder
const CAMERA_OPTIONS = {
    video: {
        width: 320,
        height: 280,
        facingMode: "environment",
        frameRate: 24
    }, audio: true
}


//Configure GunViewer 
var viewer_config = {
    mimeType: MIME_TYPE_USE,
    streamerId: STREAM_ID,//ID of the streamer
    catchup: false,//Skip to last frame when there is to much loading. Set to false to increase smooth playback but with latency
    debug: false,//For debug logs  
}

var gunViewer = new GunViewer(viewer_config);

//Configure GUN to pass to streamer
var peers = ['https://gunmeetingserver.herokuapp.com/gun'];
var opt = { peers: peers, localStorage: false, radisk: false };
var gunDB = Gun(opt);




//Config for the GUN GunStreamer
var streamer_config = {
    dbRecord: "gunmeeting",//The root of the streams
    streamId: STREAM_ID,//The user id you wanna stream  
    gun: gunDB,//Gun instance
    debug: false,//For debug logs
    onStreamerData: gunViewer.onStreamerData,//If you want manually handle the data manually
    url: "https://cdn.jsdelivr.net/gh/QVDev/GunStreamer@0.0.9/js/parser_worker.js"//webworker load remote
}

//GUN Streamer is the data side. It will convert data and write to GUN db
const gunStreamer = new GunStreamer(streamer_config)

//This is a callback function about the recording state, following states possible
// STOPPED: 1¸
// RECORDING:2
// NOT_AVAILABLE:3
// UNKNOWN:4
var onRecordStateChange = function (state) {
    var recordButton = document.getElementById("record_button");
    switch (state) {
        case recordState.RECORDING:
            // recordButton.innerText = "Stop recording";
            break;
        default:
            // recordButton.innerText = "Start recording";
            break;
    }
}

var recorder_config = {
    mimeType: MIME_TYPE_USE,
    video_id: STREAM_ID,//Video html element id
    onDataAvailable: gunStreamer.onDataAvailable,//MediaRecorder data available callback
    onRecordStateChange: onRecordStateChange,//Callback for recording state
    // audioBitsPerSecond: 6000,//Audio bits per second this is the lowest quality
    // videoBitsPerSecond: 100000,//Video bits per second this is the lowest quality
    recordInterval: 800,//Interval of the recorder higher will increase delay but more buffering. Lower will not do much. Due limitiation of webm
    cameraOptions: CAMERA_OPTIONS,//The camera and screencast options see constant
    // experimental: true,//This is custom time interval and very unstable with audio. Only video is more stable is interval quick enough? Audio
    debug: false//For debug logs
}

//Init the recorder
const gunRecorder = new GunRecorder(recorder_config);
gunRecorder.recordState = 1;

fetch('https://gunmeetingserver.herokuapp.com/gun/stats.radata')
    .then(response => response.json())
    .then(async data => {
        if (data.peers.count == 0 || data.rad.put.count == 0) {
            video.src = "mov/big_buck_bunny.mp4"
            video.loop = true;
            await video.play();
            gunRecorder.record();
        } else {
            // Get data from gun and pass along to viewer
            gunDB.get(STREAM_ID).on(function (data) {
                gunViewer.onStreamerData(data);
            });
            console.log("Streaming in progress wait for stream")
        }

    });

function startShowingPeers() {
    fetch('https://gunmeetingserver.herokuapp.com/gun/stats.radata')
        .then(response => response.json())
        .then(async data => {
            document.getElementById("peers").innerText = "Connected peers " + data.peers.count;
        });
}

setInterval(startShowingPeers, 1000);


