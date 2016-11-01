/* globals AFRAME */
(function () {
  var debug = false;
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

  if (!navigator.getVRDisplays) {
    return;
  }

  var vrDisplay;

  var hasInit = false;
  var scene;
  var wasPresenting = false;

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

        scene.addEventListener('enter-vr', function () {
          log('<a-scene> enter-vr');
          sessionStorage.vrPresenting = true;
          scene.canvas.style.display = 'block';
        });
        scene.addEventListener('exit-vr', function () {
          log('<a-scene> exit-vr');
          sessionStorage.vrPresenting = wasPresenting;
          scene.canvas.style.display = 'none';
        });
        autoEnterVR();
      });
    });
  };

  var autoEnterVR = () => {
    log('autoEnterVR', sessionStorage.vrPresenting);
    if (sessionStorage.vrPresenting !== 'true') {
      return;
    }

    log('autoEnterVR');

    whenSceneReady(scene, enterVR);
  };

  var enterVR = () => {
    return scene.enterVR();
  };

  var navDuringVR = () => {
    wasPresenting = !!(vrDisplay && vrDisplay.isPresenting);
    if (wasPresenting) {
      sessionStorage.vrPresenting = wasPresenting;
    }
    return scene.exitVR();
  };

  registerComponent();
  initScene();
  window.addEventListener('load', initScene);
  window.addEventListener('beforeunload', navDuringVR);
})();
