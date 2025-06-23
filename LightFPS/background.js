chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area === 'sync') {
    const relevantKeys = [
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
      'soundPreset'
    ];

    // Check if any relevant key changed
    const shouldNotify = relevantKeys.some(key => key in changes);
    if (!shouldNotify) return;

    try {
      const tabs = await chrome.tabs.query({});
      if (!tabs || tabs.length === 0) return;

      for (const tab of tabs) {
        if (typeof tab.id === 'number') {
          try {
            await chrome.tabs.sendMessage(tab.id, { action: 'applyOptimizations' });
          } catch (e) {
            console.warn(`Failed to send message to tab ${tab.id}:`, e.message);
          }
        }
      }
    } catch (error) {
      console.error('Error querying tabs:', error);
    }
  }
});
