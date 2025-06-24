document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM entièrement chargé');

  const gainSlider = document.getElementById('gain');
  const toneSlider = document.getElementById('tone');
  const volumeSlider = document.getElementById('volume');
  const mixSlider = document.getElementById('mix');
  const startBtn = document.getElementById('start');
  const statusDiv = document.getElementById('status');

  if (!gainSlider || !toneSlider || !volumeSlider || !mixSlider || !startBtn || !statusDiv) {
    console.error('Erreur: Impossible de trouver les éléments HTML nécessaires.');
    return;
  }

  let audioContext = null;
  let micStream = null;
  let sourceNode = null;
  let gainNode = null;
  let waveShaperNode = null;
  let toneNode = null;
  let lowpassNode = null;
  let dryGain = null;
  let wetGain = null;
  let mixNode = null;
  let volumeNode = null;

  // Courbe de distorsion douce (tanh)
  function makeDistortionCurve(amount) {
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    for (let i = 0; i < n_samples; ++i) {
      let x = (i * 2) / n_samples - 1;
      curve[i] = Math.tanh(amount * x);
    }
    return curve;
  }

  startBtn.onclick = async () => {
    if (audioContext) {
      statusDiv.textContent = 'Déjà activé.';
      return;
    }
    try {
      statusDiv.textContent = 'Connexion au micro...';
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      sourceNode = audioContext.createMediaStreamSource(micStream);

      // Gain d'entrée
      gainNode = audioContext.createGain();
      gainNode.gain.value = 1;

      // Distorsion douce
      waveShaperNode = audioContext.createWaveShaper();
      const distAmount = parseFloat(gainSlider.value) * 10 + 1;
      waveShaperNode.curve = makeDistortionCurve(distAmount);
      waveShaperNode.oversample = '4x';

      // Tone (filtre passe-haut)
      toneNode = audioContext.createBiquadFilter();
      toneNode.type = 'highshelf';
      toneNode.frequency.value = 1200;
      toneNode.gain.value = (parseFloat(toneSlider.value) - 0.5) * 30;

      // Filtre passe-bas pour adoucir la distorsion
      lowpassNode = audioContext.createBiquadFilter();
      lowpassNode.type = 'lowpass';
      lowpassNode.frequency.value = 3500;

      // Mix dry/wet
      dryGain = audioContext.createGain();
      wetGain = audioContext.createGain();
      mixNode = audioContext.createGain(); // Somme

      // Volume final
      volumeNode = audioContext.createGain();
      volumeNode.gain.value = parseFloat(volumeSlider.value);

      // Routing :
      // dry : source -> gainNode -> dryGain -> mixNode
      // wet : source -> gainNode -> waveShaper -> tone -> lowpass -> wetGain -> mixNode
      // mixNode -> volume -> sortie
      sourceNode.connect(gainNode);
      gainNode.connect(dryGain);
      gainNode.connect(waveShaperNode);
      waveShaperNode.connect(toneNode);
      toneNode.connect(lowpassNode);
      lowpassNode.connect(wetGain);
      dryGain.connect(mixNode);
      wetGain.connect(mixNode);
      mixNode.connect(volumeNode);
      volumeNode.connect(audioContext.destination);

      // Initial mix
      const mix = parseFloat(mixSlider.value);
      dryGain.gain.value = 1 - mix;
      wetGain.gain.value = mix;

      statusDiv.textContent = 'Micro activé avec distorsion musicale !';
      startBtn.textContent = 'Micro activé !';
      startBtn.style.background = '#4caf50';
      startBtn.disabled = true;
    } catch (e) {
      statusDiv.textContent = 'Erreur micro : ' + e.message;
    }
  };

  gainSlider.oninput = () => {
    if (waveShaperNode) {
      const distAmount = parseFloat(gainSlider.value) * 10 + 1;
      waveShaperNode.curve = makeDistortionCurve(distAmount);
    }
  };

  toneSlider.oninput = () => {
    if (toneNode) toneNode.gain.value = (parseFloat(toneSlider.value) - 0.5) * 30;
  };

  volumeSlider.oninput = () => {
    if (volumeNode) volumeNode.gain.value = parseFloat(volumeSlider.value);
  };

  mixSlider.oninput = () => {
    if (dryGain && wetGain) {
      const mix = parseFloat(mixSlider.value);
      dryGain.gain.value = 1 - mix;
      wetGain.gain.value = mix;
    }
  };
});
