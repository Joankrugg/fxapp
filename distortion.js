// Initialisation de l'audio context et des nodes
let audioContext;
let inputNode;
let gainNode;
let distortionNode;
let compressorNode;
let isDistortionActive = false;

// Fonction pour créer une courbe de distorsion
function makeDistortionCurve(amount) {
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
        const x = (i * 2) / n_samples - 1;
        curve[i] = (3 + amount) * x * 20 * deg / (Math.PI + amount * Math.abs(x));
    }
    return curve;
}

// Fonction d'initialisation
function initAudio() {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();

    // Crée un nœud de distorsion
    distortionNode = audioContext.createWaveShaper();
    distortionNode.curve = makeDistortionCurve(400);  // Ajustement de la courbe de distorsion
    distortionNode.oversample = '4x';  // Oversampling pour minimiser les artefacts

    // Crée un nœud de gain pour contrôler le volume
    gainNode = audioContext.createGain();
    gainNode.gain.value = 1;

    // Crée un compresseur pour égaliser le son
    compressorNode = audioContext.createDynamicsCompressor();
    compressorNode.threshold.setValueAtTime(-50, audioContext.currentTime);
    compressorNode.knee.setValueAtTime(40, audioContext.currentTime);
    compressorNode.ratio.setValueAtTime(12, audioContext.currentTime);  // Compression plus forte
    compressorNode.attack.setValueAtTime(0, audioContext.currentTime);
    compressorNode.release.setValueAtTime(0.25, audioContext.currentTime);

    // Chaînage des nœuds audio
    navigator.mediaDevices.getUserMedia({ audio: true })
    .then(function(stream) {
        inputNode = audioContext.createMediaStreamSource(stream);

        inputNode.connect(distortionNode);
        distortionNode.connect(compressorNode);
        compressorNode.connect(gainNode);
        gainNode.connect(audioContext.destination);

        console.log("Audio context et nodes initialisés.");
    })
    .catch(function(err) {
        console.error("Erreur lors de l'accès à l'entrée audio: " + err);
    });
}

// Gestion de l'activation/désactivation de la distorsion
document.getElementById('toggleDistortion').addEventListener('click', function() {
    if (!isDistortionActive) {
        initAudio();
        isDistortionActive = true;
        this.textContent = 'Désactiver la distorsion';
    } else {
        audioContext.close();
        isDistortionActive = false;
        this.textContent = 'Activer la distorsion';
    }
});

// Ajustement du gain de distorsion via le slider
document.getElementById('distortionSlider').addEventListener('input', function() {
    const amount = parseFloat(this.value) * 400;  // Ajuster l'échelle du slider
    distortionNode.curve = makeDistortionCurve(amount);
});
