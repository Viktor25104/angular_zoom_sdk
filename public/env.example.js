(function applyClientEnv(windowRef) {
  windowRef.__zoomEnv = {
    wsUrl: 'ws://localhost:8081',
    logLevel: 'info',
    reconnectInitialDelayMs: 1000,
    reconnectMaxDelayMs: 15000,
    handshakeTimeoutMs: 3000,
    monitorIntervalMs: 1500,
    panelCloseTimeoutMs: 3000,
    zoom: {
      sdkKey: '',
      signature: '',
      meetingNumber: '',
      passWord: '',
      userName: '',
      userEmail: '',
      tk: '',
      zak: ''
    }
  };
})(window);
