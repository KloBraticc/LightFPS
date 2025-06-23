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
  const keys = [...Object.keys(options), 'autoOptimize'];
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
    await saveOptions();
    if (statusMsg) {
      statusMsg.textContent = 'Applying optimizations...';
    }

    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs || tabs.length === 0) {
      if (statusMsg) {
        statusMsg.textContent = 'No active tab found.';
      }
      return;
    }

    const activeTab = tabs[0];
    
    // Check if we can inject scripts into this tab
    if (activeTab.url.startsWith('chrome://') || 
        activeTab.url.startsWith('chrome-extension://') ||
        activeTab.url.startsWith('moz-extension://') ||
        activeTab.url.startsWith('about:')) {
      if (statusMsg) {
        statusMsg.textContent = 'Cannot optimize this page type.';
      }
      return;
    }

    await chrome.scripting.executeScript({
      target: { tabId: activeTab.id },
      files: ['content.js'],
    });

    if (statusMsg) {
      statusMsg.textContent = 'Optimizations applied!';
      setTimeout(() => {
        if (statusMsg) {
          statusMsg.textContent = '';
        }
      }, 3500);
    }
  } catch (err) {
    console.error('Error applying optimizations:', err);
    if (statusMsg) {
      statusMsg.textContent = 'Failed to apply optimizations.';
    }
  }
}

async function onAutoOptimizeToggleClick() {
  try {
    const enabled = autoOptimizeToggle.dataset.enabled === 'true';
    const newStatus = !enabled;
    await setStorage({ autoOptimize: newStatus });
    autoOptimizeToggle.textContent = `Auto Optimize: ${newStatus ? 'ON' : 'OFF'}`;
    autoOptimizeToggle.dataset.enabled = newStatus.toString();
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

// Initialize when DOM is ready
function initializePopup() {
  // Check if required elements exist
  if (!applyBtn || !statusMsg) {
    console.error('Required DOM elements not found');
    return;
  }

  // Add event listeners
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

  // Load options and apply optimizations
  loadOptions().then(() => {
    // Only auto-apply if explicitly configured to do so
    // Remove automatic application on popup open
    console.log('Popup initialized and options loaded');
  }).catch(err => {
    console.error('Error initializing popup:', err);
  });
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializePopup);
} else {
  initializePopup();
}