import { WebrtcIngest } from "@vindral/webrtc-ingest-sdk"

const localVideo = document.querySelector("#local-video")
const streamForm = document.querySelector("#stream-form")
const streamState = document.querySelector("#stream-state")
const startButton = document.querySelector("#submit-button")
const stopButton = document.querySelector("#stop-button")
const streamKeyInput = document.querySelector("#streamkey-input")
const audioInputSelect = document.querySelector('select#audioSource')
const videoInputSelect = document.querySelector('select#videoSource')
const inputSelectors = [audioInputSelect, videoInputSelect]

let mediaStream
let webrtcIngest

const updateDeviceList = async () => {
    const deviceInfos = await navigator.mediaDevices.enumerateDevices()

    // Handles being called several times to update labels. Preserve values.
    const values = inputSelectors.map(select => select.value)
    inputSelectors.forEach(select => {
      while (select.firstChild) {
        select.removeChild(select.firstChild)
      }
    })

    deviceInfos.forEach((deviceInfo) => {
      const option = document.createElement('option')
      option.value = deviceInfo.deviceId
      if (deviceInfo.kind === 'audioinput') {
        option.text = deviceInfo.label || `microphone ${audioInputSelect.length + 1}`
        audioInputSelect.appendChild(option)
      } else if (deviceInfo.kind === 'videoinput') {
        option.text = deviceInfo.label || `camera ${videoInputSelect.length + 1}`
        videoInputSelect.appendChild(option)
      } else {
        console.log('Some other kind of source/device: ', deviceInfo)
      }
    })

    inputSelectors.forEach((select, selectorIndex) => {
      if (Array.prototype.slice.call(select.childNodes).some(n => n.value === values[selectorIndex])) {
        select.value = values[selectorIndex]
      }
    })
}

const getMediaStream = async () =>  {
  if (mediaStream) {
    mediaStream.getTracks().forEach(track => {
      track.stop()
    })
  }


  const audioSource = audioInputSelect.value
  const videoSource = videoInputSelect.value

  // Specify media constraints. Set audio and video source from input selects.
  const mediaConstraints = {
    audio: {
      deviceId: audioSource ? {exact: audioSource} : undefined,
      noiseSuppression: false,
      channelCount: 2,
      echoCancellation: false,
    },
    video: {
      deviceId: videoSource ? {exact: videoSource} : undefined,
      width: { ideal: 1280 },
      height: { ideal: 720 },
      // more than 30 fps often lowers performance (browser-side) and image quality.
      // only use higher frameRate if you know it will work
      frameRate: { ideal: 30, max: 30 },
    },
  }

  try {
    mediaStream = await navigator.mediaDevices.getUserMedia(mediaConstraints)
    await updateDeviceList()
    // show stream on local video object. Skip for audio only streams
    if (localVideo) {
      localVideo.srcObject = mediaStream
      localVideo.style.display = "block"
    }
  } catch (error) {
    console.error(error)    
  }
}

const disableInput = () => {
  stopButton.classList.remove("hidden")
  startButton.disabled = true
  streamKeyInput.disabled = true
  audioInputSelect.disabled = true
  videoInputSelect.disabled = true
  streamForm.disabled = true
}

const enableInput = () => {
  stopButton.classList.add("hidden")
  startButton.disabled = false
  streamKeyInput.disabled = false
  audioInputSelect.disabled = false
  videoInputSelect.disabled = false
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
    stopWebrtc()
  }
}

// remember to unload instance when it's not wanted any longer,
// in order of removing timers, intervals, etc
const stopWebrtc = async () => {
  await webrtcIngest?.unload()
  getMediaStream()
  enableInput()
}
stopButton.onclick = stopWebrtc

// get streamkey from form and start webrtcingest session
streamForm.onsubmit = (e) => {
  e.preventDefault()
  const streamKey = streamKeyInput.value

  if (mediaStream) {
    void startWebrtc(streamKey)
    streamState.textContent = "initializing..."
    // inputs are not allowed to be changed when broadcasting
  disableInput()
  }
}
 
audioInputSelect.onchange = getMediaStream
videoInputSelect.onchange = getMediaStream
MediaDevices.ondevicechange = updateDeviceList

getMediaStream()
