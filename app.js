/* Abai AR demo: MindAR image tracking + Three.js + browser speech synthesis. */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MindARThree } from "mindar-image-three";

(() => {
  const $ = (id) => document.getElementById(id);
  const startButton = $("startButton");
  const stopButton = $("stopButton");
  const voiceButton = $("voiceButton");
  const speakButton = $("speakButton");
  const stopSpeechButton = $("stopSpeechButton");
  const intro = $("intro");
  const stage = $("cameraStage");
  const status = $("status");
  const scanTip = $("scanTip");
  const bioCard = $("bioCard");

  const story = "Здравствуйте! Меня зовут Абай Кунанбаев. Я казахский поэт, мыслитель, композитор и просветитель. Я призывал людей к знаниям, труду, честности и доброте. В своих произведениях я размышлял о нравственности, образовании и человеческом достоинстве.";
  let mindar = null;
  let anchor = null;
  let currentModel = null;
  let found = false;
  let speaking = false;

  function setStatus(message) { status.textContent = message; }

  function speakStory() {
    if (!("speechSynthesis" in window)) {
      setStatus("Этот браузер не поддерживает озвучивание");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(story);
    utterance.lang = "ru-RU";
    utterance.rate = 0.88;
    utterance.pitch = 0.92;
    utterance.onstart = () => {
      speaking = true;
      speakButton.textContent = "Ⅱ Остановить";
      voiceButton.textContent = "Ⅱ Остановить рассказ";
    };
    utterance.onend = utterance.onerror = () => {
      speaking = false;
      speakButton.textContent = "▶ Послушать";
      voiceButton.textContent = "▶ Слушать рассказ";
    };
    window.speechSynthesis.speak(utterance);
  }

  function stopSpeech() {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    speaking = false;
    speakButton.textContent = "▶ Послушать";
    voiceButton.textContent = "▶ Слушать рассказ";
  }

  speakButton.addEventListener("click", () => speaking ? stopSpeech() : speakStory());
  voiceButton.addEventListener("click", () => speaking ? stopSpeech() : speakStory());
  stopSpeechButton.addEventListener("click", stopSpeech);

  async function startAR() {
    intro.hidden = true;
    stage.hidden = false;
    bioCard.hidden = true;
    startButton.disabled = true;
    setStatus("Запускаем камеру…");

    try {
      mindar = new MindARThree({
        container: $("ar-container"),
        imageTargetSrc: "./targets.mind",
        maxTrack: 1,
        uiLoading: "no",
        uiScanning: "no",
        uiError: "no"
      });

      const { renderer, scene, camera } = mindar;
      anchor = mindar.addAnchor(0);

      // A soft light helps show most GLB models. Adjust scale after adding your model.
      scene.add(new THREE.HemisphereLight(0xffffff, 0x777766, 2.0));
      const keyLight = new THREE.DirectionalLight(0xffffff, 2.0);
      keyLight.position.set(0, 2, 3);
      scene.add(keyLight);

      let mixer = null;
      const clock = new THREE.Clock();
      const loader = new GLTFLoader();
      loader.load(
        "./model.glb",
        (gltf) => {
          currentModel = gltf.scene;
          currentModel.scale.set(0.45, 0.45, 0.45);
          currentModel.position.set(0, -0.45, 0.05);
          anchor.group.add(currentModel);
          if (gltf.animations && gltf.animations.length) {
            mixer = new THREE.AnimationMixer(currentModel);
            mixer.clipAction(gltf.animations[0]).play();
          }
        },
        undefined,
        (error) => {
          console.error("Could not load assets/abai.glb", error);
          setStatus("Не найдена 3D-модель");
          scanTip.textContent = "Добавьте файл assets/abai.glb — пока AR будет без персонажа";
        }
      );

      anchor.onTargetFound = () => {
        found = true;
        scanTip.textContent = "Портрет найден — Абай рядом с вами";
        voiceButton.disabled = false;
        bioCard.hidden = false;
        setStatus("Портрет распознан");
      };
      anchor.onTargetLost = () => {
        found = false;
        scanTip.textContent = "Наведите камеру на портрет Абая";
        voiceButton.disabled = true;
        bioCard.hidden = true;
        setStatus("Ищем портрет…");
        stopSpeech();
      };

      await mindar.start();
      renderer.setAnimationLoop(() => {
        if (mixer) mixer.update(Math.min(clock.getDelta(), 0.05));
        renderer.render(scene, camera);
      });
      setStatus("Ищем портрет…");
    } catch (error) {
      console.error(error);
      setStatus("Не удалось запустить камеру");
      alert("Не удалось запустить AR. Проверьте HTTPS, разрешение камеры и наличие файла targets.mind. Подробности можно посмотреть в консоли браузера.");
      await stopAR();
    } finally {
      startButton.disabled = false;
    }
  }

  async function stopAR() {
    stopSpeech();
    if (mindar) {
      try {
        mindar.renderer.setAnimationLoop(null);
        await mindar.stop();
      } catch (e) { console.warn(e); }
      mindar = null;
    }
    const container = $("ar-container");
    container.innerHTML = "";
    stage.hidden = true;
    bioCard.hidden = true;
    intro.hidden = false;
    voiceButton.disabled = true;
    setStatus("Готово к запуску");
  }

  startButton.addEventListener("click", startAR);
  stopButton.addEventListener("click", stopAR);

  // On a first target detection, speech is deliberately user-triggered for browser autoplay policies.
})();
