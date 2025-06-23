chrome.storage.sync.get([
  'disableVideoAutoplay',
  'disableAudioAutoplay',
  'forceQuality',
  'fpsSmoother',
  'lazyLoadMedia',
  'blockTracking',
  'enableDarkMode',
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

function blockTrackingAndAds() {
  if (!settings.blockTracking) return;

  const adSelectors = [
    'ytd-promoted-sparkles-text-search-renderer',
    'ytd-display-ad-renderer',
    '#player-ads',
    '.video-ads',
    '.ytp-ad-module',
    '.ytp-ad-player-overlay',
    '.ytp-ad-overlay-slot',
    '.ytp-ad-skip-button-container',
    '.ytp-ad-progress-list',
    '.ytp-ad-image-overlay',
    'ytd-companion-slot-renderer',
    '.ytp-ad-preview-container',
    '.ytp-ad-message-container',
    'iframe[src*="doubleclick"]',
    'iframe[src*="ad"]',
    'script[src*="ads"]',
    'script[src*="tracking"]',
    'script[src*="doubleclick"]',
    'img[src*="ads"]',
    '.ytp-ce-element',
    '.sponsored',
    '.ads', '.advertisement', '.popup'
  ];

  const removeAds = () => {
    adSelectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => {
        el.remove();
      });
    });

    // Attempt to reset ad-related variables (YouTube-specific)
    try {
      if (window.yt && yt.config_) {
        yt.config_.ADSENSE_ENABLED = false;
        yt.config_.AD_TAG = null;
      }
      if (window.ytplayer) {
        ytplayer.config.ad3_module = null;
      }
    } catch (e) {}
  };

  const clearTrackingCookies = () => {
    try {
      document.cookie.split(';').forEach(cookie => {
        const name = cookie.split('=')[0].trim();
        if (/(_ga|_gid|_fbp|_gcl|_gat|IDE|DSID|ANID)/i.test(name)) {
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.youtube.com`;
        }
      });
    } catch (e) {}
  };

  const observer = new MutationObserver(() => {
    removeAds();
  });

  removeAds();
  clearTrackingCookies();

  if (trackingObserver) trackingObserver.disconnect();
  trackingObserver = observer;
  trackingObserver.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Run on load and periodically
blockTrackingAndAds();
setInterval(blockTrackingAndAds, 5000);

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

let _sharpenedElements = new Set();
let _sharpenSVG = null;

function enhanceSharpness() {
  if (!settings.enhanceSharpness) return;

  // Create SVG filter if not present
  if (!_sharpenSVG) {
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
    _sharpenSVG = svg;
  }

  // Apply filter to all images and videos
  document.querySelectorAll('img, video').forEach(el => {
    if (!el._sharpened) {
      el.style.filter = 'contrast(1.1) saturate(1.1) url(#sharpen)';
      el._sharpened = true;
      _sharpenedElements.add(el);
    }
  });
}

function disableSharpness() {
  _sharpenedElements.forEach(el => {
    try {
      el.style.filter = '';
      el._sharpened = false;
    } catch (e) {
      console.warn('Error clearing sharpness filter:', el, e);
    }
  });

  _sharpenedElements.clear();

  if (_sharpenSVG) {
    _sharpenSVG.remove();
    _sharpenSVG = null;
  }
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

let _betterSoundObserver = null;
let _connectedElements = new Set();

function enableBetterSound() {
  if (!settings.betterSound) return;

  const preset = settings.soundPreset || 'flat';

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    console.warn('Better Sound: AudioContext not supported.');
    return;
  }

  if (!window._betterSoundAudioCtx) {
    window._betterSoundAudioCtx = new AudioContextClass();
  }
  const audioCtx = window._betterSoundAudioCtx;

  function setupAudioGraph(el) {
    try {
      if (el._betterSoundConnected) return;

      const source = audioCtx.createMediaElementSource(el);

      const gainNodes = {
        low: audioCtx.createBiquadFilter(),
        mid: audioCtx.createBiquadFilter(),
        high: audioCtx.createBiquadFilter(),
      };

      gainNodes.low.type = 'lowshelf';
      gainNodes.low.frequency.value = 200;

      gainNodes.mid.type = 'peaking';
      gainNodes.mid.frequency.value = 1000;
      gainNodes.mid.Q.value = 1;

      gainNodes.high.type = 'highshelf';
      gainNodes.high.frequency.value = 3000;

      switch (preset) {
        case 'bass':
          gainNodes.low.gain.value = 10;
          gainNodes.mid.gain.value = 0;
          gainNodes.high.gain.value = -2;
          break;
        case 'treble':
          gainNodes.low.gain.value = -2;
          gainNodes.mid.gain.value = 0;
          gainNodes.high.gain.value = 10;
          break;
        case 'vocal':
          gainNodes.low.gain.value = -4;
          gainNodes.mid.gain.value = 8;
          gainNodes.high.gain.value = 4;
          break;
        case 'flat':
          gainNodes.low.gain.value = 0;
          gainNodes.mid.gain.value = 0;
          gainNodes.high.gain.value = 0;
      }

      source
        .connect(gainNodes.low)
        .connect(gainNodes.mid)
        .connect(gainNodes.high)
        .connect(audioCtx.destination);

      el.addEventListener('play', () => {
        if (audioCtx.state === 'suspended') {
          audioCtx.resume().catch(() => {});
        }
      });

      el._betterSoundConnected = true;
      el._betterSoundSource = source;
      el._betterSoundNodes = gainNodes;

      _connectedElements.add(el);
    } catch (e) {
      console.warn('Better Sound EQ error:', e, el);
    }
  }

  // Apply to all existing elements
  document.querySelectorAll('audio, video').forEach(setupAudioGraph);

  // Observe new elements
  _betterSoundObserver = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          if (node.matches?.('audio, video')) {
            setupAudioGraph(node);
          }
          node.querySelectorAll?.('audio, video')?.forEach(setupAudioGraph);
        }
      });
    }
  });

  _betterSoundObserver.observe(document.body, { childList: true, subtree: true });
}

function disableBetterSound() {
  if (_betterSoundObserver) {
    _betterSoundObserver.disconnect();
    _betterSoundObserver = null;
  }

  _connectedElements.forEach(el => {
    try {
      if (el._betterSoundSource) {
        el._betterSoundSource.disconnect();
        el._betterSoundSource = null;
      }
      if (el._betterSoundNodes) {
        Object.values(el._betterSoundNodes).forEach(node => {
          try {
            node.disconnect();
          } catch (_) {}
        });
        el._betterSoundNodes = null;
      }

      el._betterSoundConnected = false;
    } catch (e) {
      console.warn('Error disabling better sound for element:', el, e);
    }
  });

  _connectedElements.clear();

  if (window._betterSoundAudioCtx?.state !== 'closed') {
    window._betterSoundAudioCtx.close().catch(() => {});
  }

  window._betterSoundAudioCtx = null;
}



function runAll() {
  optimizeMedia();
  applyLazyLoad();
  applyDarkMode();
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
