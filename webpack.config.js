module.exports = {
	entry: "./js/main.js",
	devtool: 'source-map',
	output: {
		path: __dirname,
		filename: "bundle.js"
	},
	module: {
		loaders: [
		],
		preLoaders: [
			{
				test: /\.js$/, // include .js files
				exclude: /node_modules/, // exclude any and all files in the node_modules folder
				loader: "jshint-loader"
			}
		]
	},
	jshint: {
		// any jshint option http://www.jshint.com/docs/options/

		browser: true,
		node: true,
		devel: true,
		globals: {
			T: true,
			TT: true,
			TS: true,
			VK: true,
			FpsStats: true,
			RawDeflate: true,
			game: true,
			loader: true,
			sprintf: true,
			ImageFilter: true,
			BinarySearchTree: true,
		},

		//asi: true,

		// i. e.
		//camelcase: true,

		// jshint errors are displayed by default as warnings
		// set emitErrors to true to display them as errors
		emitErrors: false,

		// jshint to not interrupt the compilation
		// if you want any file with jshint errors to fail
		// set failOnHint to true
		failOnHint: false,

		// custom reporter function
		//reporter: function(errors) { }
	}
};
