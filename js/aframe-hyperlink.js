/* globals AFRAME, sessionStorage */
(function () {
  var debug = true;
  var log = debug ? console.log.bind(console) : function () {};
  var html = document.documentElement;

  var getElSelector = function (el) {
    sel = el.tagName.toLowerCase();
    if (el.id) {
      sel = '#' + el.id;
    }
    var classes = (el.className || '').replace(/\n/g, '').replace(/\s+/g, ' ').split(' ');
    if (classes.length) {
      sel += classes.join('.');
    }
    return sel;
  };

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

  if (!navigator.getVRDisplays) {
    return;
  }

  var isDone = false;
  var vrDisplay;
  var isPresenting = false;

  var hasInit = false;
  var scene;

  var whenSceneReady = (scene, callback) => {
    if (scene.hasLoaded) {
      callback();
    } else {
      scene.addEventListener('loaded', callback);
    }
  };

  var initScene = () => {
    log('initScene: called', hasInit);

    if (hasInit) {
      return;
    }

    scene = document.querySelector('a-scene');
    if (!scene) {
      return;
    }

    hasInit = true;

    log('initScene: checking', hasInit);

    whenSceneReady(scene, () => {
      log('initScene: checking', hasInit);
      navigator.getVRDisplays().then(displays => {
        if (!displays.length) { return; }
        log('getVRDisplays', displays);
        vrDisplay = displays[0];

        html.dataset.vrMode = 'mono';
        html.dataset.vrReady = 'false';

        scene = document.querySelector('a-scene');
        scene.dataset.vrReady = 'true';
        if (scene.canvas) {
          scene.canvas.dataset.vrReady = 'true';
        }

        window.addEventListener('vrdisplaypresentchange', e => {
          console.log('"' + e.type + '" event fired');
          if (!vrDisplay) {
            isPresenting = false;
          } else {
            isPresenting = vrDisplay.isPresenting;
          }
          rememberVRPresenting();
        });

        scene.addEventListener('enter-vr', function () {
          console.log('<a-scene> "enter-vr" event fired');
        });
        scene.addEventListener('exit-vr', function () {
          console.log('<a-scene> "exit-vr" event fired');
        });
        autoEnterVR();
      });
    });
  };

  var autoEnterVR = () => {
    log('autoEnterVR', sessionStorage.vrNavigating);
    if (sessionStorage.vrNavigating !== 'true') {
      return;
    }

    log('autoEnterVR');

    whenSceneReady(scene, enterVR);
  };

  var enterVR = () => {
    return scene.enterVR();
  };

  var navDuringVR = isLeaving => {
    console.log('navDuringVR', vrDisplay, vrDisplay.isPresenting);
    isDone = true;
    rememberVRPresenting(vrDisplay && vrDisplay.isPresenting);
    return scene.exitVR();
  };

  var rememberVRPresenting = (isVRNavigating) => {
    console.error('rememberVRPresenting called; isVRNavigating=', isVRNavigating, '; isDone=', isDone);
    if (isDone) {
      return;
    }
    isPresenting = !!isPresenting;
    isVRNavigating = !!isVRNavigating;
    console.log('isVRNavigating', isVRNavigating);
    html.dataset.vrMode = isPresenting ? 'stereo' : 'mono';
    html.dataset.vrPresenting = isPresenting;
    console.error('sessionStorage.vrNavigating = ', isVRNavigating);
    html.dataset.vrNavigating = sessionStorage.vrNavigating = isVRNavigating;
    if (isPresenting) {
      html.dataset.vrPresentingCanvas = sessionStorage.vrPresentingCanvas = getElSelector(scene.canvas);
    } else {
      html.removeAttribute('data-vr-presenting-canvas');
      delete sessionStorage.vrPresentingCanvas;
    }
    var scenes = document.querySelectorAll('a-scene');
    for (var i = 0; i < scenes.length; i++) {
      scene.dataset.vrReady = isVRNavigating ? 'false' : 'true';
      if (scene.canvas) {
        scene.canvas.dataset.vrReady = isVRNavigating ? 'false' : 'true';
      }
    }
  };

  registerComponent();
  initScene();
  window.addEventListener('load', e => {
    console.log(e.type, e);
    initScene();
  });
  window.addEventListener('beforeunload', e => {
    console.log(e.type, e);
    navDuringVR(true);
  });
  window.navDuringVR=navDuringVR;
  window.addEventListener('vrdisplayactivate', e => {
    console.log(e.type, e);
    initScene();
  });
  window.addEventListener('vrdisplayactivated', e => {
    console.log(e.type, e);
  });
  window.addEventListener('vrdisplaydeactivate', e => {
    console.log(e.type, e);
    rememberVRPresenting();
  });
  window.addEventListener('vrdisplaydeactivated', e => {
    console.log(e.type, e);
    rememberVRPresenting();
  });
})();
