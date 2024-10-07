// Initialisation du son et de l'effet de distorsion avec Pizzicato
let sound;
let distortion;

function initAudio() {
    // Créer une source audio via le micro
    navigator.mediaDevices.getUserMedia({ audio: true })
    .then(function(stream) {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioContext.createMediaStreamSource(stream);

        // Créer un objet Pizzicato Sound à partir du flux audio
        sound = new Pizzicato.Sound({
            source: 'input',
            options: {
                audioContext: audioContext,
                mediaStreamSource: source
            }
        });

        // Appliquer l'effet de distorsion
        distortion = new Pizzicato.Effects.Distortion({
            gain: 0.4 // Valeur par défaut du gain, ajustable avec le slider
        });

        sound.addEffect(distortion);
        sound.play(); // Démarrer la lecture du son avec l'effet de distorsion
    })
    .catch(function(err) {
        console.error('Erreur lors de l\'accès au microphone: ' + err);
    });
}

// Gestion de l'activation/désactivation de la distorsion
document.getElementById('toggleDistortion').addEventListener('click', function() {
    if (!sound) {
        initAudio();
        this.textContent = 'Désactiver la distorsion';
    } else {
        sound.stop();
        sound = null;
        this.textContent = 'Activer la distorsion';
    }
});

// Ajustement du gain de distorsion via le slider
document.getElementById('distortionSlider').addEventListener('input', function() {
    const gainValue = parseFloat(this.value);
    if (distortion) {
        distortion.gain = gainValue;
    }
});
