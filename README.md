# aframe-link-demo

![Demo (GIF loop) of WebVR link traversal](https://cloud.githubusercontent.com/assets/203725/19915454/9e7a1ac0-a06f-11e6-8d30-d42ac1f06098.gif "Demo (GIF loop) of WebVR link traversal")

Link traversal in WebVR using [A-Frame](https://aframe.io/)!

**[View demo!](https://321c4.github.io/aframe-link-demo/)**

[Read this Mozilla VR blog post for more details.](https://blog.mozvr.com/connecting-virtual-worlds-hyperlinks-in-webvr/)


## Local development

To start the local development server:

```sh
npm start
```

The hash in the `sw.js` file will get auto-updated in the file. You *should* check in these changes, so the Service Worker version gets bumped appropriately.

To dev on another machine from another network:

```sh
npm run tunnel
```

And copy the URL listed at the very top of your command-line output:

```sh
Tunnel: http://ctzuvxyamq.localtunnel.me
```

## License

This program is free software and is distributed under an [MIT License](LICENSE.md).
