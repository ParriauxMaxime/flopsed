import { techNodes, upgrades } from "@flopsed/domain";
import type { FsNode } from "./types";
import { listChildren } from "./virtual-fs";

const COMMANDS = [
	"ls",
	"cd",
	"cat",
	"pwd",
	"tree",
	"buy",
	"research",
	"status",
	"help",
	"clear",
	"history",
	"grep",
	"find",
];

/** Path-completing commands */
const PATH_COMMANDS = new Set(["ls", "cd", "cat", "tree", "grep"]);

export function autocomplete(
	input: string,
	cwd: string,
	root: FsNode,
): string[] {
	const parts = input.split(/\s+/);

	// Completing the command name itself
	if (parts.length <= 1) {
		const partial = parts[0] ?? "";
		return COMMANDS.filter((c) => c.startsWith(partial));
	}

	const cmd = parts[0];
	const partial = parts[parts.length - 1] ?? "";

	// buy → autocomplete upgrade IDs
	if (cmd === "buy") {
		return upgrades.map((u) => u.id).filter((id) => id.startsWith(partial));
	}

	// research → autocomplete tech node IDs
	if (cmd === "research") {
		return techNodes.map((n) => n.id).filter((id) => id.startsWith(partial));
	}

	// help → autocomplete command names
	if (cmd === "help") {
		return COMMANDS.filter((c) => c.startsWith(partial));
	}

	// Path-based commands → autocomplete filesystem paths
	if (PATH_COMMANDS.has(cmd)) {
		return listChildren(root, cwd, partial);
	}

	return [];
}
