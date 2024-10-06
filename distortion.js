document.addEventListener('DOMContentLoaded', () => {
    let sound = new Pizzicato.Sound({ source: 'input' }, () => {
        let distortion = new Pizzicato.Effects.Distortion({
          gain: 0.4
        });
        sound.addEffect(distortion);
        sound.play();
    });
});
