document.addEventListener('DOMContentLoaded', () => {
  if (typeof Pizzicato === 'undefined') {
    console.error('Pizzicato n\'est pas chargé.');
    return;
  }

  let audioContext = new (window.AudioContext || window.webkitAudioContext)();

  document.getElementById('startButton').addEventListener('click', function() {
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        let source = audioContext.createMediaStreamSource(stream);

        let sound = new Pizzicato.Sound({ source: 'input' }, () => {
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
