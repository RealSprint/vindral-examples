import { Player } from "@vindral/web-sdk"

const vindralContainer = document.querySelector("#vindral-container")
const playbackState = document.querySelector("#playback-state")

const player = new Player({
  url: "https://lb.cdn.vindral.com",
  channelId: "vindral_demo1_ci_099ee1fa-80f3-455e-aa23-3d184e93e04f",
  // if providing a channelGroupId, the player with add the channel selector in its controls section
  // making it possible to switch channel inline, without re-initiating the player
  channelGroupId: "vindral_demo_pk_932730be-db0c-46a0-a592-cfce7bdc5a43",
})

// Errors are emitted when they can not be handled internally
// fatal errors means that the client has been unloaded and will need to be re-initialized
player.core.on("error", (error) => {
  if (error.isFatal()) {
    // A fatal error has occured and the instance has been unloaded, read error.message to see what
    // This can happen if the client has been unsuccessful to connect or authentication failed
    // In this case a new Vindral instance needs to be created to restore the session
    console.log("fatal error: ", error.message)
  }
})

// This event is emitted when the playback state changes - can be used to show a buffer spinner during buffering
player.core.on("playback state", (state) => (playbackState.textContent = state))

// This event is emitted when timed metadata events occur
player.core.on("metadata", (metadata) => console.log("metadata: ", metadata.content))

// Starts connecting to the channel
player.core.connect()

// Attaches the player view to the DOM
player.attach(vindralContainer)