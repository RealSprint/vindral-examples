import { Vindral } from "@vindral/web-sdk"

const vindralArea = document.querySelector("#vindral-area")
const vindralContainer = document.querySelector("#vindral-container")
const button = document.querySelector("#activate-audio-button")
const playbackState = document.querySelector("#playback-state")
const thumbnail = document.querySelector("#vindral-thumbnail")
const startButton = document.querySelector("#start-button")
const stopButton = document.querySelector("#stop-button")
const channelButton = document.querySelector("#channel-button")

const channelGroupId = "vindral_demo_pk_932730be-db0c-46a0-a592-cfce7bdc5a43"
const channels = [
  "vindral_demo1_ci_099ee1fa-80f3-455e-aa23-3d184e93e04f",
  "vindral_demo2_ci_dbd1ca98-4e05-4a36-8215-0e8bca295ed2",
  "vindral_demo3_ci_e922b823-3746-481d-bdde-57f356989f71",
]

let instance
let currentChannelIndex = 0

button.style.display = "none"

function setPlaying() {
  vindralArea.classList.remove('buffering')
}

function setBuffering() {
  vindralArea.classList.add('buffering')
}

function start() {
  stop()
  playbackState.textContent = "initializing..."
  thumbnail.innerHTML = `<img src="https://lb.cdn.vindral.com/api/thumbnail?channelId=vindral_demo1_ci_099ee1fa-80f3-455e-aa23-3d184e93e04f&width=640&height=360" alt="">`
  instance = new Vindral({
    url: "https://lb.cdn.vindral.com",
    channelId: channels[currentChannelIndex],
    channelGroupId,
    minBufferTime: 1000, // your target buffer time / latency
  })

  // Errors are emitted when they can not be handled internally
  // fatal errors means that the client has been unloaded and will need to be re-initialized
  instance.on("error", (error) => {
    if (error.isFatal()) {
      // A fatal error has occured and the instance has been unloaded, read error.message to see what
      // This can happen if the client has been unsuccessful to connect or authentication failed
      // In this case a new Vindral instance needs to be created to restore the session
      console.log("fatal error: ", error.message)
    }
  })

  // This event is emitted when the playback state changes - can be used to show a buffer spinner during buffering
  instance.on("playback state", (state) => {
    playbackState.textContent = state

    if (state === "playing") {
      thumbnail.style.display = "none"
      setPlaying()
    } else {
      setBuffering()
    }
  })

  // This event is emitted when timed metadata events occur
  instance.on("metadata", (metadata) => console.log("metadata: ", metadata.content))

  // This event is emitted when the vindral detects that the browser requires a user initiated click event to start audio
  instance.on("needs user input", () => (button.style.display = "block"))

  // Will connect, start the stream and try to play
  instance.play()

  // Attaches the video view to the DOM
  instance.attach(vindralContainer)
}

function stop() {
  playbackState.textContent = "stopped"
  instance?.unload()
}

function newChannel() {
  if (!instance) {
    return
  }
  currentChannelIndex = ++currentChannelIndex >= channels.length ? 0 : currentChannelIndex
  instance.channelId = channels[currentChannelIndex]
  console.log(channels[currentChannelIndex])
}

startButton.onclick = () => start()
stopButton.onclick = () => stop()
channelButton.onclick = () => newChannel()
