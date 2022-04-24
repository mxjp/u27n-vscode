"use strict";

const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const { join } = require("path");

/** @returns {import("webpack").Configuration} */
module.exports = (env = {}) => {
	const context = __dirname;
	const prod = env.prod ?? false;

	return {
		context,
		mode: prod ? "production" : "development",
		entry: "./src/editor/view",
		devtool: prod ? "source-map" : "inline-source-map",
		resolve: {
			extensions: [".ts", ".tsx", ".js", ".json"],
		},
		module: {
			rules: [
				{
					test: /\.tsx?/,
					loader: "ts-loader",
				},
				{
					test: /\.scss/,
					use: [
						MiniCssExtractPlugin.loader,
						{
							loader: "css-loader",
							options: {
								modules: true,
							},
						},
						{
							loader: "sass-loader",
							options: {
								implementation: require("sass"),
							},
						},
					],
				},
			],
		},
		plugins: [
			new MiniCssExtractPlugin({
				filename: "styles.css",
			}),
		],
		output: {
			path: join(__dirname, "out/editor/view"),
			filename: "index.js",
		},
	};
};
