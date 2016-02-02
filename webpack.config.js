var path = require('path')
var ExtractTextPlugin = require('extract-text-webpack-plugin')

var extractCSS = new ExtractTextPlugin('[name].css')

module.exports = [{
	name: 'js',
	entry: './js/main.js',
	//devtool: 'source-map',
	output: {
		path: __dirname,
		filename: 'bundle.js',
		chunkFilename: '[id].bundle.js',
	},
	module: {
		preLoaders: [
			{
				test: /\.js$/,
				exclude: /(node_modules|bower_components)/,
				loader: 'jshint-loader'
			},
		],
		loaders: [
			{ test: /\.json$/, loader: 'json', },
			//{ test: /\.js$/, loader: 'source-map-loader', },
			{
				test: /\.js$/,
				exclude: /(node_modules|bower_components)/,
				loader: 'babel',
				query: {
					presets: ['es2015']
				}
			}
		],
		postLoaders: [
			{
				include: path.resolve(__dirname, 'node_modules/pixi.js'),
				loader: 'transform?brfs'
			}
		],
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

		asi: true,

		// {int} Specify the ECMAScript version to which the code must adhere.
		esversion: 6,

		// jshint errors are displayed by default as warnings
		// set emitErrors to true to display them as errors
		emitErrors: false,

		// jshint to not interrupt the compilation
		// if you want any file with jshint errors to fail
		// set failOnHint to true
		failOnHint: false,

		// custom reporter function
		//reporter: function(errors) { }
	},
}, {
	name: 'css',
	entry: {
		styles: [
			'./js/main.styl',
		]
	},
	//devtool: 'source-map',
	output: {
		path: __dirname,
		filename: 'tmp.css.js',
	},
	module: {
		loaders: [
			{ test: /\.styl/, loader: extractCSS.extract(['css?sourceMap&-url', 'stylus?sourceMap']) },
		],
	},
	stylus: {
		use: [require('kouto-swiss')()],
	},
	plugins: [
		extractCSS,
	]
}]
