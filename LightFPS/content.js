chrome.storage.sync.get([
  'disableVideoAutoplay',
  'disableAudioAutoplay',
  'forceQuality',
  'fpsSmoother',
  'lazyLoadMedia',
  'blockTracking',
  'enableDarkMode',
  'reduceMemory',
  'disableAnimations',
  'autoOptimize',
  'enhanceSharpness',
  'reduceMotion',
  'fontSmoothing',
  'disableGifAutoplay',
  'enableMinimalUI',
  'betterSound',
  'soundPreset'
], (settings) => {
  if (!settings.autoOptimize) return;

  function debounce(fn, delay) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }

  function isLightColor(rgb) {
    if (!rgb) return false;
    const m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!m) return false;
    const [r, g, b] = m.slice(1, 4).map(Number);
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    return luminance > 200;
  }

  function applyDarkMode() {
    if (!settings.enableDarkMode) return;
    const DARK_BG = '#181818';
    const DARK_TEXT = '#ccc';
    const DARK_BORDER = '#444';

    function darken(el) {
      try {
        const style = getComputedStyle(el);
        if (isLightColor(style.backgroundColor) && !el.style.backgroundColor) {
          el.style.backgroundColor = DARK_BG;
        }
        if (isLightColor(style.color) && !el.style.color) {
          el.style.color = DARK_TEXT;
        }
        if (style.borderColor && isLightColor(style.borderColor) && !el.style.borderColor) {
          el.style.borderColor = DARK_BORDER;
        }
      } catch {
        // ignore
      }
    }

    function walk(node) {
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      darken(node);
      node.childNodes.forEach(walk);
    }

    walk(document.body);

    if (!document.documentElement.style.backgroundColor) {
      document.documentElement.style.backgroundColor = DARK_BG;
    }
    if (!document.body.style.backgroundColor) {
      document.body.style.backgroundColor = DARK_BG;
    }
    if (!document.body.style.color) {
      document.body.style.color = DARK_TEXT;
    }
  }

  function optimizeMedia() {
    const videos = document.querySelectorAll('video');
    const audios = document.querySelectorAll('audio');

    videos.forEach(video => {
      try {
        if (!['metadata', 'auto'].includes(video.preload)) {
          video.preload = 'none';
        }
        video.controls = true;
        video.disablePictureInPicture = true;

        if (settings.fpsSmoother) {
          video.playbackRate = 1.0;
          let lastTime = performance.now();

          function frameSync() {
            const now = performance.now();
            if (now - lastTime >= 16) {
              video.playbackRate = 1.0;
              lastTime = now;
            }
            if (!video.paused && !video.ended) requestAnimationFrame(frameSync);
          }

          if (!video.paused) requestAnimationFrame(frameSync);

          if (!video._fpsSmootherListenerAdded) {
            video.addEventListener('play', () => {
              lastTime = performance.now();
              requestAnimationFrame(frameSync);
            });
            video._fpsSmootherListenerAdded = true;
          }
        }

        if (settings.disableVideoAutoplay && video.autoplay) {
          video.autoplay = false;
          if (!video.paused) video.pause();
        }

        if (settings.forceQuality) {
          try {
            if (window.yt?.player?.setPlaybackQuality) {
              window.yt.player.setPlaybackQuality('hd1080');
            }
            if ('quality' in video) video.quality = 'high';
          } catch {
            // ignore
          }
        }
      } catch {
        // ignore
      }
    });

    audios.forEach(audio => {
      try {
        if (settings.disableAudioAutoplay && audio.autoplay) {
          audio.autoplay = false;
          if (!audio.paused) audio.pause();
        }
      } catch {
        // ignore
      }
    });
  }

  function applyLazyLoad() {
    if (!settings.lazyLoadMedia) return;
    document.querySelectorAll('img, video').forEach(el => {
      if (!el.hasAttribute('loading')) {
        el.setAttribute('loading', 'lazy');
      }
    });
  }

  let trackingObserver;

  function blockTracking() {
    if (!settings.blockTracking) return;

    const selectors = [
      '.ads', '.advertisement', 'iframe[src*="ads"]',
      'script[src*="ads"]', 'script[src*="tracking"]',
      'script[src*="analytics"]', 'img[src*="ads"]',
      '.popup', '.sponsored', '.ytp-ce-element'
    ];

    function removeElements() {
      selectors.forEach(sel => {
        document.querySelectorAll(sel).forEach(el => {
          if (el.style.visibility !== 'hidden') {
            el.style.visibility = 'hidden';
            setTimeout(() => {
              try { el.remove(); } catch { }
            }, 5000);
          }
        });
      });
    }

    removeElements();

    if (trackingObserver) {
      trackingObserver.disconnect();
    }

    trackingObserver = new MutationObserver(debounce(removeElements, 2000));
    trackingObserver.observe(document.body, { childList: true, subtree: true });

    try {
      document.cookie.split(';').forEach(cookie => {
        const name = cookie.split('=')[0].trim();
        if (/(_ga|_gid|_fbp|_gcl|_gat)/i.test(name)) {
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        }
      });
    } catch {
      // ignore
    }
  }

  function reduceMemory() {
    if (!settings.reduceMemory) return;

    const safeToRemoveSelectors = [
      '#comments', '#sidebar', '#chat',
      '.popup', '.ytp-ce-element',
      'link[rel="preload"]'
    ];

    safeToRemoveSelectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => {
        try {
          el.style.display = 'none';
        } catch { }
      });
    });

    document.querySelectorAll('iframe').forEach(iframe => {
      try {
        const src = iframe.src || '';
        const isAdOrEmbed = /ads|doubleclick|embed|widget/i.test(src);
        if (isAdOrEmbed) {
          iframe.src = 'about:blank';
          setTimeout(() => {
            try { iframe.remove(); } catch { }
          }, 3000);
        }
      } catch { }
    });
  }

  function disableAnimations() {
    if (!settings.disableAnimations) return;
    if (!document.getElementById('disable-animations-style')) {
      const style = document.createElement('style');
      style.id = 'disable-animations-style';
      style.textContent = `
        *, *::before, *::after {
          animation-play-state: paused !important;
          animation-duration: 0.001s !important;
        }
      `;
      document.head.appendChild(style);
    }
  }

  if (!document._visibilityListenerAdded) {
    document.addEventListener('visibilitychange', () => {
      const videos = document.querySelectorAll('video');
      videos.forEach(video => {
        try {
          if (document.hidden) {
            video.pause();
          } else if (!settings.disableVideoAutoplay) {
            video.play();
          }
        } catch { }
      });
    });
    document._visibilityListenerAdded = true;
  }

  function enhanceSharpness() {
    if (!settings.enhanceSharpness) return;
    if (!document.getElementById('sharpen-filter')) {
      const svgNS = "http://www.w3.org/2000/svg";
      const svg = document.createElementNS(svgNS, 'svg');
      svg.style.display = 'none';
      svg.id = 'sharpen-filter';

      const filter = document.createElementNS(svgNS, 'filter');
      filter.setAttribute('id', 'sharpen');
      filter.setAttribute('x', '-20%');
      filter.setAttribute('y', '-20%');
      filter.setAttribute('width', '140%');
      filter.setAttribute('height', '140%');

      const feConvolveMatrix = document.createElementNS(svgNS, 'feConvolveMatrix');
      feConvolveMatrix.setAttribute('order', '3');
      feConvolveMatrix.setAttribute('kernelMatrix', '0 -1 0 -1 5 -1 0 -1 0');

      filter.appendChild(feConvolveMatrix);
      svg.appendChild(filter);
      document.body.appendChild(svg);
    }

    document.querySelectorAll('img, video').forEach(el => {
      el.style.filter = 'contrast(1.1) saturate(1.1) url(#sharpen)';
    });
  }

  function reduceMotion() {
    if (!settings.reduceMotion) return;
    if (!document.getElementById('reduce-motion-style')) {
      const style = document.createElement('style');
      style.id = 'reduce-motion-style';
      style.textContent = `
        *, *::before, *::after {
          transition-duration: 0.001s !important;
          scroll-behavior: auto !important;
        }
        body {
          scroll-behavior: auto !important;
        }
      `;
      document.head.appendChild(style);
    }
  }

  function enableFontSmoothing() {
    if (!settings.fontSmoothing) return;
    if (!document.getElementById('font-smoothing-style')) {
      const style = document.createElement('style');
      style.id = 'font-smoothing-style';
      style.textContent = `
        body, input, textarea, select {
          -webkit-font-smoothing: antialiased !important;
          -moz-osx-font-smoothing: grayscale !important;
          text-rendering: optimizeLegibility !important;
        }
      `;
      document.head.appendChild(style);
    }
  }

  function disableGifAutoplay() {
    if (!settings.disableGifAutoplay) return;
    document.querySelectorAll('img[src$=".gif"]').forEach(img => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0, img.width, img.height);
        img.src = canvas.toDataURL('image/png');
      } catch { }
    });
  }

  function enableMinimalUI() {
    if (!settings.enableMinimalUI) return;
    const selectors = [
      'header', 'footer', '#sidebar', '.sidebar', '.comments',
      '.ads', '.advertisement', '.popup', '.newsletter-signup'
    ];
    selectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => {
        try {
          el.style.display = 'none';
        } catch { }
      });
    });
  }

function enableBetterSound() {
  if (!settings.betterSound) return;

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    console.warn('Better Sound: AudioContext not supported.');
    return;
  }

  if (!window._betterSoundAudioCtx) {
    window._betterSoundAudioCtx = new AudioContextClass();
  }
  const audioCtx = window._betterSoundAudioCtx;

  // Store current preset globally to detect changes
  if (!window._betterSoundCurrentPreset) {
    window._betterSoundCurrentPreset = null;
  }
  const newPreset = settings.soundPreset || 'flat';

  // If preset didn't change, no need to reset connections
  const presetChanged = window._betterSoundCurrentPreset !== newPreset;
  window._betterSoundCurrentPreset = newPreset;

  function applyPresetToFilters(filters, preset) {
    switch (preset) {
      case 'bass':
        filters.low.gain.value = 7;
        filters.mid.gain.value = 0;
        filters.high.gain.value = -2;
        break;
      case 'treble':
        filters.low.gain.value = -1;
        filters.mid.gain.value = 0;
        filters.high.gain.value = 5;
        break;
      case 'vocal':
        filters.low.gain.value = -3;
        filters.mid.gain.value = 5;
        filters.high.gain.value = 3;
        break;
      default: // flat
        filters.low.gain.value = 0;
        filters.mid.gain.value = 0;
        filters.high.gain.value = 0;
    }
  }

  function disconnectOldGraph(el) {
    if (!el._betterSoundConnected) return;
    try {
      if (el._betterSoundNodes) {
        const { source, low, mid, high } = el._betterSoundNodes;
        source.disconnect();
        low.disconnect();
        mid.disconnect();
        high.disconnect();
      }
      el._betterSoundConnected = false;
      el._betterSoundNodes = null;
    } catch (e) {
      console.warn('Better Sound: Error disconnecting old audio graph', e);
    }
  }

  function setupAudioGraph(el) {
    try {
      // If already connected and preset didn't change, skip
      if (el._betterSoundConnected && !presetChanged) return;

      // If connected but preset changed, disconnect old graph first
      if (el._betterSoundConnected && presetChanged) {
        disconnectOldGraph(el);
      }

      const source = audioCtx.createMediaElementSource(el);

      const low = audioCtx.createBiquadFilter();
      low.type = 'lowshelf';
      low.frequency.value = 200;

      const mid = audioCtx.createBiquadFilter();
      mid.type = 'peaking';
      mid.frequency.value = 1000;
      mid.Q.value = 1;

      const high = audioCtx.createBiquadFilter();
      high.type = 'highshelf';
      high.frequency.value = 3000;

      applyPresetToFilters({ low, mid, high }, newPreset);

      source.connect(low);
      low.connect(mid);
      mid.connect(high);
      high.connect(audioCtx.destination);

      el.addEventListener('play', () => {
        if (audioCtx.state === 'suspended') {
          audioCtx.resume().catch(() => {});
        }
      });

      el._betterSoundConnected = true;
      el._betterSoundNodes = { source, low, mid, high };
    } catch (e) {
      console.warn('Better Sound EQ error:', e, el);
    }
  }

  // Setup current audio and video elements
  document.querySelectorAll('audio, video').forEach(setupAudioGraph);

  // Watch for dynamically added audio/video elements
  if (!window._betterSoundObserver) {
    window._betterSoundObserver = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.matches && (node.matches('audio') || node.matches('video'))) {
              setupAudioGraph(node);
            }
            node.querySelectorAll && node.querySelectorAll('audio, video').forEach(setupAudioGraph);
          }
        });
      }
    });
    window._betterSoundObserver.observe(document.body, { childList: true, subtree: true });
  } else if (presetChanged) {
    // If observer exists and preset changed, re-setup all elements
    document.querySelectorAll('audio, video').forEach(setupAudioGraph);
  }
}


  function runAll() {
    optimizeMedia();
    applyLazyLoad();
    blockTracking();
    applyDarkMode();
    reduceMemory();
    disableAnimations();
    enhanceSharpness();
    reduceMotion();
    enableFontSmoothing();
    disableGifAutoplay();
    enableMinimalUI();
    enableBetterSound();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runAll);
  } else {
    runAll();
  }
});
