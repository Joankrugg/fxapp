document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM entièrement chargé');

  const distortionSlider = document.getElementById('distortionSlider');
  const toggleDistortionButton = document.getElementById('toggleDistortion');
  const gainSlider = document.getElementById('gainSlider');
  const thresholdSlider = document.getElementById('thresholdSlider');
  const bassSlider = document.getElementById('bassSlider');
  const trebleSlider = document.getElementById('trebleSlider');
  const startBtn = document.getElementById('start');
  const statusDiv = document.getElementById('status');

  if (!distortionSlider || !toggleDistortionButton || !gainSlider || !thresholdSlider || !bassSlider || !trebleSlider || !startBtn || !statusDiv) {
    console.error('Erreur: Impossible de trouver les éléments HTML nécessaires.');
    return;
  }

  let audioContext = null;
  let source = null;
  let distortionNode = null;
  let gainNode = null;
  let compressor = null;
  let bassEQ = null;
  let trebleEQ = null;
  let isDistorting = false;
  let micStream;
  let sourceNode;
  let waveShaperNode;
  let toneNode;
  let volumeNode;

  // Fonction pour créer l'AudioContext et les nodes nécessaires
  async function createAudioContext() {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    gainNode = audioContext.createGain();
    distortionNode = audioContext.createWaveShaper();
    compressor = audioContext.createDynamicsCompressor();
    bassEQ = audioContext.createBiquadFilter();
    trebleEQ = audioContext.createBiquadFilter();

    bassEQ.type = 'lowshelf';
    bassEQ.frequency.value = 100; // Fréquence basse pour les basses
    trebleEQ.type = 'highshelf';
    trebleEQ.frequency.value = 5000; // Fréquence haute pour les aigus

    // Fonction de distorsion
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

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      source = audioContext.createMediaStreamSource(stream);

      distortionNode.curve = makeDistortionCurve(distortionSlider.value * 100);
      distortionNode.oversample = '4x';

      // Configurer le compresseur initialement
      compressor.threshold.setValueAtTime(thresholdSlider.value, audioContext.currentTime);
      compressor.ratio.setValueAtTime(20, audioContext.currentTime);

      gainNode.gain.value = gainSlider.value;

      // Chaîne audio : source -> distorsion -> bass EQ -> treble EQ -> gain -> compresseur -> destination
      source.connect(distortionNode);
      distortionNode.connect(bassEQ);
      bassEQ.connect(trebleEQ);
      trebleEQ.connect(gainNode);
      gainNode.connect(compressor);
      compressor.connect(audioContext.destination);

    } catch (err) {
      console.error('Erreur lors de l\'accès au microphone :', err);
    }
  }

  // Fonction pour activer/désactiver la distorsion
  function toggleDistortion() {
    if (!isDistorting) {
      createAudioContext();
      toggleDistortionButton.textContent = 'Désactiver la distorsion';
      isDistorting = true;
    } else {
      if (audioContext) {
        audioContext.close();
      }
      audioContext = null;
      toggleDistortionButton.textContent = 'Activer la distorsion';
      isDistorting = false;
    }
  }

  // Gérer les changements du slider de distorsion
  distortionSlider.addEventListener('input', () => {
    if (distortionNode) {
      distortionNode.curve = makeDistortionCurve(distortionSlider.value * 100);
    }
  });

  // Gérer les changements du gain global
  gainSlider.addEventListener('input', () => {
    if (gainNode) {
      gainNode.gain.value = gainSlider.value;
    }
  });

  // Gérer les changements du threshold du compresseur
  thresholdSlider.addEventListener('input', () => {
    if (compressor) {
      compressor.threshold.setValueAtTime(thresholdSlider.value, audioContext.currentTime);
    }
  });

  // Gérer les changements de l'EQ basses
  bassSlider.addEventListener('input', () => {
    if (bassEQ) {
      bassEQ.gain.setValueAtTime(bassSlider.value, audioContext.currentTime);
    }
  });

  // Gérer les changements de l'EQ aigus
  trebleSlider.addEventListener('input', () => {
    if (trebleEQ) {
      trebleEQ.gain.setValueAtTime(trebleSlider.value, audioContext.currentTime);
    }
  });

  // Écouter le clic du bouton pour activer/désactiver la distorsion
  toggleDistortionButton.addEventListener('click', toggleDistortion);

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
