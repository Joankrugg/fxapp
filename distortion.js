document.addEventListener('DOMContentLoaded', () => {
  let audioContext = new (window.AudioContext || window.webkitAudioContext)();

  document.getElementById('startButton').addEventListener('click', function() {
    // Reprendre l'audio context après action utilisateur
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    // Demander l'accès au microphone
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        // Créer une source audio depuis le micro
        let source = audioContext.createMediaStreamSource(stream);

        // Créer un son avec Pizzicato
        let sound = new Pizzicato.Sound({ source: 'input' }, () => {

          // Appliquer l'effet de distorsion
          let distortion = new Pizzicato.Effects.Distortion({
            gain: 0.6 // Ajuste la quantité de distorsion
          });

          sound.addEffect(distortion);

          // Jouer le son avec distorsion
          sound.play();
        });

      })
      .catch(err => {
        console.error('Erreur lors de l\'accès au microphone :', err);
      });
  });
});
