// ============================================================================
// AMBIENT SOUNDSCAPE CONTROLLER (Web Audio API Synthesizer)
// ============================================================================
let audioContext = null;
let ambientGainNode = null;
let isAudioMuted = true;

export function isSoundMuted() {
  return isAudioMuted;
}

export function toggleAudioAmbiance(onStatusChange) {
  if (isAudioMuted) {
    if (!audioContext) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      audioContext = new AudioCtx();
      
      const osc1 = audioContext.createOscillator();
      const osc2 = audioContext.createOscillator();
      ambientGainNode = audioContext.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(110, audioContext.currentTime);
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(164.81, audioContext.currentTime);

      const filter = audioContext.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(350, audioContext.currentTime);

      ambientGainNode.gain.setValueAtTime(0.08, audioContext.currentTime);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(ambientGainNode);
      ambientGainNode.connect(audioContext.destination);

      osc1.start();
      osc2.start();
    } else {
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }
      ambientGainNode.gain.setTargetAtTime(0.08, audioContext.currentTime, 0.1);
    }
    isAudioMuted = false;
    if (onStatusChange) onStatusChange(true);
    return true;
  } else {
    if (ambientGainNode && audioContext) {
      ambientGainNode.gain.setTargetAtTime(0, audioContext.currentTime, 0.1);
    }
    isAudioMuted = true;
    if (onStatusChange) onStatusChange(false);
    return false;
  }
}
