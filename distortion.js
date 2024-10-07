document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM entièrement chargé');

  const distortionSlider = document.getElementById('distortionSlider');
  const toggleDistortionButton = document.getElementById('toggleDistortion');

  if (!distortionSlider || !toggleDistortionButton) {
    console.error('Erreur: Impossible de trouver les éléments HTML nécessaires.');
    return;
  }

  let audioContext = null;
  let source = null;
  let distortionNode = null;
  let gainNode = null;
  let compressor = null;
  let isDistorting = false;

  // Fonction pour créer l'AudioContext et les nodes nécessaires
  async function createAudioContext() {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    gainNode = audioContext.createGain();
    distortionNode = audioContext.createWaveShaper();
    compressor = audioContext.createDynamicsCompressor();

    // Fonction de distorsion améliorée pour un son plus musclé
    function makeDistortionCurve(amount) {
      const n_samples = 44100;
      const curve = new Float32Array(n_samples);
      const deg = Math.PI / 180;
      for (let i = 0; i < n_samples; ++i) {
        const x = (i * 2) / n_samples - 1;
        curve[i] = (amount * x) / (1 + Math.abs(x)); // meilleure courbe pour un son distordu
      }
      return curve;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      source = audioContext.createMediaStreamSource(stream);

      // Configurer la distorsion avec une courbe plus douce et naturelle
      distortionNode.curve = makeDistortionCurve(distortionSlider.value * 100);
      distortionNode.oversample = '4x'; // Suréchantillonnage pour un son plus naturel

      // Configurer le gain initial
      gainNode.gain.value = 1; // Garde un niveau de volume constant

      // Configurer le compresseur pour éviter les pics de volume
      compressor.threshold.setValueAtTime(-50, audioContext.currentTime);
      compressor.knee.setValueAtTime(40, audioContext.currentTime);
      compressor.ratio.setValueAtTime(12, audioContext.currentTime);
      compressor.attack.setValueAtTime(0, audioContext.currentTime);
      compressor.release.setValueAtTime(0.25, audioContext.currentTime);

      // Connecter la chaîne : source -> distorsion -> gain -> compresseur -> destination
      source.connect(distortionNode);
      distortionNode.connect(gainNode);
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

  // Écouter le clic du bouton pour activer/désactiver la distorsion
  toggleDistortionButton.addEventListener('click', toggleDistortion);
});
