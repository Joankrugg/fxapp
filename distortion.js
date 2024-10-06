document.addEventListener('DOMContentLoaded', () => {
  let audioContext = new (window.AudioContext || window.webkitAudioContext)();

  // Attendre un geste utilisateur pour démarrer l'AudioContext
  document.getElementById('startButton').addEventListener('click', function() {

    // Si l'AudioContext est suspendu (bloqué), on le reprend
    if (audioContext.state === 'suspended') {
      audioContext.resume().then(() => {
        console.log('AudioContext activé');
      }).catch((err) => {
        console.error('Erreur lors de la reprise de l\'AudioContext:', err);
      });
    }

    // Demander l'accès au microphone
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        let sound = new Pizzicato.Sound({ source: 'input' }, function() {
          // Appliquer l'effet de distorsion
          let distortion = new Pizzicato.Effects.Distortion({ gain: 0.6 });
          sound.addEffect(distortion);
          sound.play();
        });
      })
      .catch(err => {
        console.error('Erreur lors de l\'accès au microphone :', err);
      });
  });
});
