document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM entièrement chargé');

  const gainSlider = document.getElementById('gain');
  const toneSlider = document.getElementById('tone');
  const volumeSlider = document.getElementById('volume');
  const shapeSlider = document.getElementById('shape');
  const startBtn = document.getElementById('start');
  const statusDiv = document.getElementById('status');

  if (!gainSlider || !toneSlider || !volumeSlider || !shapeSlider || !startBtn || !statusDiv) {
    console.error('Erreur: Impossible de trouver les éléments HTML nécessaires.');
    return;
  }

  let audioContext = null;
  let micStream = null;
  let sourceNode = null;
  let gainNode = null;
  let waveShaperNode = null;
  let toneNode = null;
  let lowpassNode = null;
  let dryGain = null;
  let wetGain = null;
  let mixNode = null;
  let volumeNode = null;
  let isOn = false;

  // Potards et footswitch
  const potards = [
    { id: 'gain', min: 0, max: 1, step: 0.1, default: 0.5 },
    { id: 'tone', min: 0, max: 1, step: 0.1, default: 0.5 },
    { id: 'volume', min: 0, max: 1, step: 0.1, default: 0.7 },
    { id: 'shape', min: 0, max: 1, step: 0.1, default: 0.5 }
  ];
  const footswitch = document.getElementById('footswitch');

  // --- Potards : animation et graduations ---
  function drawGraduations(canvasId) {
    const canvas = document.getElementById(canvasId);
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 80, 80);
    const centerX = 40, centerY = 40, radius = 34;
    const startAngle = (150 * Math.PI) / 180;
    const endAngle = (30 * Math.PI) / 180;
    for (let i = 0; i < 10; i++) {
      const angle = startAngle + (i / 9) * (2 * Math.PI - (startAngle - endAngle) - 2 * Math.PI + 240 * Math.PI / 180);
      const x1 = centerX + Math.cos(angle) * (radius - 4);
      const y1 = centerY + Math.sin(angle) * (radius - 4);
      const x2 = centerX + Math.cos(angle) * (radius + 4);
      const y2 = centerY + Math.sin(angle) * (radius + 4);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = '#a67c3c';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
  function updateKnob(knobId, value) {
    const minAngle = 150;
    const maxAngle = -60;
    const angle = minAngle + (maxAngle - minAngle) * value;
    document.getElementById(knobId).style.transform = `rotate(${angle}deg)`;
  }
  // Init potards
  potards.forEach(p => {
    drawGraduations(`${p.id}-graduations`);
    updateKnob(`${p.id}-knob`, p.default);
  });

  // --- Tone.js nodes ---
  let mic, biasAdd, disto, cheby, filter, vol, output;

  async function enableAudio() {
    if (isOn) return;
    try {
      statusDiv.textContent = 'Connexion au micro...';
      await Tone.start();
      mic = new Tone.UserMedia();
      biasAdd = new Tone.Add(0); // Pour la symétrie
      disto = new Tone.Distortion(0.5); // Gain
      cheby = new Tone.Chebyshev(1); // Rugosité
      filter = new Tone.Filter(1000, 'lowpass'); // Tone
      vol = new Tone.Gain(0.7);
      output = Tone.Destination;
      // Routing dynamique selon shape
      updateAudioRouting();
      await mic.open();
      statusDiv.textContent = 'Distorsion activée.';
    } catch (e) {
      statusDiv.textContent = 'Erreur micro : ' + e.message;
    }
  }
  function disableAudio() {
    if (mic) mic.close();
    if (biasAdd) biasAdd.dispose();
    if (disto) disto.dispose();
    if (cheby) cheby.dispose();
    if (filter) filter.dispose();
    if (vol) vol.dispose();
    mic = biasAdd = disto = cheby = filter = vol = null;
    statusDiv.textContent = 'Distorsion désactivée.';
  }
  function updateAudioRouting() {
    if (!mic) return;
    mic.disconnect();
    biasAdd.disconnect();
    disto.disconnect();
    cheby.disconnect();
    filter.disconnect();
    vol.disconnect();
    // Routing : mic -> biasAdd -> disto -> (cheby si shape>0.7) -> filter -> vol -> sortie
    mic.connect(biasAdd);
    biasAdd.connect(disto);
    const shape = parseFloat(document.getElementById('shape').value);
    if (shape > 0.7) {
      disto.connect(cheby);
      cheby.connect(filter);
    } else {
      disto.connect(filter);
    }
    filter.connect(vol);
    vol.connect(output);
  }
  function updateAudioParams() {
    if (!mic) return;
    // Gain
    disto.distortion = parseFloat(document.getElementById('gain').value) * 1.5;
    // Tone (fréquence du filtre)
    filter.frequency.value = 400 + 4000 * parseFloat(document.getElementById('tone').value);
    // Volume
    vol.gain.value = parseFloat(document.getElementById('volume').value);
    // Shape : bias + rugosité
    const shape = parseFloat(document.getElementById('shape').value);
    biasAdd.value = (shape - 0.5) * 0.8; // symétrie
    cheby.order = Math.round(1 + 99 * (shape - 0.7) / 0.3); // rugosité max si shape=1
    updateAudioRouting();
  }

  // --- Footswitch ---
  footswitch.onclick = async () => {
    isOn = !isOn;
    footswitch.classList.toggle('on', isOn);
    footswitch.classList.toggle('off', !isOn);
    footswitch.textContent = isOn ? 'ON' : 'OFF';
    if (isOn) {
      await enableAudio();
      updateAudioParams();
    } else {
      disableAudio();
    }
  };

  // --- Potards events ---
  potards.forEach(p => {
    const slider = document.getElementById(p.id);
    const knob = document.getElementById(`${p.id}-knob`);
    slider.oninput = () => {
      updateKnob(`${p.id}-knob`, parseFloat(slider.value));
      if (isOn) updateAudioParams();
    };
  });

  // Init état
  footswitch.classList.add('off');
  footswitch.textContent = 'OFF';
  statusDiv.textContent = 'Distorsion désactivée.';
});
