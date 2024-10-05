const audioContext = new (window.AudioContext || window.webkitAudioContext)();
let distortionNode;

navigator.mediaDevices.getUserMedia({ audio: true })
  .then(function(stream) {
    const source = audioContext.createMediaStreamSource(stream);

    // Création du nœud de distorsion
    distortionNode = audioContext.createWaveShaper();
    distortionNode.curve = makeDistortionCurve(50); // Valeur initiale de la distorsion

    // Connexion du signal à la distorsion puis à la sortie
    source.connect(distortionNode).connect(audioContext.destination);

    // Slider pour ajuster la distorsion
    document.getElementById('distortionSlider').addEventListener('input', function(event) {
      const distortionAmount = event.target.value;
      distortionNode.curve = makeDistortionCurve(distortionAmount);
    });
  })
  .catch(function(err) {
    console.log('Erreur lors de la capture audio : ' + err);
  });

// Fonction pour générer la courbe de distorsion
function makeDistortionCurve(amount) {
  const n_samples = 44100;
  const curve = new Float32Array(n_samples);
  const deg = Math.PI / 180;
  for (let i = 0; i < n_samples; ++i) {
    const x = i * 2 / n_samples - 1;
    curve[i] = (3 + amount) * x * 20 * deg / (Math.PI + amount * Math.abs(x));
  }
  return curve;
}
