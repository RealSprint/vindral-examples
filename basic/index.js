import { Vindral } from "@vindral/web-sdk"

const vindralContainer = document.querySelector("#vindral-container")
const button = document.querySelector("#activate-audio-button")
const playbackState = document.querySelector("#playback-state")

button.style.display = "none"

const instance = new Vindral({
  url: "https://lb.cdn.vindral.com",
  channelId: "vindral_demo1_ci_099ee1fa-80f3-455e-aa23-3d184e93e04f",
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
instance.on("playback state", (state) => (playbackState.textContent = state))

// This event is emitted when timed metadata events occur
instance.on("metadata", (metadata) => console.log("metadata: ", metadata.content))

// This event is emitted when the vindral detects that the browser requires a user initiated click event to start audio
instance.on("needs user input", () => (button.style.display = "block"))

// Will connect, start the stream and try to play
instance.play()

// Attaches the video view to the DOM
instance.attach(vindralContainer)

// This activates audio on browsers that need a user input before audio can be played
button.addEventListener("click", () => {
  button.style.display = "none"
  instance.play()
})
