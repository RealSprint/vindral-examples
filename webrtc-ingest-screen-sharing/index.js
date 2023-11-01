import { WebrtcIngest } from "@vindral/webrtc-ingest-sdk";

const localVideo = document.querySelector("#local-video");
const streamKeyForm = document.querySelector("#streamkey-form");
const streamKeyInput = document.querySelector("#streamkey-input");
const streamState = document.querySelector("#stream-state");
const stopButton = document.querySelector("#stop-button");

// more than 30 fps often lowers performance (browser-side) and image quality.
// only use higher frameRate if you know it will work
const DEFAULT_FRAMERATE = 30;

const mediaConstraints = Object.freeze({
  audio: {
    noiseSuppression: false,
    channelCount: 2,
    echoCancellation: false,
  },
  video: {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: DEFAULT_FRAMERATE, max: DEFAULT_FRAMERATE },
  },
});

let cameraFeed;
let screenCaptureFeed;
let inputMediaStream;
let canvasMediaStream;
let webrtcIngest;
let stopAudioTimerLoop;
let rafRef;

const wait = async (time) =>
  new Promise((resolve) => setTimeout(resolve, time));

const audioTimerLoop = (callback, frequency) => {
  // AudioContext time parameters are in seconds
  const freq = frequency / 1000;

  const aCtx = new AudioContext();
  // Chrome needs our oscillator node to be attached to the destination
  // So we create a silent Gain Node
  const silence = aCtx.createGain();
  silence.gain.value = 0;
  silence.connect(aCtx.destination);

  let stopped = false;

  onOSCend();

  function onOSCend() {

    const osc = aCtx.createOscillator();
    osc.onended = onOSCend;
    if (stopped) {
      osc.onended = function () {
        return;
      };
    }

    osc.connect(silence);
    osc.start(0);
    osc.stop(aCtx.currentTime + freq);
    callback(aCtx.currentTime);
  }
  // return a function to stop our loop
  return function () {
    stopped = true;
  };
};

const renderFrameOnCanvas = (canvasSettings, cameraFeed, screenCaptureFeed) => {
  const { context, width, height } = canvasSettings;
  context.drawImage(screenCaptureFeed, 0, 0, width, height);
  context.save();

  context.strokeStyle = "gray";
  context.lineWidth = 1;
  context.beginPath();
  context.arc(width - 150, 600, 100, 0, Math.PI * 2, true);
  context.closePath();
  context.stroke();

  context.clip();

  // Center image inside circle
  context.drawImage(
    cameraFeed,
    width - 350,
    500,
    Math.floor(width / 3),
    Math.floor(height / 3)
  );

  context.restore();
};

const createCameraFeedElement = async () => {
  inputMediaStream = await navigator.mediaDevices.getUserMedia(
    mediaConstraints
  );
  const video = document.createElement("video");
  video.autoplay = true;
  video.muted = true;
  video.srcObject = inputMediaStream;
  void video.play();

  cameraFeed = video;
};

const createScreenCaptureFeedElement = async () => {
  const screenCaptureStream = await navigator.mediaDevices.getDisplayMedia();
  const video = document.createElement("video");
  video.autoplay = true;
  video.muted = true;
  video.srcObject = screenCaptureStream;
  video.srcObject.getVideoTracks()[0].onended = () => {
    stopWebrtc();
  };
  void video.play();

  screenCaptureFeed = video;
};

const setupCanvasStream = () => {
  // Create a hidden canvas element to draw to
  const canvas = document.createElement("canvas");
  canvas.width = 1280;
  canvas.height = 720;

  const canvasSettings = {
    context: canvas.getContext("2d"),
    width: canvas.width,
    height: canvas.height,
  };

  // Use audio timer loop to allow for rendering when tab is not active
  stopAudioTimerLoop = audioTimerLoop(() => {
    if (document.visibilityState === "visible") {
      cancelAnimationFrame(rafRef);
      rafRef = requestAnimationFrame(() => {
        renderFrameOnCanvas(canvasSettings, cameraFeed, screenCaptureFeed);
      });
    } else {
      renderFrameOnCanvas(canvasSettings, cameraFeed, screenCaptureFeed);
    }
  }, 1000 / DEFAULT_FRAMERATE);

  const capturedStream = canvas.captureStream(DEFAULT_FRAMERATE);
  capturedStream.addTrack(inputMediaStream.getAudioTracks()[0]);
  canvasMediaStream = capturedStream;
};

const startWebrtc = async (streamKey) => {
  if (webrtcIngest) {
    webrtcIngest.unload();
  }
  webrtcIngest = new WebrtcIngest({
    url: "https://lb.cdn.vindral.com",
    streamKey,
  });

  // listen to state changes
  webrtcIngest.on("broadcast state change", () => {
    streamState.textContent = `${webrtcIngest.connectionState} | ${webrtcIngest.broadcastState}`;
  });
  webrtcIngest.on("connection state change", () => {
    streamState.textContent = `${webrtcIngest.connectionState} | ${webrtcIngest.broadcastState}`;
  });

  try {
    await createCameraFeedElement();
    await createScreenCaptureFeedElement();
    setupCanvasStream();

    // show stream on local video object. Skip for audio only streams
    if (localVideo) {
      localVideo.srcObject = canvasMediaStream;
      localVideo.style.display = "block";
    }

    // Get the video and audio tracks from the media stream
    const audioTracks = canvasMediaStream.getAudioTracks();
    const videoTracks = canvasMediaStream.getVideoTracks();

    // connect to webrtc receiver
    void webrtcIngest.connect();

    // set media tracks
    if (videoTracks.length) {
      void webrtcIngest.setVideoTrack(videoTracks[0]);
    }

    if (audioTracks.length) {
      void webrtcIngest.setAudioTrack(audioTracks[0]);
    }

    // even though we have a connection, the actual broadcast will not start
    // until this call has been made
    webrtcIngest.broadcast();
  } catch (error) {
    console.error("Failed to start webrtc", error);
    stopWebrtc();
  }
};

// remember to unload instance when it's not wanted any longer,
// in order of removing timers, intervals, etc
const stopWebrtc = async () => {
  stopButton.classList.add("hidden");
  streamKeyForm.classList.remove("hidden");
  
  webrtcIngest?.unload();

  if (stopAudioTimerLoop) {
    stopAudioTimerLoop();
  }

  //Shut down screen capture feed
  if (screenCaptureFeed) {
    const scTracks = screenCaptureFeed.srcObject.getTracks();
    scTracks.forEach((track) => track.stop());
  }

  //Shut down camera feed
  if (cameraFeed) {
    const cTracks = cameraFeed.srcObject.getTracks();
    cTracks.forEach((track) => track.kind === "video" && track.stop());
  }

  if (localVideo) {
    localVideo.srcObject = null;
  }
};

stopButton.onclick = stopWebrtc;

// get streamkey from form and start webrtcingest session
streamKeyForm.onsubmit = (e) => {
  e.preventDefault();
  const streamKey = streamKeyInput.value;

  if (streamKey !== "") {
    void startWebrtc(streamKey);
    streamKeyForm.classList.add("hidden");
    stopButton.classList.remove("hidden");
    streamState.textContent = "initializing...";
  }
};
