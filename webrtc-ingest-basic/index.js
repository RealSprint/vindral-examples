import { WebrtcIngest } from "@vindral/webrtc-ingest-sdk"

const localVideo = document.querySelector("#local-video")
const streamKeyForm = document.querySelector("#streamkey-form")
const streamKeyInput = document.querySelector("#streamkey-input")
const streamState = document.querySelector("#stream-state")
const stopButton = document.querySelector("#stop-button")

let mediaStream
let webrtcIngest

const wait = async (time) => new Promise((resolve) => setTimeout(resolve, time))

const setupMediaTracks = async () => {
  // Specify media constraints. Better to let user pick devices but requires much more code/gui
  // for audio/video only, just skip the unwanted media type
  const mediaConstraints = Object.freeze({
    audio: {
      noiseSuppression: false,
      channelCount: 2,
      echoCancellation: false,
    },
    video: {
      width: { ideal: 1280 },
      height: { ideal: 720 },
      // more than 30 fps often lowers performance (browser-side) and image quality.
      // only use higher frameRate if you know it will work
      frameRate: { ideal: 30, max: 30 },
    },
  })

  try {
    mediaStream = await navigator.mediaDevices.getUserMedia(mediaConstraints)
    // show stream on local video object. Skip for audio only streams
    if (localVideo) {
      localVideo.srcObject = mediaStream
      localVideo.style.display = "block"
    }
  } catch (err) {
    // sometimes, it takes some time to poll devices so we wait for an
    // additional 500ms if first time fails
    console.error(err)
    await wait(500)
    void setupMediaTracks()
    return
  }
}

const startWebrtc = async (streamKey) => {
  if (webrtcIngest) {
    webrtcIngest.unload()
  }
  webrtcIngest = new WebrtcIngest({
    url: "https://lb.cdn.vindral.com",
    streamKey,
  })

  // listen to state changes
  webrtcIngest.on("broadcast state change", () => {
    streamState.textContent = `${webrtcIngest.connectionState} | ${webrtcIngest.broadcastState}`
  })
  webrtcIngest.on("connection state change", () => {
    streamState.textContent = `${webrtcIngest.connectionState} | ${webrtcIngest.broadcastState}`
  })

  try {
    await setupMediaTracks()
    // Get the video and audio tracks from the media stream
    const audioTracks = mediaStream.getAudioTracks()
    const videoTracks = mediaStream.getVideoTracks()

    // connect to webrtc receiver
    void webrtcIngest.connect()

    // set media tracks
    if (videoTracks.length) {
      void webrtcIngest.setVideoTrack(videoTracks[0])
    }

    if (audioTracks.length) {
      void webrtcIngest.setAudioTrack(audioTracks[0])
    }

    // even though we have a connection, the actual broadcast will not start
    // until this call has been made
    webrtcIngest.broadcast()
  } catch (error) {
    console.error("Failed to start webrtc", error)
    webrtcIngest?.unload()
  }
}

// remember to unload instance when it's not wanted any longer,
// in order of removing timers, intervals, etc
stopButton.onclick = () => {
  stopButton.classList.add("hidden")
  streamKeyForm.classList.remove("hidden")
  webrtcIngest?.unload()
  
  if (localVideo) {
    localVideo.srcObject = null
  }
}

// get streamkey from form and start webrtcingest session
streamKeyForm.onsubmit = (e) => {
  e.preventDefault()
  const streamKey = streamKeyInput.value

  if (streamKey !== "") {
    void  startWebrtc(streamKey)
    streamKeyForm.classList.add("hidden")
    stopButton.classList.remove("hidden")
    streamState.textContent = "initializing..."
  }
}
