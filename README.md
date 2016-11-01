# aframe-link-demo

Link traversal in VR using [A-Frame](https://aframe.io/)!

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
