document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM entièrement chargé');

  const gainSlider = document.getElementById('gain');
  const toneSlider = document.getElementById('tone');
  const volumeSlider = document.getElementById('volume');
  const startBtn = document.getElementById('start');
  const statusDiv = document.getElementById('status');

  if (!gainSlider || !toneSlider || !volumeSlider || !startBtn || !statusDiv) {
    console.error('Erreur: Impossible de trouver les éléments HTML nécessaires.');
    return;
  }

  let audioContext = null;
  let micStream = null;
  let sourceNode = null;
  let gainNode = null;
  let waveShaperNode = null;
  let toneNode = null;
  let volumeNode = null;

  function makeDistortionCurve(amount) {
    const k = typeof amount === 'number' ? amount : 50;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    let x;
    for (let i = 0; i < n_samples; ++i) {
      x = (i * 2) / n_samples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
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

      // Distorsion
      waveShaperNode = audioContext.createWaveShaper();
      const distAmount = parseFloat(gainSlider.value) * 100;
      waveShaperNode.curve = makeDistortionCurve(distAmount);
      waveShaperNode.oversample = '4x';

      // Tone (filtre passe-haut)
      toneNode = audioContext.createBiquadFilter();
      toneNode.type = 'highshelf';
      toneNode.frequency.value = 1200;
      toneNode.gain.value = (parseFloat(toneSlider.value) - 0.5) * 30; // -15 à +15 dB

      // Volume final
      volumeNode = audioContext.createGain();
      volumeNode.gain.value = parseFloat(volumeSlider.value);

      // Routing : mic -> gain -> disto -> tone -> volume -> sortie
      sourceNode.connect(gainNode);
      gainNode.connect(waveShaperNode);
      waveShaperNode.connect(toneNode);
      toneNode.connect(volumeNode);
      volumeNode.connect(audioContext.destination);

      statusDiv.textContent = 'Micro activé avec distorsion !';
      startBtn.textContent = 'Micro activé !';
      startBtn.style.background = '#4caf50';
      startBtn.disabled = true;
    } catch (e) {
      statusDiv.textContent = 'Erreur micro : ' + e.message;
    }
  };

  gainSlider.oninput = () => {
    if (waveShaperNode) {
      const distAmount = parseFloat(gainSlider.value) * 100;
      waveShaperNode.curve = makeDistortionCurve(distAmount);
    }
  };

  toneSlider.oninput = () => {
    if (toneNode) toneNode.gain.value = (parseFloat(toneSlider.value) - 0.5) * 30;
  };

  volumeSlider.oninput = () => {
    if (volumeNode) volumeNode.gain.value = parseFloat(volumeSlider.value);
  };
});
