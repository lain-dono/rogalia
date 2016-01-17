module.exports = {
	entry: "./js/main.js",
	devtool: 'source-map',
	output: {
		path: __dirname,
		filename: "bundle.js"
	},
	module: {
		loaders: [
		]
	}
};
