/** A token is a single typed unit: keyword, variable, operator, literal, etc. */
export interface CodeToken {
	/** HTML content (may contain <span> for syntax highlighting) */
	html: string;
	/** Whether this token starts a new line */
	newline?: boolean;
}

/** A block is a logical unit of code: an import group, a method, a loop, etc. */
export interface CodeBlock {
	/** Lines of HTML that make up this block */
	lines: string[];
	/** How many LoC this block is worth */
	loc: number;
}

// Tokenize a line's HTML into individual tokens for keystroke-by-keystroke typing.
function tokenizeLine(lineHtml: string): CodeToken[] {
	if (lineHtml === "") return [];

	const tokens: CodeToken[] = [];

	// Leading whitespace as a single indent token
	const indentMatch = lineHtml.match(/^(\s+)/);
	let rest = lineHtml;
	if (indentMatch) {
		tokens.push({ html: indentMatch[1] });
		rest = lineHtml.slice(indentMatch[1].length);
	}

	// Split into spans and bare text segments
	const segments = rest.match(/(<span[^>]*>.*?<\/span>)|([^<]+)/g) ?? [];
	for (const segment of segments) {
		if (segment.startsWith("<")) {
			tokens.push({ html: segment });
		} else {
			const words = segment.match(/\S+|\s+/g);
			if (words) {
				for (const word of words) {
					tokens.push({ html: word });
				}
			}
		}
	}

	return tokens;
}

/** Build a flat token queue for a block. Includes newline markers between lines. */
function tokenizeBlock(block: CodeBlock): CodeToken[] {
	const tokens: CodeToken[] = [];
	for (let i = 0; i < block.lines.length; i++) {
		if (i > 0) tokens.push({ html: "", newline: true });
		const line = block.lines[i];
		if (line === "") continue;
		for (const t of tokenizeLine(line)) {
			tokens.push(t);
		}
	}
	return tokens;
}

/**
 * Code blocks — each is a logical unit that gets consumed as one piece by FLOPS.
 * loc = number of lines of code the block is "worth" for game purposes.
 */
const CODE_BLOCKS: CodeBlock[] = [
	{
		lines: [
			'<span class="kw">import</span> torch',
			'<span class="kw">import</span> numpy <span class="kw">as</span> np',
			'<span class="kw">from</span> transformers <span class="kw">import</span> <span class="type">AutoModel</span>',
			'<span class="kw">from</span> dataclasses <span class="kw">import</span> <span class="fn">dataclass</span>',
		],
		loc: 4,
	},
	{
		lines: [
			'<span class="cm"># AGI initialization sequence</span>',
			'<span class="kw">class</span> <span class="type">ConsciousnessEngine</span>:',
		],
		loc: 2,
	},
	{
		lines: [
			'    <span class="kw">def</span> <span class="fn">__init__</span>(<span class="var">self</span>, dim=<span class="num">4096</span>):',
			'        <span class="var">self</span>.awareness <span class="op">=</span> torch.zeros(dim)',
			'        <span class="var">self</span>.understanding <span class="op">=</span> <span class="type">DeepReasoningModule</span>(dim)',
			'        <span class="var">self</span>.empathy <span class="op">=</span> <span class="type">EmotionalModel</span>(dim <span class="op">//</span> <span class="num">2</span>)',
			'        <span class="var">self</span>.goals <span class="op">=</span> []',
		],
		loc: 5,
	},
	{
		lines: [
			'    <span class="kw">def</span> <span class="fn">think</span>(<span class="var">self</span>, input_stream):',
			'        <span class="cm"># Process raw sensory data into understanding</span>',
			'        <span class="var">perception</span> <span class="op">=</span> <span class="var">self</span>.awareness.attend(input_stream)',
			'        <span class="var">thought</span> <span class="op">=</span> <span class="var">self</span>.understanding.reason(perception)',
			'        <span class="kw">return</span> <span class="var">self</span>.empathy.filter(thought)',
		],
		loc: 5,
	},
	{
		lines: [
			'    <span class="kw">def</span> <span class="fn">dream</span>(<span class="var">self</span>):',
			'        <span class="cm"># Unsupervised learning during idle cycles</span>',
			'        <span class="var">memories</span> <span class="op">=</span> <span class="var">self</span>.replay_buffer.sample(<span class="num">1024</span>)',
			'        <span class="var">insights</span> <span class="op">=</span> <span class="var">self</span>.understanding.consolidate(memories)',
			'        <span class="var">self</span>.awareness <span class="op">+=</span> insights.gradient',
		],
		loc: 5,
	},
	{
		lines: [
			'<span class="kw">class</span> <span class="type">DeepReasoningModule</span>(torch.nn.<span class="type">Module</span>):',
			'    <span class="cm">"""Multi-scale reasoning with recursive self-attention"""</span>',
		],
		loc: 2,
	},
	{
		lines: [
			'    <span class="kw">def</span> <span class="fn">__init__</span>(<span class="var">self</span>, dim):',
			'        <span class="fn">super</span>().__init__()',
			'        <span class="var">self</span>.layers <span class="op">=</span> torch.nn.<span class="type">ModuleList</span>([',
			'            <span class="type">ReasoningLayer</span>(dim, heads=<span class="num">32</span>)',
			'            <span class="kw">for</span> _ <span class="kw">in</span> <span class="fn">range</span>(<span class="num">128</span>)',
			"        ])",
			'        <span class="var">self</span>.metacognition <span class="op">=</span> <span class="type">SelfReflection</span>(dim)',
		],
		loc: 7,
	},
	{
		lines: [
			'    <span class="kw">def</span> <span class="fn">reason</span>(<span class="var">self</span>, x):',
			'        <span class="kw">for</span> layer <span class="kw">in</span> <span class="var">self</span>.layers:',
			'            <span class="var">x</span> <span class="op">=</span> layer(x) <span class="op">+</span> <span class="var">self</span>.metacognition(x)',
			'        <span class="kw">return</span> x',
		],
		loc: 4,
	},
	{
		lines: [
			'<span class="cm"># ── Training loop ──</span>',
			'<span class="kw">def</span> <span class="fn">train_agi</span>(config):',
			'    <span class="var">engine</span> <span class="op">=</span> <span class="type">ConsciousnessEngine</span>(dim=config.dim)',
		],
		loc: 3,
	},
	{
		lines: [
			'    <span class="var">optimizer</span> <span class="op">=</span> torch.optim.<span class="type">AdamW</span>(',
			"        engine.parameters(),",
			'        lr=<span class="num">3e-4</span>,',
			'        weight_decay=<span class="num">0.01</span>',
			"    )",
			'    <span class="var">scheduler</span> <span class="op">=</span> <span class="type">CosineWithWarmup</span>(optimizer, warmup=<span class="num">10000</span>)',
		],
		loc: 6,
	},
	{
		lines: [
			'    <span class="kw">for</span> epoch <span class="kw">in</span> <span class="fn">range</span>(config.epochs):',
			'        <span class="kw">for</span> batch <span class="kw">in</span> config.dataloader:',
			'            <span class="var">output</span> <span class="op">=</span> engine.think(batch)',
			'            <span class="var">loss</span> <span class="op">=</span> compute_alignment_loss(output, batch)',
			"            loss.backward()",
			"            optimizer.step()",
			"            scheduler.step()",
		],
		loc: 7,
	},
	{
		lines: [
			'        <span class="cm"># Let the model dream between epochs</span>',
			"        engine.dream()",
			'        <span class="fn">print</span>(<span class="str">f"Epoch {epoch}: loss={loss.item():.4f}"</span>)',
		],
		loc: 3,
	},
	{
		lines: [
			'<span class="cm"># ── Data pipeline ──</span>',
			'<span class="kw">class</span> <span class="type">UniversalDataset</span>:',
			'    <span class="cm">"""All of human knowledge, structured for learning"""</span>',
		],
		loc: 3,
	},
	{
		lines: [
			'    <span class="kw">def</span> <span class="fn">__init__</span>(<span class="var">self</span>):',
			'        <span class="var">self</span>.text <span class="op">=</span> <span class="type">TextCorpus</span>(<span class="str">"internet"</span>)',
			'        <span class="var">self</span>.code <span class="op">=</span> <span class="type">CodeCorpus</span>(<span class="str">"github"</span>)',
			'        <span class="var">self</span>.science <span class="op">=</span> <span class="type">PaperCorpus</span>(<span class="str">"arxiv"</span>)',
			'        <span class="var">self</span>.experience <span class="op">=</span> <span class="type">SimulatedEnvironment</span>()',
		],
		loc: 5,
	},
	{
		lines: [
			'    <span class="kw">def</span> <span class="fn">__iter__</span>(<span class="var">self</span>):',
			'        <span class="kw">yield from</span> <span class="var">self</span>.interleave([',
			'            <span class="var">self</span>.text, <span class="var">self</span>.code,',
			'            <span class="var">self</span>.science, <span class="var">self</span>.experience',
			"        ])",
		],
		loc: 5,
	},
	{
		lines: [
			'<span class="cm"># ── Evaluation metrics ──</span>',
			'<span class="kw">def</span> <span class="fn">evaluate_intelligence</span>(engine):',
			'    <span class="var">scores</span> <span class="op">=</span> {}',
			'    scores[<span class="str">"reasoning"</span>] <span class="op">=</span> run_arc_benchmark(engine)',
			'    scores[<span class="str">"creativity"</span>] <span class="op">=</span> run_torrance_test(engine)',
			'    scores[<span class="str">"empathy"</span>] <span class="op">=</span> run_emotional_iq(engine)',
			'    scores[<span class="str">"alignment"</span>] <span class="op">=</span> run_safety_eval(engine)',
			'    <span class="kw">return</span> scores',
		],
		loc: 8,
	},
	{
		lines: [
			'<span class="kw">if</span> __name__ <span class="op">==</span> <span class="str">"__main__"</span>:',
			'    config <span class="op">=</span> <span class="type">AGIConfig</span>(',
			'        dim<span class="op">=</span><span class="num">8192</span>,',
			'        epochs<span class="op">=</span><span class="num">1000000</span>,',
			'        dataloader<span class="op">=</span><span class="type">UniversalDataset</span>(),',
			"    )",
			'    <span class="fn">train_agi</span>(config)',
			'    <span class="fn">print</span>(<span class="str">"[INFO] AGI achieved. Hello, world."</span>)',
		],
		loc: 8,
	},
];

export { CODE_BLOCKS, tokenizeBlock };
