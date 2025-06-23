const applyBtn = document.getElementById('applyBtn');
const statusMsg = document.getElementById('statusMsg');
const autoOptimizeToggle = document.getElementById('autoOptimizeToggle');

const options = {
  disableVideoAutoplay: document.getElementById('disableVideoAutoplay'),
  disableAudioAutoplay: document.getElementById('disableAudioAutoplay'),
  forceQuality: document.getElementById('forceQuality'),
  fpsSmoother: document.getElementById('fpsSmoother'),
  lazyLoadMedia: document.getElementById('lazyLoadMedia'),
  blockTracking: document.getElementById('blockTracking'),
  enableDarkMode: document.getElementById('enableDarkMode'),
  reduceMemory: document.getElementById('reduceMemory'),
  disableAnimations: document.getElementById('disableAnimations'),
  enhanceSharpness: document.getElementById('enhanceSharpness'),
  reduceMotion: document.getElementById('reduceMotion'),
  fontSmoothing: document.getElementById('fontSmoothing'),
  disableGifAutoplay: document.getElementById('disableGifAutoplay'),
  enableMinimalUI: document.getElementById('enableMinimalUI'),
};

const betterSoundToggle = document.getElementById('betterSound');
const soundPresetSelect = document.getElementById('soundPreset');

function showLoader() {
  const loader = document.getElementById('loadingOverlay');
  if (loader) loader.classList.add('active');
}

function hideLoader() {
  const loader = document.getElementById('loadingOverlay');
  if (loader) loader.classList.remove('active');
}

function getStorage(keys) {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(keys, (result) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(result);
      }
    });
  });
}

function setStorage(items) {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.set(items, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
}

async function loadOptions() {
  const keys = [...Object.keys(options), 'autoOptimize', 'betterSound', 'soundPreset'];
  try {
    const data = await getStorage(keys);

    for (const key of Object.keys(options)) {
      if (options[key]) {
        options[key].checked = Boolean(data[key]);
      }
    }

    const autoOn = Boolean(data.autoOptimize);
    if (autoOptimizeToggle) {
      autoOptimizeToggle.textContent = `Auto Optimize: ${autoOn ? 'ON' : 'OFF'}`;
      autoOptimizeToggle.dataset.enabled = autoOn.toString();
    }

    if (betterSoundToggle) {
      betterSoundToggle.checked = Boolean(data.betterSound);
    }

    if (soundPresetSelect) {
      soundPresetSelect.value = data.soundPreset || 'flat';
    }
  } catch (err) {
    console.error('Error loading options:', err);
    if (statusMsg) {
      statusMsg.textContent = 'Failed to load options.';
    }
  }
}

async function saveOptions() {
  try {
    const newSettings = {};
    for (const key of Object.keys(options)) {
      if (options[key]) {
        newSettings[key] = options[key].checked;
      }
    }

    newSettings.betterSound = betterSoundToggle?.checked || false;
    newSettings.soundPreset = soundPresetSelect?.value || 'flat';

    await setStorage(newSettings);
  } catch (err) {
    console.error('Error saving options:', err);
    if (statusMsg) {
      statusMsg.textContent = 'Failed to save options.';
    }
  }
}

async function applyOptimizations() {
  try {
    showLoader();
    await saveOptions();

    if (statusMsg) statusMsg.textContent = 'Applying optimizations...';

    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs || tabs.length === 0) {
      if (statusMsg) statusMsg.textContent = 'No active tab found.';
      hideLoader();
      return;
    }

    const activeTab = tabs[0];
    const invalid = ['chrome://', 'chrome-extension://', 'moz-extension://', 'about:'];
    if (invalid.some(prefix => activeTab.url.startsWith(prefix))) {
      statusMsg.textContent = 'Cannot optimize this page type.';
      hideLoader();
      return;
    }

    // Save current settings before reload
    await chrome.scripting.executeScript({
      target: { tabId: activeTab.id },
      files: ['content.js'],
    });

    if (statusMsg) statusMsg.textContent = 'Optimizations applied!';
    setTimeout(() => (statusMsg.textContent = ''), 3000);

  } catch (err) {
    console.error('Apply error:', err);
    statusMsg.textContent = 'Failed to apply optimizations.';
  } finally {
    hideLoader();
  }
}

async function onAutoOptimizeToggleClick() {
  try {
    const enabled = autoOptimizeToggle.dataset.enabled === 'true';
    const newStatus = !enabled;
    await setStorage({ autoOptimize: newStatus });
    if (autoOptimizeToggle) {
      autoOptimizeToggle.textContent = `Auto Optimize: ${newStatus ? 'ON' : 'OFF'}`;
      autoOptimizeToggle.dataset.enabled = newStatus.toString();
    }
  } catch (err) {
    console.error('Error toggling auto optimize:', err);
    if (statusMsg) {
      statusMsg.textContent = 'Failed to toggle Auto Optimize.';
    }
  }
}

function onApplyBtnClick() {
  applyOptimizations();
}

function onOptionChange() {
  saveOptions();
}

function initializePopup() {
  if (!applyBtn || !statusMsg) {
    console.error('Required DOM elements not found');
    return;
  }

  if (autoOptimizeToggle) {
    autoOptimizeToggle.addEventListener('click', onAutoOptimizeToggleClick);
  }

  if (applyBtn) {
    applyBtn.addEventListener('click', onApplyBtnClick);
  }

  for (const key of Object.keys(options)) {
    if (options[key]) {
      options[key].addEventListener('change', onOptionChange);
    }
  }

  if (betterSoundToggle) {
    betterSoundToggle.addEventListener('change', onOptionChange);
  }

  if (soundPresetSelect) {
    soundPresetSelect.addEventListener('change', onOptionChange);
  }

  loadOptions()
    .then(() => {
      console.log('Popup initialized and options loaded');
    })
    .catch(err => {
      console.error('Error initializing popup:', err);
      if (statusMsg) {
        statusMsg.textContent = 'Failed to initialize popup.';
      }
    });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializePopup);
} else {
  initializePopup();
}


