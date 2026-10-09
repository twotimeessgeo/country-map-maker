/* Meridian player. Click the picture or the big button to play and pause; the glass strip rests after 2.4s of stillness while playing.
   Keys: Space or K play/pause, ← → five seconds, M sound, F full screen. */
(() => {
  const player = document.querySelector("#mxPlayer");
  if (!player) return;
  const video = player.querySelector("#mxVideo");
  const frame = player.querySelector("#mxFrame");
  const big = player.querySelector("#mxBig");
  const glass = player.querySelector("#mxGlass");
  const toggle = player.querySelector("#mxToggle");
  const seek = player.querySelector("#mxSeek");
  const sound = player.querySelector("#mxSound");
  const full = player.querySelector("#mxFull");
  const current = player.querySelector("#mxCurrent");
  const remaining = player.querySelector("#mxRemaining");
  const SEEK_MAX = Number(seek.max) || 1000;

  /* 4K master on screens that can show it, 1080 elsewhere. Chosen once, before the first load. */
  const wide = Math.max(screen.width, screen.height) * (devicePixelRatio || 1) >= 2400;
  const src = video.dataset[wide ? "src2160" : "src1080"];
  if (src && video.querySelector("source")?.getAttribute("src") !== src) {
    video.querySelector("source").src = src;
    video.load();
  }
  const REST_MS = 2400;
  let scrubbing = false;
  let wasPlaying = false;
  let restTimer = 0;
  let pointerInside = false;

  const clock = (seconds) => {
    const s = Math.max(0, Math.round(seconds || 0));
    return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
  };
  const paint = () => {
    const duration = video.duration || 0;
    const ratio = duration ? video.currentTime / duration : 0;
    if (!scrubbing) {
      seek.value = String(Math.round(ratio * SEEK_MAX));
      seek.style.setProperty("--p", (ratio * 100).toFixed(2) + "%");
    }
    current.textContent = clock(video.currentTime);
    remaining.textContent = "−" + clock(duration - video.currentTime);
    seek.setAttribute("aria-valuetext", clock(video.currentTime));
  };
  const setState = (state) => {
    player.dataset.state = state;
    const label = state === "playing" ? "일시 정지" : state === "ended" ? "다시 재생" : "재생";
    toggle.setAttribute("aria-label", label);
    big.setAttribute("aria-label", label);
  };

  /* Controls rest only while playing, and only when nothing in the strip has focus. */
  const wake = () => {
    player.dataset.controls = "shown";
    clearTimeout(restTimer);
    if (player.dataset.state !== "playing") return;
    restTimer = setTimeout(() => {
      if (glass.contains(document.activeElement) || scrubbing) { wake(); return; }
      player.dataset.controls = "hidden";
    }, REST_MS);
  };

  const play = () => {
    if (video.ended) video.currentTime = 0;
    video.play().catch(() => {});
  };
  const pause = () => video.pause();
  const flip = () => (video.paused || video.ended ? play() : pause());

  video.addEventListener("loadedmetadata", paint);
  video.addEventListener("play", () => { setState("playing"); wake(); });
  video.addEventListener("pause", () => { if (!video.ended) setState("paused"); wake(); });
  video.addEventListener("ended", () => { setState("ended"); paint(); wake(); });
  video.addEventListener("timeupdate", paint);
  video.addEventListener("volumechange", () => {
    sound.setAttribute("aria-pressed", String(video.muted));
    sound.setAttribute("aria-label", video.muted ? "소리 켜기" : "소리 끄기");
  });

  big.addEventListener("click", () => { flip(); frame.focus({ preventScroll: true }); });
  video.addEventListener("click", () => {
    // On touch, the first tap on a resting picture only brings the controls back.
    if (matchMedia("(hover: none)").matches && player.dataset.controls === "hidden") { wake(); return; }
    flip();
  });
  toggle.addEventListener("click", flip);
  sound.addEventListener("click", () => { video.muted = !video.muted; });
  full.addEventListener("click", () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else if (frame.requestFullscreen) frame.requestFullscreen();
    else if (video.webkitEnterFullscreen) video.webkitEnterFullscreen(); // iPhone
  });
  document.addEventListener("fullscreenchange", () => {
    full.setAttribute("aria-label", document.fullscreenElement ? "전체 화면 끝내기" : "전체 화면");
    wake();
  });

  frame.addEventListener("pointermove", () => { pointerInside = true; wake(); });
  frame.addEventListener("pointerleave", () => {
    pointerInside = false;
    if (player.dataset.state === "playing") { clearTimeout(restTimer); restTimer = setTimeout(() => { if (!glass.contains(document.activeElement)) player.dataset.controls = "hidden"; }, 600); }
  });
  glass.addEventListener("focusin", wake);
  glass.addEventListener("focusout", () => setTimeout(wake, 0));

  /* Seeking: the picture follows the thumb; playback resumes where it was. */
  const seekTo = () => {
    if (!video.duration) return;
    const ratio = Number(seek.value) / SEEK_MAX;
    video.currentTime = ratio * video.duration;
    seek.style.setProperty("--p", (ratio * 100).toFixed(2) + "%");
    current.textContent = clock(video.currentTime);
    remaining.textContent = "−" + clock(video.duration - video.currentTime);
  };
  seek.addEventListener("pointerdown", () => {
    scrubbing = true;
    wasPlaying = !video.paused && !video.ended;
    seek.classList.add("is-scrubbing");
    if (wasPlaying) video.pause();
    wake();
  });
  seek.addEventListener("input", seekTo);
  const release = () => {
    if (!scrubbing) return;
    scrubbing = false;
    seek.classList.remove("is-scrubbing");
    seekTo();
    if (wasPlaying) play();
  };
  seek.addEventListener("pointerup", release);
  seek.addEventListener("pointercancel", release);
  seek.addEventListener("change", () => { if (!scrubbing) seekTo(); });

  document.addEventListener("keydown", (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.repeat) return;
    const focused = document.activeElement;
    const inPlayer = player.contains(focused);
    const idle = !focused || focused === document.body;
    if (!inPlayer && !idle) return;
    if (focused === seek && (event.key === "ArrowLeft" || event.key === "ArrowRight")) { wake(); return; }
    if (event.key === " " || event.key === "k") {
      if (focused?.tagName === "BUTTON" && focused !== big) return;
      event.preventDefault();
      flip();
    } else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      if (!video.duration) return;
      event.preventDefault();
      video.currentTime = Math.min(video.duration, Math.max(0, video.currentTime + (event.key === "ArrowLeft" ? -5 : 5)));
      paint();
      wake();
    } else if (event.key === "m") {
      event.preventDefault();
      video.muted = !video.muted;
      wake();
    } else if (event.key === "f") {
      event.preventDefault();
      full.click();
    } else if (event.key === "Escape" && !document.fullscreenElement) {
      frame.blur();
    }
  });

  if (video.readyState >= 1) paint();
})();
