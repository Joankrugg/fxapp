let sound;
let distortion;

function initAudio() {
    // Demande l'accès au microphone de l'utilisateur
    navigator.mediaDevices.getUserMedia({ audio: true })
    .then(function(stream) {
        // Créer un objet Pizzicato Sound à partir du flux du micro
        sound = new Pizzicato.Sound({
            source: 'input',
            options: {
                mediaStream: stream
            }
        });

        // Appliquer l'effet de distorsion
        distortion = new Pizzicato.Effects.Distortion({
            gain: 0.5 // Valeur par défaut du gain
        });

        sound.addEffect(distortion);
        sound.play(); // Démarrer la lecture du son
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
        distortion.gain = gainValue; // Ajuste le gain de l'effet
    }
});






