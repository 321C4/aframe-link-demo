/* globals AFRAME, sessionStorage, THREE */
(function () {
  // Do not log in production.
  var debug = window.location.protocol !== 'https:';
  var log = debug ? console.log.bind(console) : function () {};

  var registerComponent = function () {
    if (typeof AFRAME === 'undefined') {
      throw new Error('Component attempted to register before AFRAME ' +
        'was available.');
    }

    /**
     * Hyperlink component for A-Frame.
     */
    AFRAME.registerComponent('href', {
      schema: {
        default: ''
      },

      /**
       * Called once when component is attached.
       */
      init: function () {
        this.handler = this.handler.bind(this);
        this.el.addEventListener('click', this.handler);
        this.el.addEventListener('gripdown', this.handler);
        this.setupHighlight();
      },

      /**
       * Called when component is removed.
       */
      remove: function () {
        this.el.removeEventListener('click', this.handler);
        this.el.removeEventListener('gripdown', this.handler);
      },

      handler: function () {
        var url = this.data;
        this.el.emit('navigate', url);
        window.location.href = url;
      },

      setupHighlight: function () {
        // clone mesh and setup highlighter material
        var mesh = this.el.object3DMap.mesh;
        if (!mesh) {
          return false;
        }
        var clone = mesh.clone();
        clone.material = new THREE.MeshBasicMaterial({
            color: 0x0000ff,
            transparent: true,
            opacity: 0.3
        });
        clone.scale.set(1.2, 1.2, 1.2);
        clone.visible = false;
        mesh.parent.add(clone);

        // toggle highlighter on mouse events
        this.el.addEventListener('mouseenter', function (e) {
          clone.visible = true;
        })

        this.el.addEventListener('mouseleave', function (e) {
          clone.visible = false;
        });
      }
    });
  };

  if (!navigator.getVRDisplays || navigator.vrEnabled === false) {
    return;
  }

  var initScenesCalled = false;

  var whenScene = function (scene, event, callback) {
    // TODO: Return Promises.
    if (event === 'loaded' && scene.hasLoaded) {
      callback();
      return;
    }
    scene.addEventListener(event, callback);
  };

  var sceneLoaded = function (scene, displays) {
    var shouldPresent = false;
    if (sessionStorage.vrNavigation === 'true') {
      shouldPresent = true;
      delete sessionStorage.vrNavigation;
    }

    if (!scene) {
      return;
    }

    scene.dataset.isLoaded = 'true';

    if (!displays || !shouldPresent) {
      return;
    }

    var toPresent = [];
    if (navigator.activeVRDisplays && navigator.activeVRDisplays.length) {
      toPresent = navigator.activeVRDisplays;
    }

    // For navigation.
    if (sessionStorage && sessionStorage.activeVRDisplaysIDs) {
      var displayIDs = [];
      try {
        displayIDs = JSON.parse(sessionStorage.activeVRDisplaysIDs);
      } catch (e) {
      }
      toPresent = displayIDs.filter(function (displayID) {
        return displayID;
      });
    }

    if (toPresent.length) {
      // TODO: Handle entering multiple scenes.
      // TODO: Update A-Frame for `<a-scene>`.`enterVR()` to accept an
      // explicit `VRDisplay` to present to.
      if (scene.enterVR) {
        return scene.enterVR(toPresent[0]);
      }
    }
  };

  var handleDisplays = function (displays) {
    if (!displays.length) { return; }
    log('gotDisplays', displays);
    return displays;
  };

  var initScenes = function () {
    log('initScenes: called', initScenesCalled);

    if (initScenesCalled) {
      return;
    }

    initScenesCalled = true;

    var scenes = document.querySelectorAll('a-scene');
    if (!scenes.length) {
      return;
    }

    log('initScenes: checking', initScenesCalled);

    var scene;
    for (var i = 0; i < scenes.length; i++) {
      scene = scenes[i];

      scene.addEventListener('click', function (e) {
        if (e.detail && e.detail.intersectedEl && e.detail.intersectedEl.hasAttribute('href')) {
          // Fade out to black (isn't super noticeable because navigation
          // happens so quickly).
          scene.dataset.isLoaded = 'false';
        }
      });

      whenScene(scene, 'loaded', function () {
        log('initScenes: loaded', initScenesCalled);
        if (navigator.getVRDisplays && navigator.vrEnabled !== false) {
          // NOTE: This `navigator.getVRDisplays` call is needed by both
          // Firefox Nightly and experimental Chromium builds currently.
          // And we use it to pass `displays` to `sceneLoaded`, but even
          // if we weren't, we still need this call to "initialise" the
          // WebVR code path in the aforementioned browsers.
          return navigator.getVRDisplays().then(handleDisplays).then(function (displays) {
            return sceneLoaded(scene, displays);
          });
        } else {
          return sceneLoaded(scene);
        }
      });
    }
  };

  var activeVRDisplaysUpdate = function (displays) {
    // Polyfilling `navigator.activeVRDisplays` if unavailable.
    if (!('activeVRDisplays' in navigator)) {
      navigator.activeVRDisplays = displays.filter(function (display) {
        return display.isPresenting;
      });
    }
    if (sessionStorage.vrNavigation === 'true') {
      return;
    }
    sessionStorage.activeVRDisplaysIDs = JSON.stringify(navigator.activeVRDisplays.map(function (display) {
      return display.displayId;
    }));
  };

  registerComponent();

  if (navigator.getVRDisplays && navigator.vrEnabled !== false) {
    navigator.getVRDisplays().then(activeVRDisplaysUpdate);
  }

  window.addEventListener('vrdisplaypresentchange', function (e) {
    // NOTES:
    // - Firefox doesn't include `display` and `reason` in the event.
    //   - Chromium builds do but no for `reason` of `navigation`.
    log('"' + e.type + '" event fired');
    activeVRDisplaysUpdate();
  });

  window.addEventListener('load', function (e) {
    log(e.type, e);
    initScenes();
  });

  window.addEventListener('beforeunload', function (e) {
    log(e.type, e);
    sessionStorage.vrNavigation = !!(navigator.activeVRDisplays && navigator.activeVRDisplays.length);
  });

  window.addEventListener('vrdisplayactivate', function (e) {
    log(e.type, e);
  });

  window.addEventListener('vrdisplaydeactivate', function (e) {
    log(e.type, e);
  });
})();
