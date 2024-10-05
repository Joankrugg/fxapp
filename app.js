document.addEventListener('DOMContentLoaded', () => {
  let audioContext;
  let oscillator;
  let gainNode;
  let isPlaying = false;

  const volumeSlider = document.getElementById('volumeSlider');
  const frequencySlider = document.getElementById('frequencySlider');
  const toggleAudioButton = document.getElementById('toggleAudio');

  // Créer le contexte audio
  function createAudioContext() {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    gainNode = audioContext.createGain(); // Pour contrôler le volume
    oscillator = audioContext.createOscillator(); // Pour générer le son

    // Configurer l'oscillateur
    oscillator.type = 'sine'; // Type d'onde
    oscillator.frequency.setValueAtTime(frequencySlider.value, audioContext.currentTime);

    // Connecter l'oscillateur au gain, puis à la sortie audio
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start(); // Démarrer l'oscillateur
  }

  // Fonction pour activer/désactiver l'audio
  function toggleAudio() {
    if (!isPlaying) {
      createAudioContext();
      toggleAudioButton.textContent = 'Désactiver l\'audio';
      isPlaying = true;
    } else {
      oscillator.stop();
      audioContext.close();
      toggleAudioButton.textContent = 'Activer l\'audio';
      isPlaying = false;
    }
  }

  // Écouter les changements du slider de volume
  volumeSlider.addEventListener('input', () => {
    if (gainNode) {
      gainNode.gain.value = volumeSlider.value;
    }
  });

  // Écouter les changements du slider de fréquence
  frequencySlider.addEventListener('input', () => {
    if (oscillator) {
      oscillator.frequency.setValueAtTime(frequencySlider.value, audioContext.currentTime);
    }
  });

  // Écouter le clic du bouton pour activer/désactiver l'audio
  toggleAudioButton.addEventListener('click', toggleAudio);

  // Fonction pour gérer l'entrée audio du micro
  async function handleMicrophoneInput() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const microphone = audioContext.createMediaStreamSource(stream);
      microphone.connect(gainNode); // Connecter le micro au gainNode pour traiter le son
    } catch (err) {
      console.error('Erreur lors de l\'accès au microphone :', err);
    }
  }

  // Si nécessaire, appeler cette fonction pour ajouter l'entrée micro au projet
  // handleMicrophoneInput();
});
