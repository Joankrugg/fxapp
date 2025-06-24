document.addEventListener('DOMContentLoaded', () => {
  // --- Sélection des éléments ---
  const startBtn = document.getElementById('start-mic');
  const statusDiv = document.getElementById('status');

  // EQ
  const eqOn = document.getElementById('eq-on');
  const eqLed = document.getElementById('eq-led');
  const eqBass = document.getElementById('eq-bass');
  const eqMid = document.getElementById('eq-mid');
  const eqTreble = document.getElementById('eq-treble');

  // Fuzz
  const fuzzOn = document.getElementById('fuzz-on');
  const fuzzLed = document.getElementById('fuzz-led');
  const fuzzGain = document.getElementById('fuzz-gain');
  const fuzzTone = document.getElementById('fuzz-tone');
  const fuzzVolume = document.getElementById('fuzz-volume');

  // Tremolo
  const tremoloOn = document.getElementById('tremolo-on');
  const tremoloLed = document.getElementById('tremolo-led');
  const tremoloRate = document.getElementById('tremolo-rate');
  const tremoloDepth = document.getElementById('tremolo-depth');

  // Chorus
  const chorusOn = document.getElementById('chorus-on');
  const chorusLed = document.getElementById('chorus-led');
  const chorusRate = document.getElementById('chorus-rate');
  const chorusDepth = document.getElementById('chorus-depth');
  const chorusMix = document.getElementById('chorus-mix');

  // Flanger
  const flangerOn = document.getElementById('flanger-on');
  const flangerLed = document.getElementById('flanger-led');
  const flangerRate = document.getElementById('flanger-rate');
  const flangerDepth = document.getElementById('flanger-depth');
  const flangerMix = document.getElementById('flanger-mix');

  // Delay
  const delayOn = document.getElementById('delay-on');
  const delayLed = document.getElementById('delay-led');
  const delayTime = document.getElementById('delay-time');
  const delayFeedback = document.getElementById('delay-feedback');
  const delayMix = document.getElementById('delay-mix');

  // Reverb
  const reverbOn = document.getElementById('reverb-on');
  const reverbLed = document.getElementById('reverb-led');
  const reverbMix = document.getElementById('reverb-mix');

  // --- Audio context et nodes ---
  let audioContext = null;
  let micStream = null;
  let sourceNode = null;

  // Effets (nodes)
  let eqNodes = {};
  let fuzzNodes = {};
  let tremoloNodes = {};
  let chorusNodes = {};
  let flangerNodes = {};
  let delayNodes = {};
  let reverbNodes = {};
  let outputNode = null;

  // --- LED helpers ---
  function setLed(led, on) {
    if (on) led.classList.add('on');
    else led.classList.remove('on');
  }

  // --- Chaînage dynamique ---
  function connectChain(nodesArr) {
    // Déconnecte tout
    nodesArr.forEach((n, i) => { if (n && n.disconnect) try { n.disconnect(); } catch(e){} });
    // Connecte en série
    for (let i = 0; i < nodesArr.length - 1; i++) {
      if (nodesArr[i] && nodesArr[i+1]) nodesArr[i].connect(nodesArr[i+1]);
    }
  }

  // --- Création des effets ---
  function createEQ(ctx) {
    const bass = ctx.createBiquadFilter();
    bass.type = 'lowshelf';
    bass.frequency.value = 100;
    bass.gain.value = parseFloat(eqBass.value);
    const mid = ctx.createBiquadFilter();
    mid.type = 'peaking';
    mid.frequency.value = 1000;
    mid.Q.value = 1;
    mid.gain.value = parseFloat(eqMid.value);
    const treble = ctx.createBiquadFilter();
    treble.type = 'highshelf';
    treble.frequency.value = 4000;
    treble.gain.value = parseFloat(eqTreble.value);
    return { in: bass, out: treble, nodes: [bass, mid, treble] };
  }

  function createFuzz(ctx) {
    const gain = ctx.createGain();
    gain.gain.value = 1;
    const waveShaper = ctx.createWaveShaper();
    waveShaper.curve = makeFuzzCurve(parseFloat(fuzzGain.value) * 20 + 1);
    waveShaper.oversample = '4x';
    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = 800 + parseFloat(fuzzTone.value) * 4000;
    const vol = ctx.createGain();
    vol.gain.value = parseFloat(fuzzVolume.value);
    return { in: gain, out: vol, nodes: [gain, waveShaper, tone, vol] };
  }
  function makeFuzzCurve(amount) {
    const n = 44100, curve = new Float32Array(n);
    for (let i = 0; i < n; ++i) {
      let x = (i * 2) / n - 1;
      curve[i] = Math.tanh(amount * x) * (1 - 0.2 * Math.abs(x));
    }
    return curve;
  }

  function createTremolo(ctx) {
    const gain = ctx.createGain();
    gain.gain.value = 1;
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.type = 'sine';
    lfo.frequency.value = parseFloat(tremoloRate.value);
    lfoGain.gain.value = parseFloat(tremoloDepth.value) * 0.5;
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    lfo.start();
    return { in: gain, out: gain, nodes: [gain, lfo, lfoGain] };
  }

  function createChorus(ctx) {
    // Chorus simple = delay modulé
    const input = ctx.createGain();
    const delay = ctx.createDelay();
    delay.delayTime.value = 0.015;
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = parseFloat(chorusRate.value);
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = parseFloat(chorusDepth.value) * 0.008;
    lfo.connect(lfoGain);
    lfoGain.connect(delay.delayTime);
    lfo.start();
    const wet = ctx.createGain();
    wet.gain.value = parseFloat(chorusMix.value);
    const dry = ctx.createGain();
    dry.gain.value = 1 - parseFloat(chorusMix.value);
    const merger = ctx.createGain();
    input.connect(dry);
    input.connect(delay);
    delay.connect(wet);
    dry.connect(merger);
    wet.connect(merger);
    return { in: input, out: merger, nodes: [input, delay, lfo, lfoGain, wet, dry, merger] };
  }

  function createFlanger(ctx) {
    // Flanger = delay modulé + feedback
    const input = ctx.createGain();
    const delay = ctx.createDelay();
    delay.delayTime.value = 0.003;
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = parseFloat(flangerRate.value);
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = parseFloat(flangerDepth.value) * 0.003;
    lfo.connect(lfoGain);
    lfoGain.connect(delay.delayTime);
    lfo.start();
    const wet = ctx.createGain();
    wet.gain.value = parseFloat(flangerMix.value);
    const dry = ctx.createGain();
    dry.gain.value = 1 - parseFloat(flangerMix.value);
    const merger = ctx.createGain();
    input.connect(dry);
    input.connect(delay);
    delay.connect(wet);
    dry.connect(merger);
    wet.connect(merger);
    return { in: input, out: merger, nodes: [input, delay, lfo, lfoGain, wet, dry, merger] };
  }

  function createDelay(ctx) {
    const input = ctx.createGain();
    const delay = ctx.createDelay(2.0);
    delay.delayTime.value = parseFloat(delayTime.value);
    const feedback = ctx.createGain();
    feedback.gain.value = parseFloat(delayFeedback.value);
    const wet = ctx.createGain();
    wet.gain.value = parseFloat(delayMix.value);
    const dry = ctx.createGain();
    dry.gain.value = 1 - parseFloat(delayMix.value);
    const merger = ctx.createGain();
    input.connect(dry);
    input.connect(delay);
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(wet);
    dry.connect(merger);
    wet.connect(merger);
    return { in: input, out: merger, nodes: [input, delay, feedback, wet, dry, merger] };
  }

  function createReverb(ctx) {
    // Simple reverb = convolver avec impulse response très court (ou gain pour démo)
    const input = ctx.createGain();
    const wet = ctx.createGain();
    wet.gain.value = parseFloat(reverbMix.value);
    const dry = ctx.createGain();
    dry.gain.value = 1 - parseFloat(reverbMix.value);
    const merger = ctx.createGain();
    // Pour la démo, on utilise un petit délai pour simuler la reverb
    const delay = ctx.createDelay();
    delay.delayTime.value = 0.08;
    input.connect(dry);
    input.connect(delay);
    delay.connect(wet);
    dry.connect(merger);
    wet.connect(merger);
    return { in: input, out: merger, nodes: [input, delay, wet, dry, merger] };
  }

  // --- Activation/désactivation des effets ---
  function updateLeds() {
    setLed(eqLed, eqOn.checked);
    setLed(fuzzLed, fuzzOn.checked);
    setLed(tremoloLed, tremoloOn.checked);
    setLed(chorusLed, chorusOn.checked);
    setLed(flangerLed, flangerOn.checked);
    setLed(delayLed, delayOn.checked);
    setLed(reverbLed, reverbOn.checked);
  }

  function buildChain() {
    // Détruit les anciens nodes
    [eqNodes, fuzzNodes, tremoloNodes, chorusNodes, flangerNodes, delayNodes, reverbNodes].forEach(obj => {
      if (obj.nodes) obj.nodes.forEach(n => { if (n && n.disconnect) try { n.disconnect(); } catch(e){} });
    });
    // Recrée les nodes
    eqNodes = createEQ(audioContext);
    fuzzNodes = createFuzz(audioContext);
    tremoloNodes = createTremolo(audioContext);
    chorusNodes = createChorus(audioContext);
    flangerNodes = createFlanger(audioContext);
    delayNodes = createDelay(audioContext);
    reverbNodes = createReverb(audioContext);
    // Routing dynamique
    let chain = [sourceNode];
    if (eqOn.checked) chain.push(eqNodes.in, ...eqNodes.nodes.slice(1));
    if (fuzzOn.checked) chain.push(fuzzNodes.in, ...fuzzNodes.nodes.slice(1));
    if (tremoloOn.checked) chain.push(tremoloNodes.in, ...tremoloNodes.nodes.slice(1));
    if (chorusOn.checked) chain.push(chorusNodes.in, ...chorusNodes.nodes.slice(1));
    if (flangerOn.checked) chain.push(flangerNodes.in, ...flangerNodes.nodes.slice(1));
    if (delayOn.checked) chain.push(delayNodes.in, ...delayNodes.nodes.slice(1));
    if (reverbOn.checked) chain.push(reverbNodes.in, ...reverbNodes.nodes.slice(1));
    outputNode = audioContext.createGain();
    chain.push(outputNode);
    connectChain(chain);
    outputNode.connect(audioContext.destination);
  }

  // --- Gestion des contrôles ---
  [eqOn, fuzzOn, tremoloOn, chorusOn, flangerOn, delayOn, reverbOn].forEach(sw => {
    sw.addEventListener('change', () => {
      updateLeds();
      buildChain();
    });
  });

  [eqBass, eqMid, eqTreble].forEach(slider => {
    slider.addEventListener('input', () => { buildChain(); });
  });
  [fuzzGain, fuzzTone, fuzzVolume].forEach(slider => {
    slider.addEventListener('input', () => { buildChain(); });
  });
  [tremoloRate, tremoloDepth].forEach(slider => {
    slider.addEventListener('input', () => { buildChain(); });
  });
  [chorusRate, chorusDepth, chorusMix].forEach(slider => {
    slider.addEventListener('input', () => { buildChain(); });
  });
  [flangerRate, flangerDepth, flangerMix].forEach(slider => {
    slider.addEventListener('input', () => { buildChain(); });
  });
  [delayTime, delayFeedback, delayMix].forEach(slider => {
    slider.addEventListener('input', () => { buildChain(); });
  });
  [reverbMix].forEach(slider => {
    slider.addEventListener('input', () => { buildChain(); });
  });

  // --- Activation micro ---
  startBtn.onclick = async () => {
    if (audioContext) {
      statusDiv.textContent = 'Déjà activé.';
      return;
    }
    try {
      statusDiv.textContent = 'Connexion au micro...';
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      sourceNode = audioContext.createMediaStreamSource(micStream);
      updateLeds();
      buildChain();
      statusDiv.textContent = 'Micro activé, pedalboard prêt !';
      startBtn.textContent = 'Micro activé !';
      startBtn.classList.add('main-btn');
      startBtn.disabled = true;
      startBtn.style.background = '#4caf50';
    } catch (e) {
      statusDiv.textContent = 'Erreur micro : ' + e.message;
    }
  };
}); 