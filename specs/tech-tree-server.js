#!/usr/bin/env node
/**
 * Tech Tree Editor — Local dev server
 *
 * Serves the editor HTML and provides a REST API to read/write tech-tree.json.
 *
 * Usage: node specs/tech-tree-server.js
 * Then open http://localhost:3737
 */

const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 3737;
const TREE_PATH = path.join(__dirname, "data", "tech-tree.json");
const EDITOR_PATH = path.join(__dirname, "tech-tree-editor.html");

const server = http.createServer((req, res) => {
	// CORS for local dev
	res.setHeader("Access-Control-Allow-Origin", "*");
	res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
	res.setHeader("Access-Control-Allow-Headers", "Content-Type");

	if (req.method === "OPTIONS") {
		res.writeHead(204);
		res.end();
		return;
	}

	// GET /dagre.min.js — serve dagre locally
	if (req.method === "GET" && req.url === "/dagre.min.js") {
		const js = fs.readFileSync(path.join(__dirname, "dagre.min.js"), "utf-8");
		res.writeHead(200, { "Content-Type": "application/javascript" });
		res.end(js);
		return;
	}

	// GET / — serve editor HTML
	if (req.method === "GET" && req.url === "/") {
		const html = fs.readFileSync(EDITOR_PATH, "utf-8");
		res.writeHead(200, { "Content-Type": "text/html" });
		res.end(html);
		return;
	}

	// GET /api/tree — read tech-tree.json
	if (req.method === "GET" && req.url === "/api/tree") {
		try {
			const data = fs.readFileSync(TREE_PATH, "utf-8");
			res.writeHead(200, { "Content-Type": "application/json" });
			res.end(data);
		} catch (err) {
			res.writeHead(500, { "Content-Type": "application/json" });
			res.end(JSON.stringify({ error: err.message }));
		}
		return;
	}

	// POST /api/tree — write tech-tree.json
	if (req.method === "POST" && req.url === "/api/tree") {
		let body = "";
		req.on("data", (chunk) => (body += chunk));
		req.on("end", () => {
			try {
				// Validate JSON
				const parsed = JSON.parse(body);
				if (!parsed.nodes || !Array.isArray(parsed.nodes)) {
					throw new Error("Missing nodes array");
				}
				// Save positions as x/y in the JSON (editor uses _x/_y internally)
				const withPositions = {
					...parsed,
					nodes: parsed.nodes.map((n) => {
						const { _x, _y, ...rest } = n;
						if (_x != null && _y != null) {
							rest.x = _x;
							rest.y = _y;
						}
						return rest;
					}),
				};
				fs.writeFileSync(TREE_PATH, JSON.stringify(withPositions, null, 2) + "\n");
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ ok: true, count: withPositions.nodes.length }));
				console.log(`Saved ${withPositions.nodes.length} nodes to tech-tree.json`);
			} catch (err) {
				res.writeHead(400, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ error: err.message }));
			}
		});
		return;
	}

	res.writeHead(404);
	res.end("Not found");
});

server.listen(PORT, () => {
	console.log(`Tech Tree Editor running at http://localhost:${PORT}`);
	console.log(`Reading/writing: ${TREE_PATH}`);
});
