import { CastSender } from "@vindral/web-sdk/cast-sender"

const vindralContainer = document.querySelector("#vindral-container")
const playbackState = document.querySelector("#playback-state")

const vindralOptions = {
  url: "https://lb.cdn.vindral.com",
  channelId: "vindral_demo1_ci_099ee1fa-80f3-455e-aa23-3d184e93e04f",
}

const castSender = new CastSender({
  receiverApplicationId: "A5452297",
  options: vindralOptions,
})
playbackState.textContent = "initializing"
castSender.on("connected", () => playbackState.textContent = "connected")
castSender.on("resumed", () => playbackState.textContent = "resumed")
castSender.on("disconnected", () => playbackState.textContent = "disconnected")
castSender.on("failed", () => playbackState.textContent = "failed")
castSender.on("metadata", (meta) => console.log("metadata", meta))
castSender.on("server wallclock time", (wallclockTime) => console.log("server wallclock time", wallclockTime))
castSender
.init()
  .then(() => {
    // either create the cast button, that will trigger the native/browser cast receiver picker dialogue
    const castButton = document.createElement("google-cast-launcher")
    vindralContainer.appendChild(castButton)
    playbackState.textContent = "initialized"
    // or call start manually, it will also open the dialogue, like below
    // return castSender.start()
  })
  .catch((err) => {
    playbackState.textContent = "unable to initialize cast"
    // not able to init cast
  })

// when volume should be set
// castSender.volume = 0.5

// when active channel should be switched, just as with regular Vindral instance
// channelGroupId is needed for channelId to be switched (channels can only be switched within a group)
// castSender.channelId = "vindral_demo2_ci_dbd1ca98-4e05-4a36-8215-0e8bca295ed2"

// when sender/session should be closed
// castSender.unload()
