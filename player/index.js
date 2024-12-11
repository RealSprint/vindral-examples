const player = document.querySelector("#vindral-player")
const playbackState = document.querySelector("#playback-state")

player.addEventListener("vindral-instance-ready", () => {
  // Errors are emitted when they can not be handled internally
  // fatal errors means that the client has been unloaded and will need to be re-initialized
  player.instance.on("error", (error) => {
    if (error.isFatal()) {
      // A fatal error has occurred and the instance has been unloaded, read error.message to see what
      // This can happen if the client has been unsuccessful to connect or authentication failed
      // In this case a new Vindral instance needs to be created to restore the session
      console.log("fatal error: ", error.message)
    }
  })

  // This event is emitted when the playback state changes - can be used to show a buffer spinner during buffering
  player.instance.on("playback state", (state) => (playbackState.textContent = state))

  // This event is emitted when timed metadata events occur
  player.instance.on("metadata", (metadata) => console.log("metadata: ", metadata.content))
})
