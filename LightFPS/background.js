chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area !== 'sync') return;

  const relevantKeys = [
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
    'soundPreset',
    'betterSound'
  ];

  const shouldNotify = relevantKeys.some(key => Object.hasOwn(changes, key));
  if (!shouldNotify) return;

  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (tab.id !== undefined) {
        chrome.tabs.sendMessage(tab.id, { action: 'applyOptimizations' }).catch(err => {
          console.warn(`Failed to send message to tab ${tab.id}:`, err.message);
        });
      }
    }
  } catch (error) {
    console.error('Error querying tabs:', error.message);
  }
});
