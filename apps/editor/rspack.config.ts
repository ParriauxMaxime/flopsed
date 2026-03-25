import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "@rspack/cli";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

import { HtmlRspackPlugin, type RspackPluginFunction } from "@rspack/core";
import RefreshPlugin from "@rspack/plugin-react-refresh";

const isDev = process.env.NODE_ENV !== "production";

export default defineConfig({
	experiments: {
		css: true,
	},
	entry: "./src/main.tsx",
	output: {
		path: path.resolve(__dirname, "dist"),
		publicPath: "/",
		clean: true,
	},
	resolve: {
		extensions: [".ts", ".tsx", ".js", ".json"],
	},
	module: {
		rules: [
			{
				test: /\.tsx?$/,
				use: {
					loader: "builtin:swc-loader",
					options: {
						jsc: {
							parser: { syntax: "typescript", tsx: true },
							transform: {
								react: {
									runtime: "automatic",
									importSource: "@emotion/react",
									development: isDev,
									refresh: isDev,
								},
							},
						},
					},
				},
				type: "javascript/auto",
			},
			{
				test: /\.css$/,
				type: "css/auto",
			},
		],
	},
	plugins: [
		new HtmlRspackPlugin({
			template: "./index.html",
		}) as unknown as RspackPluginFunction,
		...(isDev ? [new RefreshPlugin()] : []),
	],
	devServer: {
		port: 3738,
		hot: true,
		historyApiFallback: true,
		proxy: [
			{
				context: ["/api"],
				target: "http://localhost:3737",
			},
		],
	},
});
