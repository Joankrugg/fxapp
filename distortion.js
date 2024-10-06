document.addEventListener('DOMContentLoaded', () => {
  let audioContext = new (window.AudioContext || window.webkitAudioContext)();

  // Créer une entrée audio depuis le microphone
  navigator.mediaDevices.getUserMedia({ audio: true })
    .then(stream => {
      let source = audioContext.createMediaStreamSource(stream);

      // Créer un son Pizzicato et un effet de distorsion
      let sound = new Pizzicato.Sound({ source: 'input' }, () => {
        let distortion = new Pizzicato.Effects.Distortion({
          gain: 0.4 // Paramètre de distorsion
        });

        // Ajouter l'effet à ton son
        sound.addEffect(distortion);

        // Jouer le son avec distorsion en temps réel
        sound.play();
      });
    })
    .catch(err => {
      console.error('Erreur lors de l\'accès au microphone :', err);
    });
});
