document.addEventListener('DOMContentLoaded', () => {
  let audioContext = null;
  let source = null;
  let distortionNode = null;
  let gainNode = null;
  let highpassFilter = null;
  let lowpassFilter = null;
  let isDistorting = false;

  const distortionSlider = document.getElementById('distortionSlider');
  const toggleDistortionButton = document.getElementById('toggleDistortion');

  // Fonction pour créer l'AudioContext et les nodes nécessaires
  async function createAudioContext() {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();

    gainNode = audioContext.createGain();
    distortionNode = audioContext.createWaveShaper();
    highpassFilter = audioContext.createBiquadFilter();
    lowpassFilter = audioContext.createBiquadFilter();

    // Configurer les filtres
    highpassFilter.type = 'highpass';
    highpassFilter.frequency.value = 150; // Filtrer les fréquences en dessous de 150 Hz (réduction du "brouillard" bas)

    lowpassFilter.type = 'lowpass';
    lowpassFilter.frequency.value = 5000; // Réduction des aigus au-dessus de 5 kHz pour adoucir le son

    // Fonction de distorsion avec clipping asymétrique
    function makeDistortionCurve(amount) {
      const n_samples = 44100;
      const curve = new Float32Array(n_samples);
      const deg = Math.PI / 180;
      const k = amount * 150;
      for (let i = 0; i < n_samples; ++i) {
        const x = (i * 2) / n_samples - 1;
        // Clipping asymétrique, pour un son plus "rock"
        curve[i] = ((Math.PI + k) * x) / (Math.PI + k * Math.abs(x));
      }
      return curve;
    }

    // Créer un flux d'entrée audio (microphone ou autre source)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      source = audioContext.createMediaStreamSource(stream);

      // Configurer la distorsion
      distortionNode.curve = makeDistortionCurve(distortionSlider.value * 100);
      distortionNode.oversample = '4x'; // Surchantillonnage pour plus de précision

      // Connecter la source -> distorsion -> filtres -> gain -> sortie
      source.connect(distortionNode);
      distortionNode.connect(highpassFilter);
      highpassFilter.connect(lowpassFilter);
      lowpassFilter.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Augmenter le gain pour la distorsion
      gainNode.gain.value = 1.5; // Ajustement du gain
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
      audioContext.close();
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
