document.addEventListener('DOMContentLoaded', () => {
  let audioContext = null;
  let source = null;
  let distortionNode = null;
  let gainNode = null;
  let highpassFilter = null;
  let isDistorting = false;

  const distortionSlider = document.getElementById('distortionSlider');
  const toggleDistortionButton = document.getElementById('toggleDistortion');

  // Fonction pour créer l'AudioContext et les nodes nécessaires
  async function createAudioContext() {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();

    gainNode = audioContext.createGain();
    distortionNode = audioContext.createWaveShaper();
    highpassFilter = audioContext.createBiquadFilter();
    highpassFilter.type = 'highpass';
    highpassFilter.frequency.value = 150; // Filtrer les basses fréquences en dessous de 150 Hz

    // Fonction de distorsion plus intense pour un effet grunge
    function makeDistortionCurve(amount) {
      const k = amount * 100;
      const n_samples = 44100;
      const curve = new Float32Array(n_samples);
      const deg = Math.PI / 180;
      for (let i = 0; i < n_samples; ++i) {
        const x = (i * 2) / n_samples - 1;
        curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
      }
      return curve;
    }

    // Créer un flux d'entrée audio (microphone ou autre source)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      source = audioContext.createMediaStreamSource(stream);

      // Configurer la distorsion
      distortionNode.curve = makeDistortionCurve(distortionSlider.value * 100);
      distortionNode.oversample = '4x'; // Surchantillonnage pour un son plus lisse

      // Connecter la source -> distorsion -> filtre -> gain -> sortie
      source.connect(distortionNode);
      distortionNode.connect(highpassFilter);
      highpassFilter.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Augmenter le gain pour la distorsion
      gainNode.gain.value = 2; // Augmente le volume pour une distorsion plus percutante
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
