import { Publisher } from "@vindral/publisher"

const localVideo = document.querySelector("#local-video")
const publishForm = document.querySelector("#publish-form")
const publisherState = document.querySelector("#publisher-state")
const submitButton = document.querySelector("#submit-button")
const stopButton = document.querySelector("#stop-button")
const channelInput = document.querySelector("#channel-input")
const authInput = document.querySelector("#auth-input")
const audioSelect = document.querySelector("#audioSource")
const videoSelect = document.querySelector("#videoSource")

let mediaStream
let publisher

const PUBLISH_URL = "https://moq.global.cdn.vindral.com:7001/voq/publish"

// Enumerate available audio and video input devices and populate the dropdowns.
const updateDeviceList = async () => {
  const devices = await navigator.mediaDevices.enumerateDevices()
  const prevAudio = audioSelect.value
  const prevVideo = videoSelect.value

  audioSelect.innerHTML = ""
  videoSelect.innerHTML = ""

  for (const device of devices) {
    const option = document.createElement("option")
    option.value = device.deviceId

    if (device.kind === "audioinput") {
      option.text = device.label || `Microphone ${audioSelect.length + 1}`
      audioSelect.appendChild(option)
    } else if (device.kind === "videoinput") {
      option.text = device.label || `Camera ${videoSelect.length + 1}`
      videoSelect.appendChild(option)
    }
  }

  // Restore previous selection if it still exists.
  if ([...audioSelect.options].some((o) => o.value === prevAudio)) audioSelect.value = prevAudio
  if ([...videoSelect.options].some((o) => o.value === prevVideo)) videoSelect.value = prevVideo
}

// Request a media stream using the currently selected devices.
const getMediaStream = async () => {
  if (mediaStream) {
    mediaStream.getTracks().forEach((t) => t.stop())
  }

  const constraints = {
    audio: {
      deviceId: audioSelect.value ? { exact: audioSelect.value } : undefined,
      channelCount: 2,
      noiseSuppression: false,
      echoCancellation: false,
    },
    video: {
      deviceId: videoSelect.value ? { exact: videoSelect.value } : undefined,
      width: { ideal: 1280 },
      height: { ideal: 720 },
      frameRate: { ideal: 30, max: 30 },
    },
  }

  try {
    mediaStream = await navigator.mediaDevices.getUserMedia(constraints)
    await updateDeviceList()
    localVideo.srcObject = mediaStream
  } catch (error) {
    console.error("Failed to get media stream:", error)
  }
}

const disableInputs = () => {
  stopButton.classList.remove("hidden")
  submitButton.disabled = true
  channelInput.disabled = true
  authInput.disabled = true
  audioSelect.disabled = true
  videoSelect.disabled = true
}

const enableInputs = () => {
  stopButton.classList.add("hidden")
  submitButton.disabled = false
  channelInput.disabled = false
  authInput.disabled = false
  audioSelect.disabled = false
  videoSelect.disabled = false
}

// Create a new Publisher, add media tracks, and start publishing.
const startPublishing = async () => {
  publisher = new Publisher({
    url: PUBLISH_URL,
    channelId: channelInput.value,
    authToken: authInput.value,
  })

  publisher.on("publisher state", (state) => {
    publisherState.textContent = state
  })

  publisher.on("connection state", (state) => {
    publisherState.textContent = `${publisher.state} | ${state}`
  })

  publisher.on("error", (error) => {
    console.error("Publisher error:", error)
    publisherState.textContent = `error: ${error.code}`
  })

  const videoTrack = mediaStream.getVideoTracks()[0]
  const audioTrack = mediaStream.getAudioTracks()[0]

  // Tracks can only be added while the publisher is in "idle" state.
  if (videoTrack) {
    publisher.addTrack({
      kind: "video",
      track: videoTrack,
      config: {
        codec: "avc1.42001f",
        width: 1280,
        height: 720,
        framerate: 30,
        bitrate: 2_000_000,
        gopSize: 60,
      },
    })
  }

  if (audioTrack) {
    publisher.addTrack({
      kind: "audio",
      track: audioTrack,
      config: {
        codec: "opus",
        sampleRate: 48000,
        numberOfChannels: 2,
        bitrate: 128_000,
      },
    })
  }

  try {
    await publisher.publish()
  } catch (error) {
    console.error("Failed to publish:", error)
    void stopPublishing()
  }
}

// Close the publisher and re-acquire the media stream for preview.
const stopPublishing = async () => {
  if (publisher) {
    await publisher.close()
    publisher = null
  }
  publisherState.textContent = "disconnected"
  enableInputs()
  void getMediaStream()
}

// Wire up form submit, stop button, and source change handlers.
publishForm.onsubmit = (e) => {
  e.preventDefault()
  if (!mediaStream) return
  disableInputs()
  publisherState.textContent = "connecting..."
  void startPublishing()
}

stopButton.onclick = () => void stopPublishing()
audioSelect.onchange = getMediaStream
videoSelect.onchange = getMediaStream
navigator.mediaDevices.addEventListener("devicechange", updateDeviceList)

// Request permission and populate device lists on load.
getMediaStream()
