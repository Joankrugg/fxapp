document.addEventListener('DOMContentLoaded', () => {
  const mixSlider = document.getElementById('mix');
  const mixKnob = document.getElementById('mix-knob');
  const mixGraduations = document.getElementById('mix-graduations');
  const footswitch = document.getElementById('footswitch');
  const statusDiv = document.getElementById('status');

  // --- Audio ---
  let audioContext = null;
  let micStream = null;
  let sourceNode = null;
  let dryGain = null;
  let wetGain = null;
  let merger = null;
  let reverbNode = null;
  let outputNode = null;

  // --- Dessin des graduations ---
  function drawGraduations() {
    const ctx = mixGraduations.getContext('2d');
    ctx.clearRect(0, 0, 80, 80);
    const centerX = 40, centerY = 40, radius = 34;
    const startAngle = (150 * Math.PI) / 180; // 150°
    const endAngle = (30 * Math.PI) / 180;   // 30°
    for (let i = 0; i < 10; i++) {
      const angle = startAngle + (i / 9) * (2 * Math.PI - (startAngle - endAngle) - 2 * Math.PI + 240 * Math.PI / 180);
      const x1 = centerX + Math.cos(angle) * (radius - 4);
      const y1 = centerY + Math.sin(angle) * (radius - 4);
      const x2 = centerX + Math.cos(angle) * (radius + 4);
      const y2 = centerY + Math.sin(angle) * (radius + 4);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = '#388e3c';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  // --- Animation du knob ---
  function updateKnob() {
    // 240° de rotation, de 150° à -60° (du haut, sens horaire)
    const minAngle = 150;
    const maxAngle = -60;
    const value = parseFloat(mixSlider.value);
    const angle = minAngle + (maxAngle - minAngle) * value;
    mixKnob.style.transform = `rotate(${angle}deg)`;
  }

  // --- Gestion audio ---
  async function enableAudio() {
    if (audioContext) return;
    try {
      statusDiv.textContent = 'Connexion au micro...';
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      sourceNode = audioContext.createMediaStreamSource(micStream);

      // Dry/wet
      dryGain = audioContext.createGain();
      wetGain = audioContext.createGain();
      merger = audioContext.createGain();

      // Reverb simple (delay court pour simuler une spring/plate)
      reverbNode = audioContext.createDelay();
      reverbNode.delayTime.value = 0.08; // 80ms

      // Routing
      sourceNode.connect(dryGain);
      sourceNode.connect(reverbNode);
      reverbNode.connect(wetGain);
      dryGain.connect(merger);
      wetGain.connect(merger);
      outputNode = audioContext.createGain();
      merger.connect(outputNode);
      outputNode.connect(audioContext.destination);

      updateMix();
      statusDiv.textContent = 'Reverb activée.';
    } catch (e) {
      statusDiv.textContent = 'Erreur micro : ' + e.message;
    }
  }

  function disableAudio() {
    if (audioContext) {
      audioContext.close();
      audioContext = null;
      micStream = null;
      sourceNode = null;
      dryGain = null;
      wetGain = null;
      merger = null;
      reverbNode = null;
      outputNode = null;
    }
    statusDiv.textContent = 'Reverb désactivée.';
  }

  function updateMix() {
    if (!dryGain || !wetGain) return;
    const mix = parseFloat(mixSlider.value);
    dryGain.gain.value = 1 - mix;
    wetGain.gain.value = mix;
  }

  // --- Footswitch ---
  let isOn = false;
  footswitch.onclick = () => {
    isOn = !isOn;
    footswitch.classList.toggle('on', isOn);
    footswitch.classList.toggle('off', !isOn);
    footswitch.textContent = isOn ? 'ON' : 'OFF';
    if (isOn) {
      enableAudio();
    } else {
      disableAudio();
    }
  };

  // --- Slider ---
  mixSlider.oninput = () => {
    updateKnob();
    updateMix();
  };

  // Init
  drawGraduations();
  updateKnob();
  footswitch.classList.add('off');
  footswitch.textContent = 'OFF';
  statusDiv.textContent = 'Reverb désactivée.';
}); 