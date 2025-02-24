"use client";

import { useEffect, useRef } from "react";
import p5 from "p5";

const PerlinNoiseAV = () => {
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let audioContext: AudioContext;
    let analyser: AnalyserNode;
    let stream: MediaStream;
    let dataArray: Uint8Array;
    let smoothVolume = 0;

    // Perlin noise configuration
    const xScale = 0.015;
    const yScale = 0.02;
    let gap: number;
    let offset: number;
    let timeOffset = 0;
    let gapSlider: p5.Element;
    let offsetSlider: p5.Element;
    let audioSelect: p5.Element & {
      option: (label: string, value?: string) => void;
      changed: (callback: () => void) => void;
    };

    const setupAudio = async (p: p5, deviceId: string | null = null) => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            deviceId: deviceId ? { exact: deviceId } : undefined,
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          },
        });

        audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(stream);
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        dataArray = new Uint8Array(analyser.frequencyBinCount);
        source.connect(analyser);
      } catch (err) {
        console.error("Error accessing audio interface:", err);
      }
    };

    const populateAudioInputs = async (p: p5) => {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(
        (device) => device.kind === "audioinput"
      );

      audioSelect = p.createSelect() as p5.Element & {
        option: (label: string, value?: string) => void;
        changed: (callback: () => void) => void;
      };

      audioSelect.position(10, 10);
      audioInputs.forEach((input) => {
        audioSelect.option(input.label, input.deviceId);
      });

      audioSelect.changed(() => {
        const selectedDeviceId = audioSelect.value() as string;
        if (audioContext) {
          audioContext.close();
        }
        setupAudio(p, selectedDeviceId);
      });
    };

    const sketch = (p: p5) => {
      p.setup = () => {
        p.createCanvas(p.windowWidth, p.windowHeight);
        p.noStroke();

        gapSlider = p
          .createSlider(2, p.width / 10, p.width / 20)
          .position(10, 40);
        offsetSlider = p.createSlider(0, 1000, 0).position(10, 70);

        populateAudioInputs(p);
        setupAudio(p);
      };

      p.draw = () => {
        p.background(0);
        if (analyser) {
          analyser.getByteTimeDomainData(dataArray);

          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += Math.abs(dataArray[i] - 128);
          }
          const currentVolume = sum / dataArray.length;
          smoothVolume = p.lerp(smoothVolume, currentVolume, 0.1);

          drawPerlinGrid(p, smoothVolume);
        }
        timeOffset += 0.01;
      };

      const drawPerlinGrid = (p: p5, volume: number) => {
        gap = (gapSlider as p5.Element).value() as number;
        offset = (offsetSlider as p5.Element).value() as number;

        const volumeScale = p.map(volume, 0, 128, 0.5, 2);
        const colorIntensity = p.map(volume, 0, 128, 50, 255);

        for (let x = gap / 2; x < p.width; x += gap) {
          for (let y = gap / 2; y < p.height; y += gap) {
            const noiseValue = p.noise(
              (x + offset) * xScale * volumeScale,
              (y + offset) * yScale * volumeScale,
              timeOffset
            );
            const diameter = noiseValue * gap * volumeScale;
            const hue = p.map(noiseValue, 0, 1, 0, 360);

            p.colorMode(p.HSB);
            p.fill(hue, colorIntensity, colorIntensity);
            p.circle(x, y, diameter);
          }
        }
      };

      p.windowResized = () => {
        p.resizeCanvas(p.windowWidth, p.windowHeight);
      };
    };

    const p5Instance = new p5(sketch, canvasRef.current!);
    return () => {
      p5Instance.remove();
      if (audioContext) {
        audioContext.close();
      }
    };
  }, []);

  return <div ref={canvasRef} />;
};

export default PerlinNoiseAV;
