let audioContext;
let analyser;
let stream;
let dataArray;
let audioSelect;
let smoothVolume = 0;

// perlin noise configuration
let xScale = 0.015;
let yScale = 0.02;
let gapSlider;
let gap;
let offsetSlider;
let offset;
let timeOffset = 0;

async function setupAudio(deviceId = null) {
    try {
        stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                deviceId: deviceId ? { exact: deviceId } : undefined,
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false,
            },
        });

        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioContext.createMediaStreamSource(stream);
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        dataArray = new Uint8Array(analyser.frequencyBinCount);
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
            audioContext.close();
        }
        setupAudio(selectedDeviceId);
    });
}

function setup() {
    createCanvas(windowWidth, windowHeight);
    noStroke();
    
    // create UI controls
    gapSlider = createSlider(2, width / 10, width / 20);
    gapSlider.position(10, 40);
    offsetSlider = createSlider(0, 1000, 0);
    offsetSlider.position(10, 70);
    
    
    populateAudioInputs();
    setupAudio();
}

function draw() {
    background(0);
    
    if (analyser) {
        // get audio data
        analyser.getByteTimeDomainData(dataArray);
        
        // calculate current volume
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
            sum += Math.abs(dataArray[i] - 128);
        }
        let currentVolume = sum / dataArray.length;
        
        // smooth the volume
        smoothVolume = lerp(smoothVolume, currentVolume, 0.1);
        
        // use smoothVolume to influence the visualization
        drawPerlinGrid(smoothVolume);
    }
    
    timeOffset += 0.01; // animate the noise pattern over time
}

function drawPerlinGrid(volume) {
    // get current values from sliders
    gap = gapSlider.value();
    offset = offsetSlider.value();
    
    // map volume to influence the visualization
    let volumeScale = map(volume, 0, 128, 0.5, 2);
    let colorIntensity = map(volume, 0, 128, 50, 255);
    
    // loop through the grid
    for (let x = gap / 2; x < width; x += gap) {
        for (let y = gap / 2; y < height; y += gap) {
            // calculate noise value with time animation and volume influence
            let noiseValue = noise(
                (x + offset) * xScale * volumeScale,
                (y + offset) * yScale * volumeScale,
                timeOffset
            );
            
            // calculate circle size based on noise and volume
            let diameter = noiseValue * gap * volumeScale;
            
            // set color based on noise value and volume
            let hue = map(noiseValue, 0, 1, 0, 360); // color value range (0-360 is full inclusive)
            colorMode(HSB);
            fill(hue, colorIntensity, colorIntensity);
            
            // draw the circle
            circle(x, y, diameter);
        }
    }
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}