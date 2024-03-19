import { Player } from "@vindral/web-sdk"
import "@vindral/web-sdk/style.css"

const vindralContainer = document.querySelector("#vindral-container")
const playbackState = document.querySelector("#playback-state")

const player = new Player({
  url: "https://lb.cdn.vindral.com",
  channelId: "vindral_demo1_ci_099ee1fa-80f3-455e-aa23-3d184e93e04f",
  // if providing a channelGroupId, the player with add the channel selector in its controls section
  // making it possible to switch channel inline, without re-initiating the player
  channelGroupId: "vindral_demo_pk_932730be-db0c-46a0-a592-cfce7bdc5a43",
  burstEnabled: true,
  muted: true,
}, {
  fullscreenButtonEnabled: false,
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

// Will connect, start the stream and try to play
player.core.play()

// Attaches the player view to the DOM
player.attach(vindralContainer)

let adsManager;
let adsLoader;
let adContainer;
let adDisplayContainer;
let intervalTimer;
let playButton;
let adDisplayContainerInitialized;
let adPaused = false;

const AD_REQUEST_INTERVAL = 30;

/**
 * Initializes IMA setup.
 */
function init() {
  playButton = document.getElementById('playButton');
  playButton.addEventListener('click', playAds);
  setUpAdsLoader();
  // We want a pre-roll, so the first time we request ads set
  // liveStreamPrefetchSeconds to 0.
  requestAds(0);
}

/**
 * Sets up ads loader and associated event listeners.
 */
function setUpAdsLoader() {
  // Create the ad display container.
  createAdDisplayContainer();
  // Create ads loader.
  adsLoader = new google.ima.AdsLoader(adDisplayContainer);
  // Listen and respond to ads loaded and error events.
  adsLoader.addEventListener(
      google.ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED,
      onAdsManagerLoaded, false);
  adsLoader.addEventListener(
      google.ima.AdErrorEvent.Type.AD_ERROR, onAdError, false);
    }

/**
 * Makes an ad request with a prefetch time.
 * @param {number} liveStreamPrefetchSeconds prefetch time in seconds.
 */
function requestAds(liveStreamPrefetchSeconds) {
  if (adsLoader) {
    adsLoader.contentComplete();
  }
  // Request video ads.
  const adsRequest = new google.ima.AdsRequest();
  adsRequest.adTagUrl = 'https://pubads.g.doubleclick.net/gampad/ads?iu=/21775744923/external/vmap_ad_samples&sz=640x480&cust_params=sample_ar%3Dpremidpostlongpod&ciu_szs=300x250&gdfp_req=1&ad_rule=1&output=vmap&unviewed_position_start=1&env=vp&impl=s&cmsid=496&vid=short_onecue&correlator=';

  // Specify the linear and nonlinear slot sizes. This helps the SDK to
  // select the correct creative if multiple are returned.
  adsRequest.linearAdSlotWidth = 640;
  adsRequest.linearAdSlotHeight = 400;

  adsRequest.nonLinearAdSlotWidth = 640;
  adsRequest.nonLinearAdSlotHeight = 150;

  adsRequest.liveStreamPrefetchSeconds = liveStreamPrefetchSeconds;

  adsLoader.requestAds(adsRequest);
}

/**
 * Sets the 'adContainer' div as the IMA ad display container.
 */
function createAdDisplayContainer() {
  // We assume the adContainer is the DOM id of the element that will house
  // the ads.
  adContainer = document.getElementById('adContainer')
  adDisplayContainer = new google.ima.AdDisplayContainer(
    adContainer, vindralContainer);
}

/**
 * Loads the video content and initializes IMA ad playback.
 */
function playAds() {
  if (!adDisplayContainerInitialized) {
    // Initialize the container. Must be done through a user action on mobile
    // devices.
    adDisplayContainer.initialize();
    adDisplayContainerInitialized = true;
  }

  try {
    // Initialize the ads manager. Ad rules playlist will start at this time.
    adsManager.init(640, 360, google.ima.ViewMode.NORMAL);
    // Call play to start showing the ad. Single video and overlay ads will
    // start at this time; the call will be ignored for ad rules.
    adsManager.start();
  } catch (adError) {
    // An error may be thrown if there was a problem with the VAST response.
    // videoContent.play();
    player.core.play();
  }
}

/**
 * Handles the ad manager loading and sets ad event listeners.
 * @param {!google.ima.AdsManagerLoadedEvent} adsManagerLoadedEvent
 */
function onAdsManagerLoaded(adsManagerLoadedEvent) {
  // Get the ads manager.
  const adsRenderingSettings = new google.ima.AdsRenderingSettings();
  adsRenderingSettings.restoreCustomPlaybackStateOnAdBreakComplete = true;
  // videoContent should be set to the content video element.
  adsManager =
      adsManagerLoadedEvent.getAdsManager(vindralContainer, adsRenderingSettings);

  // Add listeners to the required events.
  adsManager.addEventListener(google.ima.AdErrorEvent.Type.AD_ERROR, onAdError);
  adsManager.addEventListener(
      google.ima.AdEvent.Type.CONTENT_PAUSE_REQUESTED, onContentPauseRequested);
  adsManager.addEventListener(
      google.ima.AdEvent.Type.CONTENT_RESUME_REQUESTED,
      onContentResumeRequested);
  adsManager.addEventListener(
      google.ima.AdEvent.Type.ALL_ADS_COMPLETED, onAdEvent);

  // Listen to any additional events, if necessary.
  adsManager.addEventListener(google.ima.AdEvent.Type.LOADED, onAdEvent);
  adsManager.addEventListener(google.ima.AdEvent.Type.STARTED, onAdEvent);
  adsManager.addEventListener(google.ima.AdEvent.Type.COMPLETE, onAdEvent);
  adsManager.addEventListener(google.ima.AdEvent.Type.PAUSED, onAdEvent);
  adsManager.addEventListener(google.ima.AdEvent.Type.RESUMED, onAdEvent);
}

/**
 * Handles actions taken in response to ad events.
 * @param {!google.ima.AdEvent} adEvent
 */
function onAdEvent(adEvent) {
  console.log("onAdEvent", adEvent.type);
  // Retrieve the ad from the event. Some events (for example,
  // ALL_ADS_COMPLETED) don't have ad object associated.
  const ad = adEvent.getAd();
  switch (adEvent.type) {
    case google.ima.AdEvent.Type.LOADED:
      // This is the first event sent for an ad - it is possible to
      // determine whether the ad is a video ad or an overlay.
      if (!ad.isLinear()) {
        // Position AdDisplayContainer correctly for overlay.
        // Use ad.width and ad.height.
        player.core.play();
      }
      break;
    case google.ima.AdEvent.Type.STARTED:
      // This event indicates the ad has started - the video player
      // can adjust the UI, for example display a pause button and
      // remaining time.
      if (ad.isLinear()) {
        // For a linear ad, a timer can be started to poll for
        // the remaining time.
        intervalTimer = setInterval(
            function() {
              // Example: const remainingTime = adsManager.getRemainingTime();
            },
            300);  // every 300ms
      }
      break;
    case google.ima.AdEvent.Type.PAUSED:
      // This event indicates the ad has paused 
        adPaused = true;
      break;
    case google.ima.AdEvent.Type.PAUSED:
      // This event indicates the ad has paused 
        adPaused = false;
      break;
    case google.ima.AdEvent.Type.COMPLETE:
      // This event indicates the ad has finished - the video player
      // can perform appropriate UI actions, such as removing the timer for
      // remaining time detection.
      if (ad.isLinear()) {
        clearInterval(intervalTimer);
      }
      break;
    case google.ima.AdEvent.Type.ALL_ADS_COMPLETED:
      // Request ads no later than 5 seconds before our next ad break.
      requestAds(AD_REQUEST_INTERVAL - 5);
      // Play those ads at the next ad break.
      setTimeout(() => {
        playAds();
      }, AD_REQUEST_INTERVAL * 1000);
      break;
  }
}

/**
 * Handles ad errors.
 * @param {!google.ima.AdErrorEvent} adErrorEvent
 */
function onAdError(adErrorEvent) {
  // Handle the error logging.
  console.log(adErrorEvent.getError());
  adsManager.destroy();
}

/**
 * Pauses video content and sets up ad UI.
 */
function onContentPauseRequested() {
  // This function is where you should setup UI for showing ads (for example,
  // display ad timer countdown, disable seeking and more.)
  adContainer.style.display = "block";
  player.core.pause();
  console.log("onContentPauseRequested")
}

/**
 * Resumes video content and removes ad UI.
 */
function onContentResumeRequested() {
  // This function is where you should ensure that your UI is ready
  // to play content. It is the responsibility of the Publisher to
  // implement this function when necessary.
  adContainer.style.display = "none";
  player.core.play();
  console.log("onContentResumeRequested")
}

document.addEventListener("visibilitychange", () => {
  if (!document.hidden && adPaused) {
    adsManager.resume();
  } 
});

// Wire UI element references and UI event listeners.
init();
