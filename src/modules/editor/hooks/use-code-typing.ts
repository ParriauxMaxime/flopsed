import { useGameStore } from "@modules/game";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CodeToken } from "../data/code-tokens";
import { CODE_BLOCKS, tokenizeBlock } from "../data/code-tokens";

const EDITOR_STORAGE_KEY = "agi-rush-editor";

interface EditorSaveState {
	blockIndex: number;
	tokenPos: number;
}

function loadEditorState(): EditorSaveState {
	try {
		const raw = localStorage.getItem(EDITOR_STORAGE_KEY);
		if (raw) return JSON.parse(raw) as EditorSaveState;
	} catch {}
	return { blockIndex: 0, tokenPos: 0 };
}

function saveEditorState(state: EditorSaveState) {
	localStorage.setItem(EDITOR_STORAGE_KEY, JSON.stringify(state));
}

export interface TypingState {
	lines: string[];
	currentLine: string;
}

export function useCodeTyping() {
	const addLoc = useGameStore((s) => s.addLoc);
	const enqueueBlock = useGameStore((s) => s.enqueueBlock);

	const saved = useRef(loadEditorState());
	const blockIndexRef = useRef(saved.current.blockIndex);
	const currentBlockDef = useRef(
		CODE_BLOCKS[saved.current.blockIndex % CODE_BLOCKS.length],
	);
	const tokenQueueRef = useRef<CodeToken[]>(
		tokenizeBlock(currentBlockDef.current),
	);
	const tokenPosRef = useRef(saved.current.tokenPos);

	// Reconstruct partial typing state from saved position
	const initialTyping = useRef(() => {
		const tokens = tokenQueueRef.current;
		const lines: string[] = [];
		let currentLine = "";
		for (let i = 0; i < saved.current.tokenPos && i < tokens.length; i++) {
			const t = tokens[i];
			if (t.newline) {
				lines.push(currentLine);
				currentLine = "";
			} else {
				currentLine += t.html;
			}
		}
		return { lines, currentLine };
	});

	const [typing, setTyping] = useState<TypingState>(initialTyping.current);
	const typingLinesRef = useRef<string[]>(typing.lines);
	const typingCurrentRef = useRef(typing.currentLine);

	// ── Batched LoC accumulator ──
	// Instead of calling addLoc() per token, accumulate and flush every 150ms
	const pendingLocRef = useRef(0);
	useEffect(() => {
		const interval = setInterval(() => {
			if (pendingLocRef.current > 0) {
				addLoc(pendingLocRef.current);
				pendingLocRef.current = 0;
			}
		}, 150);
		return () => clearInterval(interval);
	}, [addLoc]);

	// ── Batched rendering ──
	// Multiple advanceToken() calls per frame get collapsed into one setState
	const dirtyRef = useRef(false);
	const rafRef = useRef(0);

	const flushTypingState = useCallback(() => {
		rafRef.current = 0;
		dirtyRef.current = false;
		// Spread to create a new array reference so React/useMemo detect the change
		// (typingLinesRef is mutated via .push() for perf — one copy per frame is fine)
		setTyping({
			lines: [...typingLinesRef.current],
			currentLine: typingCurrentRef.current,
		});
	}, []);

	const scheduleFlush = useCallback(() => {
		if (!dirtyRef.current) {
			dirtyRef.current = true;
			rafRef.current = requestAnimationFrame(flushTypingState);
		}
	}, [flushTypingState]);

	// Cleanup rAF on unmount
	useEffect(() => {
		return () => {
			if (rafRef.current) cancelAnimationFrame(rafRef.current);
		};
	}, []);

	const advanceTokens = useCallback(
		(count: number) => {
			for (let n = 0; n < count; n++) {
				const tokens = tokenQueueRef.current;
				const pos = tokenPosRef.current;

				if (pos >= tokens.length) {
					// Block complete — enqueue for execution
					const finalLines = [...typingLinesRef.current];
					if (typingCurrentRef.current) {
						finalLines.push(typingCurrentRef.current);
					}

					enqueueBlock({
						lines: finalLines,
						loc: currentBlockDef.current.loc,
					});

					blockIndexRef.current++;
					const nextBlock =
						CODE_BLOCKS[blockIndexRef.current % CODE_BLOCKS.length];
					currentBlockDef.current = nextBlock;
					tokenQueueRef.current = tokenizeBlock(nextBlock);
					tokenPosRef.current = 0;
					saveEditorState({
						blockIndex: blockIndexRef.current,
						tokenPos: 0,
					});
					typingLinesRef.current = [];
					typingCurrentRef.current = "";

					// Block completion flushes immediately (triggers queue update)
					if (rafRef.current) {
						cancelAnimationFrame(rafRef.current);
						rafRef.current = 0;
					}
					dirtyRef.current = false;
					setTyping({ lines: [], currentLine: "" });
					continue;
				}

				// Accumulate LoC instead of calling addLoc directly
				const locPerToken = currentBlockDef.current.loc / tokens.length;
				pendingLocRef.current += locPerToken;

				const token = tokens[pos];
				tokenPosRef.current = pos + 1;

				if (token.newline) {
					typingLinesRef.current.push(typingCurrentRef.current);
					typingCurrentRef.current = "";
				} else {
					typingCurrentRef.current += token.html;
				}
			}

			// Single batched flush after all tokens processed
			scheduleFlush();
		},
		[enqueueBlock, scheduleFlush],
	);

	const advanceToken = useCallback(() => {
		advanceTokens(1);
	}, [advanceTokens]);

	// Periodic save
	useEffect(() => {
		const interval = setInterval(() => {
			saveEditorState({
				blockIndex: blockIndexRef.current,
				tokenPos: tokenPosRef.current,
			});
		}, 5000);
		return () => clearInterval(interval);
	}, []);

	return { typing, advanceToken, advanceTokens };
}
