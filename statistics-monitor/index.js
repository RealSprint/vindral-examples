import { Vindral } from "@vindral/web-sdk"

const vindralContainer = document.querySelector("#vindral-container")
const button = document.querySelector("#activate-audio-button")
const playbackState = document.querySelector("#playback-state")

// Statistics element references matching QoS app structure
const elements = {
  // Playback stats
  playbackState: document.querySelector("#playback-state-value"),
  lastBufferEvent: document.querySelector("#last-buffer-event-value"),
  bufferFullness: document.querySelector("#buffer-fullness-value"),
  timeSpentBuffering: document.querySelector("#time-spent-buffering-value"),
  timeSpentPlaying: document.querySelector("#time-spent-playing-value"),
  renditionLevelChanges: document.querySelector("#rendition-level-changes-value"),
  timeToFirstFrame: document.querySelector("#time-to-first-frame-value"),

  // Sync stats
  seekTime: document.querySelector("#seek-time-value"),
  drift: document.querySelector("#drift-value"),
  driftAdjustments: document.querySelector("#drift-adjustments-value"),
  timeshiftDriftAdjustments: document.querySelector("#timeshift-drift-adjustments-value"),

  // Connection stats
  edgeUrl: document.querySelector("#edge-url-value"),
  protocol: document.querySelector("#protocol-value"),
  connectionState: document.querySelector("#connection-state-value"),
  rtt: document.querySelector("#rtt-value"),
  estimatedBandwidth: document.querySelector("#estimated-bandwidth-value"),
  totalBitrate: document.querySelector("#total-bitrate-value"),
  connectionCount: document.querySelector("#connection-count-value"),

  // Time stats
  serverEdgeTime: document.querySelector("#server-edge-time-value"),
  channelCurrentTime: document.querySelector("#channel-current-time-value"),
  playbackWallclockTime: document.querySelector("#playback-wallclock-time-value"),
  serverWallclockTime: document.querySelector("#server-wallclock-time-value"),
  playbackLatency: document.querySelector("#playback-latency-value"),
  uptime: document.querySelector("#uptime-value"),

  // Session stats
  sdkVersion: document.querySelector("#sdk-version-value"),
  clientId: document.querySelector("#client-id-value"),
  sessionId: document.querySelector("#session-id-value"),
  channelId: document.querySelector("#channel-id-value"),
  channelGroupId: document.querySelector("#channel-group-id-value"),

  // Navigator Estimations
  navigatorRtt: document.querySelector("#navigator-rtt-value"),
  navigatorDownlink: document.querySelector("#navigator-downlink-value"),
  navigatorConnectionType: document.querySelector("#navigator-connection-type-value"),
  navigatorEffectiveType: document.querySelector("#navigator-effective-type-value"),
  navigatorSaveData: document.querySelector("#navigator-save-data-value"),

  // Decode Performance
  renderedVideoFrames: document.querySelector("#rendered-video-frames-value"),
  droppedVideoFrames: document.querySelector("#dropped-video-frames-value"),
  videoDecodeRate: document.querySelector("#video-decode-rate-value"),
  videoDecodeTime: document.querySelector("#video-decode-time-value"),
  videoTransportTime: document.querySelector("#video-transport-time-value"),
  audioDecodeTime: document.querySelector("#audio-decode-time-value"),

  // Current Rendition
  videoBitrate: document.querySelector("#video-bitrate-value"),
  audioBitrate: document.querySelector("#audio-bitrate-value"),
  videoResolution: document.querySelector("#video-resolution-value"),
  videoCodec: document.querySelector("#video-codec-value"),
  audioCodec: document.querySelector("#audio-codec-value")
}

button.style.display = "none"

const instance = new Vindral({
  url: "https://lb.cdn.vindral.com",
  channelId: "vindral_demo1_ci_099ee1fa-80f3-455e-aa23-3d184e93e04f",
})

// Store previous values to detect changes
let previousStats = {}

// Quality dashboard elements
const qualityDashboard = {
  connectionHealth: document.querySelector("#connection-health"),
  playbackHealth: document.querySelector("#playback-health"),
  bufferHealth: document.querySelector("#buffer-health")
}

// Buffer control elements
const bufferControls = {
  currentBufferTime: document.querySelector("#current-buffer-time"),
  decreaseBtn: document.querySelector("#decrease-buffer"),
  increaseBtn: document.querySelector("#increase-buffer"),
  graph: document.querySelector("#buffer-graph")
}

// Buffer control state
let bufferTimeTarget = 1500 // Default buffer time in ms

// Helper functions for formatting
function formatBitRate(bitrate) {
  if (!bitrate || bitrate === 0 || !isFinite(bitrate)) return "N/A"
  if (bitrate >= 1000000) {
    return `${(bitrate / 1000000).toFixed(1)} Mbps`
  } else if (bitrate >= 1000) {
    return `${(bitrate / 1000).toFixed(0)} kbps`
  }
  return `${bitrate} bps`
}

function formatTime(ms) {
  if (ms === null || ms === undefined || !isFinite(ms)) return "N/A"
  if (ms === 0) return "0ms"
  if (ms >= 60000) {
    return `${(ms / 60000).toFixed(1)}m`
  } else if (ms >= 1000) {
    return `${(ms / 1000).toFixed(1)}s`
  }
  return `${Math.round(ms)}ms`
}

function formatRTT(rtt) {
  if (!rtt || typeof rtt !== 'object' || !rtt.average) return "N/A"
  const avg = rtt.average.toFixed(1)
  const min = rtt.min?.toFixed(1) || 'N/A'
  const max = rtt.max?.toFixed(1) || 'N/A'
  return `${avg}ms (${min}-${max})`
}

function formatDecodeTime(decodeTime) {
  if (!decodeTime || typeof decodeTime !== 'object' || !decodeTime.average) return "N/A"
  return `${decodeTime.average.toFixed(1)}ms`
}

function formatEdgeUrl(url) {
  if (!url || typeof url !== 'string') return "N/A"
  try {
    const urlObj = new URL(url)
    return urlObj.hostname
  } catch (error) {
    // If URL parsing fails, try to extract hostname manually
    const match = url.match(/\/\/([^\/]+)/)
    return match ? match[1] : url
  }
}

function updateElement(element, value, formatter = null) {
  if (!element) return

  let formattedValue
  if (formatter) {
    formattedValue = formatter(value)
  } else if (value === null || value === undefined) {
    formattedValue = "N/A"
  } else if (typeof value === 'string') {
    formattedValue = value || "N/A"
  } else if (typeof value === 'number') {
    formattedValue = isFinite(value) ? value.toString() : "N/A"
  } else {
    formattedValue = value?.toString() || "N/A"
  }

  const previousValue = element.textContent

  if (previousValue !== formattedValue) {
    element.textContent = formattedValue
    // Add flash animation for updated values
    element.classList.remove("updated")
    requestAnimationFrame(() => {
      element.classList.add("updated")
      setTimeout(() => element.classList.remove("updated"), 600)
    })
  }
}

// Helper functions for formatting like QoS app
function formatProtocol(protocol) {
  switch (protocol) {
    case "moq":
      return "Media over QUIC"
    case "vindral_ws":
      return "Vindral WebSocket"
    default:
      return protocol || "Not determined yet"
  }
}

function formatTimestamp(timestamp) {
  if (!timestamp || !isFinite(timestamp)) return "N/A"
  return new Date(timestamp).toISOString().slice(11, 23) // HH:MM:SS.mmm
}

function updateStatistics() {
  try {
    const stats = instance.getStatistics()

    // Playback Statistics (like QoS Playback component)
    updateElement(elements.playbackState, instance.playbackState)
    updateElement(elements.lastBufferEvent, instance.lastBufferEvent)

    const bufferFullness = instance.bufferFullness
    if (typeof bufferFullness === 'number' && isFinite(bufferFullness)) {
      updateElement(elements.bufferFullness, `${(bufferFullness * 100).toFixed()}%`)
    } else {
      updateElement(elements.bufferFullness, "N/A")
    }

    const timeSpentBuffering = instance.timeSpentBuffering
    const timeActive = instance.timeActive
    updateElement(elements.timeSpentBuffering, formatTime(timeSpentBuffering))
    updateElement(elements.timeSpentPlaying, formatTime(timeActive - timeSpentBuffering))
    updateElement(elements.renditionLevelChanges, stats.renditionLevelChangeCount?.toString())
    updateElement(elements.timeToFirstFrame, stats.timeToFirstFrame ? `${stats.timeToFirstFrame.toFixed(2)}ms` : "Loading...")

    // Sync Statistics (like QoS Sync component)
    updateElement(elements.seekTime, `${(stats.seekTime ?? 0).toFixed(2)}ms`)
    updateElement(elements.drift, `${(stats.drift ?? 0).toFixed(2)}ms`)
    updateElement(elements.driftAdjustments, stats.driftAdjustmentCount?.toString())
    updateElement(elements.timeshiftDriftAdjustments, stats.timeshiftDriftAdjustmentCount?.toString())

    // Connection Statistics (like QoS Connection component)
    updateElement(elements.edgeUrl, stats.edgeUrl ? formatEdgeUrl(stats.edgeUrl) : "No edge url yet")
    updateElement(elements.protocol, formatProtocol(stats.connectionProtocol))
    updateElement(elements.connectionState, instance.connectionState)

    const rtt = stats.rtt
    if (rtt && rtt.last) {
      updateElement(elements.rtt, `${rtt.last.toFixed(1)}ms`)
    } else {
      updateElement(elements.rtt, "N/A")
    }

    updateElement(elements.estimatedBandwidth, formatBitRate(stats.estimatedBandwidth))
    updateElement(elements.totalBitrate, formatBitRate(instance.videoBitRate + instance.audioBitRate))
    updateElement(elements.connectionCount, stats.connectCount?.toString())

    // Time Statistics (like QoS Time component)
    updateElement(elements.serverEdgeTime, formatTimestamp(instance.serverEdgeTime))
    updateElement(elements.channelCurrentTime, formatTimestamp(instance.channelCurrentTime))
    updateElement(elements.playbackWallclockTime, instance.playbackWallclockTime ? new Date(instance.playbackWallclockTime).toUTCString() : "Loading...")
    updateElement(elements.serverWallclockTime, instance.serverWallclockTime ? new Date(instance.serverWallclockTime).toUTCString() : "Loading...")
    updateElement(elements.playbackLatency, instance.playbackLatency ? `${instance.playbackLatency.toFixed(2)}ms` : "Loading...")
    updateElement(elements.uptime, formatTime(instance.uptime))

    // Session Statistics (like QoS Session component)
    updateElement(elements.sdkVersion, stats.version)
    updateElement(elements.clientId, stats.clientId)
    updateElement(elements.sessionId, stats.sessionId || "N/A")
    updateElement(elements.channelId, stats.channelId)
    updateElement(elements.channelGroupId, stats.channelGroupId || "N/A")

    // Navigator Estimations (like QoS NavigatorEstimations component)
    updateElement(elements.navigatorRtt, stats.navigatorRtt ? `${stats.navigatorRtt.toFixed(2)}ms` : "N/A")
    updateElement(elements.navigatorDownlink, stats.navigatorDownlink ? formatBitRate(stats.navigatorDownlink * 1000 * 1000) : "N/A")
    updateElement(elements.navigatorConnectionType, stats.navigatorConnectionType || "N/A")
    updateElement(elements.navigatorEffectiveType, stats.navigatorEffectiveType || "N/A")
    updateElement(elements.navigatorSaveData, stats.navigatorSaveData ? "Enabled" : "Disabled")

    // Decode Performance Statistics (like QoS DecodePerformance component)
    // Rendered frames
    if (typeof stats.renderedFrameCount === "number") {
      updateElement(elements.renderedVideoFrames, stats.renderedFrameCount.toString())
    } else if (typeof stats.totalVideoFrames === "number") {
      updateElement(elements.renderedVideoFrames, stats.totalVideoFrames.toString())
    } else {
      updateElement(elements.renderedVideoFrames, "N/A")
    }

    // Dropped frames
    if (typeof stats.rendererDroppedFrameCount === "number") {
      updateElement(elements.droppedVideoFrames, stats.rendererDroppedFrameCount.toString())
    } else if (typeof stats.droppedVideoFrames === "number") {
      updateElement(elements.droppedVideoFrames, stats.droppedVideoFrames.toString())
    } else {
      updateElement(elements.droppedVideoFrames, "N/A")
    }

    // Decode performance stats
    updateElement(elements.videoDecodeRate, stats.videoDecodeRate ? stats.videoDecodeRate.toFixed(1) : "N/A")

    if (stats.videoDecodeTime) {
      updateElement(elements.videoDecodeTime, `${stats.videoDecodeTime.average.toFixed(1)} (${stats.videoDecodeTime.min.toFixed(1)}/${stats.videoDecodeTime.max.toFixed(1)}) ms`)
    } else {
      updateElement(elements.videoDecodeTime, "N/A")
    }

    if (stats.videoTransportTime) {
      updateElement(elements.videoTransportTime, `${stats.videoTransportTime.average.toFixed(1)} (${stats.videoTransportTime.min.toFixed(1)}/${stats.videoTransportTime.max.toFixed(1)}) ms`)
    } else {
      updateElement(elements.videoTransportTime, "N/A")
    }

    if (stats.audioDecodeTime) {
      updateElement(elements.audioDecodeTime, `${stats.audioDecodeTime.average.toFixed(1)} (${stats.audioDecodeTime.min.toFixed(1)}/${stats.audioDecodeTime.max.toFixed(1)}) ms`)
    } else {
      updateElement(elements.audioDecodeTime, "N/A")
    }

    // Current Rendition Statistics (like rendition metadata)
    const videoBitRate = instance.videoBitRate
    const audioBitRate = instance.audioBitRate

    updateElement(elements.videoBitrate, videoBitRate > 0 ? formatBitRate(videoBitRate) : "N/A")
    updateElement(elements.audioBitrate, audioBitRate > 0 ? formatBitRate(audioBitRate) : "N/A")

    // Resolution from statistics or current level metadata
    let resolution = null
    if (stats.videoWidth && stats.videoHeight) {
      resolution = `${stats.videoWidth}x${stats.videoHeight}`
    } else {
      const currentLevel = instance.renditionLevel
      if (currentLevel?.video?.width && currentLevel?.video?.height) {
        resolution = `${currentLevel.video.width}x${currentLevel.video.height}`
      }
    }

    updateElement(elements.videoResolution, resolution)
    updateElement(elements.videoCodec, stats.videoCodec)
    updateElement(elements.audioCodec, stats.audioCodec)

    // Update buffer visualization
    updateBufferVisualization()

    // Update quality dashboard
    updateQualityDashboard(stats)

    // Debug logging (reduced frequency)
    if (!window._lastStatsLog || Date.now() - window._lastStatsLog > 10000) {
      console.log("Statistics updated:", { playbackState: instance.playbackState, bufferFullness, timeActive })
      window._lastStatsLog = Date.now()
    }

  } catch (error) {
    console.error("Error updating statistics:", error)
    console.error(error.stack)
  }
}// Animation frame loop for real-time updates
let rafId
function animate() {
  updateStatistics()
  rafId = requestAnimationFrame(animate)
}

// Start animation loop when instance is ready
function startStatisticsMonitoring() {
  console.log("Starting statistics monitoring...")
  animate()
}

// Stop animation loop
function stopStatisticsMonitoring() {
  if (rafId) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
}

// Vindral event listeners
instance.on("error", (error) => {
  if (error.isFatal()) {
    console.log("fatal error: ", error.message)
    stopStatisticsMonitoring()
  }
})

instance.on("playback state", (state) => {
  playbackState.textContent = state
  console.log("Playback state changed:", state)

  // Start monitoring when playing, pause when not
  if (state === "playing") {
    startStatisticsMonitoring()
  } else if (state === "ended" || state === "error") {
    stopStatisticsMonitoring()
  }
})

instance.on("metadata", (metadata) => console.log("metadata: ", metadata.content))

instance.on("needs user input", () => {
  console.log("Needs user input for audio")
  button.style.display = "block"
})

instance.on("rendition level", (level) => {
  console.log("Rendition level changed:", level)
  // Reset logging flag when rendition changes
  window._statsLogged = false
})

instance.on("connection state", (state) => {
  console.log("Connection state:", state)
  if (state === "connected") {
    // Reset logging flag when connected
    window._statsLogged = false
    // Sync buffer time target with instance
    if (instance.targetBufferTime && instance.targetBufferTime !== bufferTimeTarget) {
      bufferTimeTarget = instance.targetBufferTime
      bufferControls.currentBufferTime.textContent = `${bufferTimeTarget} ms`
      console.log(`Synced buffer time target to instance value: ${bufferTimeTarget}ms`)
    }
  }
})

// Initialize the player
instance.play()
instance.attach(vindralContainer)

// Audio activation button
button.addEventListener("click", () => {
  button.style.display = "none"
  instance.play()
})

// Buffer control functionality
function updateBufferTime(newTime) {
  bufferTimeTarget = Math.max(500, Math.min(5000, newTime)) // Clamp between 0.5s and 5s
  bufferControls.currentBufferTime.textContent = `${bufferTimeTarget} ms`

  // Update the Vindral instance buffer time
  if (instance) {
    instance.targetBufferTime = bufferTimeTarget
    console.log(`Buffer time updated to: ${bufferTimeTarget}ms`)
  }
}

bufferControls.decreaseBtn.addEventListener("click", () => {
  updateBufferTime(bufferTimeTarget - 250)
})

bufferControls.increaseBtn.addEventListener("click", () => {
  updateBufferTime(bufferTimeTarget + 250)
})

// Buffer visualization - shows audio and video buffer ranges like QoS app
function drawBufferGraph() {
  const canvas = bufferControls.graph
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const width = canvas.width
  const height = canvas.height

  // Clear canvas
  ctx.fillStyle = '#343a40'
  ctx.fillRect(0, 0, width, height)

  if (!instance) return

  // Get buffer ranges and current time
  const videoRanges = instance.videoBufferedRanges || []
  const audioRanges = instance.audioBufferedRanges || []
  const currentTime = instance.currentTime || 0

  // Time window configuration (like QoS app: 3s history, 3s future)
  const historyWindow = 3000 // 3 seconds in milliseconds
  const futureWindow = 3000   // 3 seconds in milliseconds
  const totalWindow = historyWindow + futureWindow
  const windowStart = currentTime - historyWindow
  const windowEnd = currentTime + futureWindow

  // Calculate layout - two buffer bars stacked vertically
  const barHeight = (height - 60) / 2 // Leave space for labels and margins
  const barY1 = 20 // Video buffer bar
  const barY2 = barY1 + barHeight + 20 // Audio buffer bar
  const barX = 40
  const barWidth = width - 80

  // Helper function to draw a single buffer bar
  function drawBuffer(x, y, w, h, ranges, label, color) {
    // Draw background with grid lines
    ctx.fillStyle = '#495057'
    ctx.fillRect(x, y, w, h)

    // Draw time grid lines (every 500ms)
    ctx.strokeStyle = '#6c757d'
    ctx.lineWidth = 1
    for (let time = Math.ceil(windowStart / 500) * 500; time <= windowEnd; time += 500) {
      const gridX = x + ((time - windowStart) / totalWindow) * w
      if (gridX >= x && gridX <= x + w) {
        ctx.beginPath()
        ctx.moveTo(gridX, y)
        ctx.lineTo(gridX, y + h)
        ctx.stroke()
      }
    }

    // Draw buffered ranges
    ctx.fillStyle = color
    ranges.forEach(range => {
      const startTime = Math.max(range.start || 0, windowStart)
      const endTime = Math.min(range.end || 0, windowEnd)

      if (endTime > startTime) {
        const startX = x + ((startTime - windowStart) / totalWindow) * w
        const endX = x + ((endTime - windowStart) / totalWindow) * w
        const rangeWidth = Math.max(2, endX - startX)

        ctx.fillRect(startX, y + 2, rangeWidth, h - 4)
      }
    })

    // Draw playhead (current time) - always in the center
    const playheadX = x + (historyWindow / totalWindow) * w
    ctx.strokeStyle = '#ff0000'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(playheadX, y)
    ctx.lineTo(playheadX, y + h)
    ctx.stroke()

    // Draw border
    ctx.strokeStyle = '#6c757d'
    ctx.lineWidth = 1
    ctx.strokeRect(x, y, w, h)

    // Draw label
    ctx.fillStyle = '#f8f9fa'
    ctx.font = '12px monospace'
    ctx.textAlign = 'left'
    ctx.fillText(label, 5, y + h/2 + 4)
  }

  // Draw video buffer
  drawBuffer(barX, barY1, barWidth, barHeight, videoRanges, 'Video', '#17a2b8')

  // Draw audio buffer
  drawBuffer(barX, barY2, barWidth, barHeight, audioRanges, 'Audio', '#6f42c1')

  // Draw time scale labels
  ctx.fillStyle = '#adb5bd'
  ctx.font = '10px monospace'
  ctx.textAlign = 'center'

  // Draw labels for -3s, -2s, -1s, 0s, +1s, +2s, +3s
  for (let i = -3; i <= 3; i++) {
    const labelX = barX + ((historyWindow + i * 1000) / totalWindow) * barWidth
    ctx.fillText(`${i}s`, labelX, height - 5)
  }

  // Draw legend
  ctx.font = '10px monospace'
  ctx.textAlign = 'left'
  ctx.fillStyle = '#adb5bd'
  ctx.fillText('Red: Playhead | Colored bars: Buffered data', barX, 12)
}

function updateBufferVisualization() {
  // Simply redraw the buffer graph with current data
  drawBufferGraph()
}

// Quality dashboard update function
function updateQualityDashboard(stats) {
  if (!qualityDashboard.connectionHealth) return

  // Connection Health Assessment
  let connectionStatus = 'good'
  let connectionText = 'Good'

  const rtt = stats.rtt?.average || stats.rtt?.last
  const bandwidth = stats.estimatedBandwidth

  if (!rtt || !bandwidth || instance.connectionState !== 'connected') {
    connectionStatus = 'error'
    connectionText = 'Disconnected'
  } else if (rtt > 200 || bandwidth < 1000000) {
    connectionStatus = 'error'
    connectionText = 'Poor'
  } else if (rtt > 100 || bandwidth < 5000000) {
    connectionStatus = 'warning'
    connectionText = 'Fair'
  }

  // Playback Health Assessment
  let playbackStatus = 'good'
  let playbackText = 'Stable'

  const droppedFrames = stats.droppedVideoFrames || stats.rendererDroppedFrameCount || 0
  const playbackState = instance.playbackState

  if (playbackState === 'error' || playbackState === 'ended') {
    playbackStatus = 'error'
    playbackText = 'Error'
  } else if (playbackState === 'buffering' || instance.lastBufferEvent === 'buffering') {
    playbackStatus = 'warning'
    playbackText = 'Buffering'
  } else if (droppedFrames > 10) {
    playbackStatus = 'warning'
    playbackText = 'Drops'
  }

  // Buffer Health Assessment
  let bufferStatus = 'good'
  let bufferText = 'Healthy'

  const bufferFullness = instance.bufferFullness || 0

  if (bufferFullness < 0.3) {
    bufferStatus = 'warning'
    bufferText = 'Low'
  } else if (bufferFullness < 0.1) {
    bufferStatus = 'error'
    bufferText = 'Critical'
  }

  // Update DOM elements
  updateQualityIndicator(qualityDashboard.connectionHealth, connectionStatus, connectionText)
  updateQualityIndicator(qualityDashboard.playbackHealth, playbackStatus, playbackText)
  updateQualityIndicator(qualityDashboard.bufferHealth, bufferStatus, bufferText)
}

function updateQualityIndicator(element, status, text) {
  if (!element) return

  const dot = element.querySelector('.indicator-dot')
  const value = element.querySelector('.indicator-value')

  if (dot) {
    dot.className = `indicator-dot ${status}`
  }

  if (value) {
    value.textContent = text
  }
}

// Clean up on page unload
window.addEventListener("beforeunload", () => {
  stopStatisticsMonitoring()
})

// Initialize canvas sizing
function resizeCanvas() {
  const canvas = bufferControls.graph
  const container = canvas.parentElement
  const rect = container.getBoundingClientRect()

  canvas.width = rect.width - 32 // Account for padding
  canvas.height = 150

  drawBufferGraph()
}

// Resize canvas on window resize
window.addEventListener('resize', resizeCanvas)

// Initial setup
setTimeout(() => {
  resizeCanvas()
  // Initialize buffer time display
  updateBufferTime(1500)
}, 100)

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  // Only handle shortcuts when not in an input field
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return

  switch (e.key) {
    case ' ': // Spacebar to play/pause
      e.preventDefault()
      if (instance.playbackState === 'playing') {
        instance.pause()
      } else {
        instance.play()
      }
      break
    case '-': // Decrease buffer time
      e.preventDefault()
      updateBufferTime(bufferTimeTarget - 250)
      break
    case '+':
    case '=': // Increase buffer time
      e.preventDefault()
      updateBufferTime(bufferTimeTarget + 250)
      break
  }
})

// Start initial statistics update
startStatisticsMonitoring()
