let audioContext;
let analyser;
let stream;
let volume = 0; // volume value to control the circle's size
let dataArray;
let audioSelect; // dropdown for audio input selection


const NOTES = {
    'B0': 30.87,
    'C1': 32.70,
    'C#1': 34.65,
    'D1': 36.71,
    'D#1': 38.89,
    'E1': 41.20,
    'F1': 43.65,
    'F#1': 46.25,
    'G1': 49.00,
    'G#1': 51.91,
    'A1': 55.00,
    'A#1': 58.27,
    'B1': 61.74,
    'C2': 65.41,
    'C#2': 69.30,
    'D2': 73.42,
    'D#2': 77.78,
    'E2': 82.41,
    'F2': 87.31,
    'F#2': 92.50,
    'G2': 98.00,
    'G#2': 103.83,
    'A2': 110.00,
    'A#2': 116.54,
    'B2': 123.47,
    'C3': 130.81
};

async function setupAudio(deviceId = null) {
  try {
    // request access to the selected audio input device
    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: deviceId ? { exact: deviceId } : undefined,
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    });

    // create the audio context and connect the stream
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioContext.createMediaStreamSource(stream);

    // create an analyser node
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 256; // small FFT size to focus on amplitude
    dataArray = new Uint8Array(analyser.frequencyBinCount);

    // connect the source to the analyser
    source.connect(analyser);
  } catch (err) {
    console.error("Error accessing audio interface:", err);
  }
}

async function populateAudioInputs() {
  const devices = await navigator.mediaDevices.enumerateDevices();
  const audioInputs = devices.filter((device) => device.kind === "audioinput");

  audioSelect = createSelect();
  audioSelect.position(10, 10);
  audioInputs.forEach((input) => {
    audioSelect.option(input.label, input.deviceId);
  });

  audioSelect.changed(() => {
    const selectedDeviceId = audioSelect.value();
    if (audioContext) {
      audioContext.close(); // close the previous context
    }
    setupAudio(selectedDeviceId); // reinitialize with the selected input
  });
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  noStroke();
  populateAudioInputs();
  setupAudio();
}

let smoothVolume = 0;
let targetCircleSize = 0;
let currentCircleSize = 0;

function draw() {
  background(0);

  if (analyser) {
    analyser.getByteTimeDomainData(dataArray);

    // Calculate current volume
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += Math.abs(dataArray[i] - 128);
    }
    let currentVolume = sum / dataArray.length;

    // smooth the volume with averaging
    smoothVolume = (smoothVolume * 0.9) + (currentVolume * 0.1);

    // map the smoothed volume to a target size
    targetCircleSize = map(smoothVolume, 0, 128, 50, width / 2);

    // smoothly transition to the target size
    currentCircleSize = lerp(currentCircleSize, targetCircleSize, 0.1);

    // draw the circle
    fill(255, 100, 100);
    ellipse(width / 2, height / 2, currentCircleSize);
  }
}
