import { useAgent } from "@/hooks/useAgent";
import { useVoiceAssistant } from "@livekit/components-react";
import { useRef, useEffect, useState } from "react";

const SMOOTHING_FACTOR = 1;
const THRESHOLD = 175;
const JAW_MAX_OPEN = 45;
export const Axel = () => {
  const voiceAssistant = useAgent();
  const audioContainerRef = useRef<HTMLDivElement | null>(null);
  const headRef = useRef<HTMLVideoElement>(null);
  const jawRef = useRef<HTMLVideoElement>(null);
  const requestAnimationFrameRef = useRef<number | null>(null);
  const smoothedValueRef = useRef(0);
  const [isActive, setIsActive] = useState(false);

  // Example of how to manipulate the transform property
  // You can create your own functions to update these as needed
  const updateHeadPosition = (y: number) => {
    if (headRef.current) {
      headRef.current.style.transform = `translateY(${y}px)`;
    }
  };

  const updateJawPosition = (y: number) => {
    if (jawRef.current) {
      jawRef.current.style.transform = `translateY(${y}px)`;
    }
  };

  // Audio analysis effect
  useEffect(() => {
    if (voiceAssistant.audioTrack && voiceAssistant.audioTrack.publication.audioTrack) {
      // Initial positions
      updateHeadPosition(-50);
      updateJawPosition(50);
      setIsActive(true);



      // Create a new audio element
      const audioElement = document.createElement('audio');

      // Attach the track to the audio element
      voiceAssistant.audioTrack.publication.audioTrack!.attach(audioElement);

      // Set audio element properties
      audioElement.autoplay = true;
      audioElement.controls = true; // Optional: adds audio controls

      // Append the audio element to the container
      audioElement.setAttribute('agent-sid', voiceAssistant.audioTrack.participant.sid);
      audioContainerRef.current?.appendChild(audioElement);

      // Create AudioContext and Analyser
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 64;
      console.log('start axel', analyser);

      const mediaStream = audioElement.srcObject as MediaStream;
      // Create a MediaStreamAudioSourceNode
      const sourceNode = audioContext.createMediaStreamSource(mediaStream);
      // Connect the source to the analyser
      sourceNode.connect(analyser);

      // Create a data array for the frequency data
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      // Animation function for jaw movement
      const animate = () => {
        // Get frequency data
        analyser.getByteFrequencyData(dataArray);

        // Focus on lower frequencies for speech (adjust as needed)
        const lowerFrequencyCount = 6;
        const start = 0;
        let sum = 0;

        for (let i = start; i < start + lowerFrequencyCount; i++) {
          sum += dataArray[i];
        }

        let average = sum / lowerFrequencyCount;
        let jawHeight = 0;

        // Smooth the values
        const newSmoothedValue = smoothedValueRef.current * (1 - SMOOTHING_FACTOR) + average * SMOOTHING_FACTOR;
        smoothedValueRef.current = newSmoothedValue;

        // Apply threshold
        if (newSmoothedValue > THRESHOLD) {
          jawHeight = ((newSmoothedValue - THRESHOLD) / (255 - THRESHOLD)) * JAW_MAX_OPEN;
        } else {
          jawHeight = 0;
        }

        // Update jaw position
        updateJawPosition(50 + jawHeight);

        // Continue animation loop
        requestAnimationFrameRef.current = requestAnimationFrame(animate);
      };

      // Start animation loop
      requestAnimationFrameRef.current = requestAnimationFrame(animate);

      // Cleanup function
      return () => {
        if (requestAnimationFrameRef.current) {
          cancelAnimationFrame(requestAnimationFrameRef.current);
        }

        // Detach audio element
        if (audioElement) {
          voiceAssistant.audioTrack?.publication.audioTrack?.detach(audioElement);
          if (audioContainerRef.current?.contains(audioElement)) {
            audioContainerRef.current.removeChild(audioElement);
          }
        }

        // Close audio context
        if (audioContext.state !== 'closed') {
          audioContext.close();
        }
      };
    }
  }, [voiceAssistant.audioTrack]);

  // Start playing videos when isActive becomes true
  useEffect(() => {
    if (isActive) {
      // Start playing the head video
      if (headRef.current) {
        headRef.current.play().catch(error => {
          console.error("Error playing head video:", error);
        });
      }

      // Start playing the jaw video
      if (jawRef.current) {
        jawRef.current.play().catch(error => {
          console.error("Error playing jaw video:", error);
        });
      }
    }
  }, [isActive])

  // Render the component directly without useMemo
  return (
    <div className="flex justify-center w-full grow text-gray-950 bg-black rounded-sm border border-gray-800 relative">
      <div id="audio-container" style={{ display: "none" }} ref={audioContainerRef}></div>
      <div
        className={`w-full flex justify-center items-center ${isActive ? 'animate-bobbing' : ''}`}
        id="axel-container"
      >
        <video
          ref={headRef}
          className="absolute w-[200px]"
          style={{ transform: 'translateY(-50px)' }}
          autoPlay={false}
          loop={isActive}
          muted
          playsInline
          src="/axel_head.webm"
        />
        <video
          ref={jawRef}
          className="absolute w-[200px]"
          style={{ transform: 'translateY(50px)' }}
          autoPlay={false}
          loop={isActive}
          muted
          playsInline
          src="/axel_jaw.webm"
        />
      </div>
    </div>
  );
};

export default Axel;