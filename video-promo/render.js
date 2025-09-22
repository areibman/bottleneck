const { bundle } = require('@remotion/bundler');
const { renderMedia, selectComposition } = require('@remotion/renderer');
const path = require('path');

const start = async () => {
	const bundleLocation = await bundle({
		entryPoint: path.resolve('./src/index.ts'),
		webpackOverride: (config) => config,
	});

	const compositions = await selectComposition({
		serveUrl: bundleLocation,
		id: 'BottleneckPromo',
		inputProps: {},
	});

	await renderMedia({
		composition,
		serveUrl: bundleLocation,
		codec: 'h264',
		outputLocation: path.resolve('./out/bottleneck-promo.mp4'),
		inputProps: {},
	});

	console.log('Video rendered successfully!');
};

start().catch((err) => {
	console.error(err);
	process.exit(1);
});