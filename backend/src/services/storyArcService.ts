export type StoryArcNode = {
  id: string;
  label: string;
  text: string;
};

export type StoryArcScaffold = {
  theme: string;
  protagonistPOV: string;
  incitingMoment: string;
  risingTension: string;
  turningPoint: string;
  chorusThesis: string;
  bridgeTwist: string;
  resolution: string;
  motifs: string[];
  punchyLines: string[];
  nodes: StoryArcNode[];
  model: string;
  rawText?: string;
};

export type StoryArcGenerateRequest = {
  summary: string;
  theme?: string;
  genre?: string;
  bpm?: number;
  nodeCount?: number;
  seed?: string | number;
};

const DEFAULT_NODE_LABELS = [
  'Start',
  'Inciting incident',
  'Obstacle',
  'Midpoint turn',
  'Second obstacle',
  'Climax',
  'Resolution'
];

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const num = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(num)));
}

function pickNodeLabels(nodeCount: number): string[] {
  if (nodeCount <= 3) return ['Start', 'Turning point', 'Resolution'];
  if (nodeCount === 4) return ['Start', 'Inciting incident', 'Turning point', 'Resolution'];
  if (nodeCount === 5) return ['Start', 'Inciting incident', 'Midpoint turn', 'Climax', 'Resolution'];
  if (nodeCount === 6) return ['Start', 'Inciting incident', 'Obstacle', 'Midpoint turn', 'Climax', 'Resolution'];
  return DEFAULT_NODE_LABELS.slice(0, nodeCount);
}

function safeLineSplit(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseBulletList(lines: string[], prefix: string): string[] {
  const startIndex = lines.findIndex((l) => l.toLowerCase().startsWith(prefix.toLowerCase()));
  if (startIndex === -1) return [];
  const out: string[] = [];
  for (let i = startIndex + 1; i < lines.length; i += 1) {
    const l = lines[i];
    if (/^[A-Z][A-Z\s+/_-]*:/.test(l)) break;
    const cleaned = l.replace(/^[-*\d.)\s]+/, '').trim();
    if (cleaned) out.push(cleaned);
  }
  return out;
}

function parseField(lines: string[], label: string): string {
  // Look for a line starting with label: (case-insensitive)
  const found = lines.find((l) => l.toLowerCase().startsWith(label.toLowerCase() + ':'));
  if (found) {
    return found.split(':').slice(1).join(':').trim();
  }

  // Fallback: look for label without colon (for simplified prompts)
  const altFound = lines.find((l) => l.toLowerCase().startsWith(label.toLowerCase()));
  if (altFound) {
    // Return everything after the label
    return altFound.substring(label.length).trim();
  }

  return '';
}

function parseNodes(lines: string[], nodeLabels: string[]): StoryArcNode[] {
  // Since the prompt is simpler now, just look for numbered sentences
  const nodes: StoryArcNode[] = [];
  
  for (let i = 0; i < lines.length && nodes.length < nodeLabels.length; i += 1) {
    const line = lines[i].trim();
    if (!line) continue;

    // Match pattern: "1. text" or "1) text"
    const numbered = line.match(/^\d+[\s.)\-]+(.+)/);
    if (numbered && numbered[1]) {
      const text = numbered[1].trim();
      if (text.length > 10) {  // Must be substantial text, not just a label
        const label = nodeLabels[nodes.length];
        if (label) {
          nodes.push({ id: `arc-${nodes.length + 1}`, label, text });
        }
      }
    }
  }

  // Fill remaining with empty nodes
  while (nodes.length < nodeLabels.length) {
    nodes.push({ id: `arc-${nodes.length + 1}`, label: nodeLabels[nodes.length], text: '' });
  }

  return nodes.slice(0, nodeLabels.length);
}

function buildPrompt(input: StoryArcGenerateRequest, nodeLabels: string[]): string {
  // Flan-t5-small is weak; use direct instruction format that works better
  // Focus on asking it to extend/develop ideas rather than generate from scratch
  const summary = input.summary;
  const beats = nodeLabels.join(', ');
  
  return `Summarize this story in ${nodeLabels.length} narrative beats: ${beats}

Story: ${summary}

Write one sentence for each beat that captures that moment in the story. Be specific and vivid.`;
}

// Lightweight helpers to diversify fallback beats without external dependencies.
function hashStringToInt(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) {
    h = ((h << 5) - h) + str.charCodeAt(i);
    h |= 0; // force 32-bit
  }
  return Math.abs(h);
}

function pickTemplate(templates: string[], seedStr: string): string {
  if (templates.length === 0) return '';
  const seed = hashStringToInt(seedStr);
  return templates[seed % templates.length];
}

function extractKeywords(text: string, max = 3): string[] {
  const stop = new Set([
    'the', 'and', 'but', 'for', 'with', 'into', 'from', 'that', 'this', 'then', 'they', 'them', 'have', 'has', 'had',
    'over', 'under', 'into', 'onto', 'about', 'after', 'before', 'because', 'while', 'when', 'where', 'what', 'who',
    'are', 'is', 'was', 'were', 'be', 'been', 'being', 'of', 'in', 'on', 'to', 'it', 'as', 'at', 'by', 'an', 'a'
  ]);
  const tokens = String(text || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .filter((t) => !stop.has(t) && t.length > 3);
  const uniq: string[] = [];
  for (const t of tokens) {
    if (!uniq.includes(t)) uniq.push(t);
  }
  return uniq.slice(0, max);
}

function synthesizeBeat(label: string, input: StoryArcGenerateRequest): string {
  const base = String(input.summary || '').slice(0, 140);
  const style = input.genre ? `${input.genre} vibe` : input.theme ? String(input.theme).toLowerCase() : '';
  const tempo = typeof input.bpm === 'number' && Number.isFinite(input.bpm) ? `${input.bpm} BPM` : '';
  const styleSuffix = [style, tempo].filter(Boolean).length ? ` (${[style, tempo].filter(Boolean).join(' · ')})` : '';
  const kws = extractKeywords(base, 2);
  const kwPhrase = kws.length ? kws.join(' / ') : 'the plan';

  const lower = label.toLowerCase();
  const seedPrefix = input.seed ? `${input.seed}|` : '';
  const seedStr = `${seedPrefix}${label}|${base}|${style}|${tempo}`;

  switch (lower) {
    case 'start': {
      const templates = [
        'Open on {kw}: {base}. First steps echo{style}.',
        'Set the scene around {kw}: {base}. New stakes breathe{style}.',
        'Day zero: {base}. We arrive restless and unproven{style}.',
        'Camera finds {kw}; {base}. Momentum wakes up{style}.',
        'Streetlights blink over {kw}; {base}. We draw the first map{style}.',
        'Curtain up: {kw} threads through {base}. The room inhales{style}.',
        'Intro bars: {base}. {kw} sketches the route in chalk{style}.'
      ];
      const tpl = pickTemplate(templates, seedStr);
      return tpl.replace('{kw}', kwPhrase).replace('{base}', base).replace('{style}', styleSuffix);
    }
    case 'inciting incident': {
      const templates = [
        'Catalyst: {kw} crosses the line — {base}. Move now{style}.',
        'Trigger hits: routine snaps; {kw} lights up — {base}{style}.',
        'A door opens; {kw} spills forward — {base}. Urgency spikes{style}.',
        'Green light from nowhere: {base}. {kw} becomes the reason{style}.',
        'Message on the wire: {kw} fractures the lull — {base}{style}.',
        'Coin toss lands on {kw}; {base}. Momentum makes the call{style}.',
        'A spark catches {kw}; {base}. The beat refuses to wait{style}.'
      ];
      const tpl = pickTemplate(templates, seedStr);
      return tpl.replace('{kw}', kwPhrase).replace('{base}', base).replace('{style}', styleSuffix);
    }
    case 'obstacle': {
      const templates = [
        'Complication: old obligations push back; time thins. {kw} refuses to bend.',
        'Pushback: doors close, budgets shrink. The price of {kw} climbs.',
        'Friction: favors dry up; calendars jam. {kw} slows the run.',
        'Static in the path: {kw} stutters while costs stack.',
        'Crosswind: {kw} slides off schedule while doubts pile up.',
        'Gatekeepers shuffle papers; {kw} waits and the meter runs.',
        'Thin margins bite; {kw} learns to move with less.'
      ];
      const tpl = pickTemplate(templates, seedStr);
      return tpl.replace('{kw}', kwPhrase);
    }
    case 'midpoint turn': {
      const templates = [
        'Reversal: a small win exposes a bigger risk in {kw}. The map changes.',
        'Halfway reveal: {kw} was never the destination. Course bends.',
        'A loud yes uncovers a quieter price: {kw}. Direction flips.',
        'Midpoint: the reward reframes the mission; {kw} redraws the line.',
        'Center of the track: {kw} turns the compass. Plans shed weight.',
        'The chorus hints a cost: {kw}. Verse learns a new truth.',
        'A shortcut opens and closes — {kw}. We rewrite the route.'
      ];
      const tpl = pickTemplate(templates, seedStr);
      return tpl.replace('{kw}', kwPhrase);
    }
    case 'second obstacle': {
      const templates = [
        'Aftershock: allies fade; help falls through. {kw} tests resolve{style}.',
        'Escalation: delays multiply; {kw} drags confidence through the rain{style}.',
        'Pressure spike: promises slip; {kw} makes the city heavier{style}.',
        'Doubt creeps: the timeline buckles and {kw} squeezes the margin{style}.',
        'Cold calls go warm then cold; {kw} keeps the dial tone honest{style}.',
        'Frayed edges: {kw} rubs against deadlines until sparks slow down{style}.',
        'Second hit: {kw} tests patience under flickering lights{style}.'
      ];
      const tpl = pickTemplate(templates, seedStr);
      return tpl.replace('{kw}', kwPhrase).replace('{style}', styleSuffix);
    }
    case 'climax': {
      const templates = [
        'Decision: choose {kw} at full volume — commit or walk. No backspace after this drop.',
        'Final push: we vote with breath and bruises. {kw} or nothing.',
        'Crossroads on beat: jump into {kw} or turn the lights out.',
        'No turning back: stake the name on {kw} and hit send.',
        'Hands up/eyes open: {kw} becomes the oath. We sign in rhythm.',
        'Last measure: {kw} or silence. We cut the dithering.',
        'Release the brake: {kw} carries the name across the measure.'
      ];
      const tpl = pickTemplate(templates, seedStr);
      return tpl.replace('{kw}', kwPhrase);
    }
    case 'resolution': {
      const templates = [
        'Fallout: quieter {kw}, new rules. A changed voice carries to the next chorus.',
        'After the drop: {kw} settles into ritual. The echo learns our name.',
        'Final image: {kw} under softer lights. We keep moving different.',
        'Landing: {kw} hums in low color. The promise becomes practice.',
        'Soft fade: {kw} rides the tail of the reverb. We speak simpler.',
        'Window open: {kw} drifts into the next verse as a habit.',
        'Quiet handshake: {kw} accepts the cost. The city nods.'
      ];
      const tpl = pickTemplate(templates, seedStr);
      return tpl.replace('{kw}', kwPhrase);
    }
    default: {
      return `${label}: ${base}${styleSuffix}`;
    }
  }
}

function buildFallbackScaffold(input: StoryArcGenerateRequest, nodeLabels: string[]): StoryArcScaffold {
  const theme = input.theme || input.genre || 'Momentum and transformation';
  const protagonistPOV = 'First-person (confessional)';
  const incitingMoment = `A spark hits: ${input.summary.slice(0, 120)}`;
  const risingTension = 'Small wins turn into pressure; the world reacts.';
  const turningPoint = 'A choice: double down or disappear.';
  const chorusThesis = 'The hook states the promise + the cost.';
  const bridgeTwist = 'Reveal the private truth behind the bravado.';
  const resolution = 'Leave a final image that feels inevitable.';
  const motifs = ['neon', 'static', 'late-night transit', 'battery / charge', 'mirrors'];
  const punchTemplates = [
    'I bite the night and spit it back as {theme}.',
    '{theme} drips from payphones; I dial the future collect.',
    'I ghost the chorus until the bridge confesses.',
    'Neon in my lungs, I cough up chorus hooks.',
    'Static on the line, but the message still lands.',
    'Late trains hum in {theme}, I ride the reverb home.',
    'Battery in my chest, charge leaking into verse.',
    'Mirrors talk back; they like the hook better than me.',
    'Tension in the pocket, I spend it on the downbeat.',
    'I bend the timeline until the drop says mercy.'
  ];
  const punchyLines = punchTemplates.map((tpl, i) => `${i + 1}. ${tpl.replace('{theme}', theme)}`);
  
  // For fallback nodes, generate using synthesizeBeat for each label
  // This gives diverse, input-responsive content that isn't just hardcoded
  const nodes = nodeLabels.map((label, index) => {
    const text = synthesizeBeat(label, input);
    return { 
      id: `arc-${index + 1}`, 
      label, 
      text
    };
  });

  return {
    theme,
    protagonistPOV,
    incitingMoment,
    risingTension,
    turningPoint,
    chorusThesis,
    bridgeTwist,
    resolution,
    motifs,
    punchyLines,
    nodes,
    model: 'fallback'
  };
}

function ensureProgression(scaffold: StoryArcScaffold, summary: string, nodeLabels: string[]): StoryArcScaffold {
  const summarySnippet = summary.slice(0, 140);

  // Only enforce distinct node beats if nodes already have content from AI.
  // If nodes are empty (fallback mode), leave them as-is to signal AI generation needed.
  const hasAnyNodeContent = scaffold.nodes.some((n) => n.text && n.text.trim());
  
  const diversifiedNodes = hasAnyNodeContent 
    ? scaffold.nodes.map((node, idx) => {
        const label = nodeLabels[idx] ?? node.label;
        let text = (node.text || '').trim();
        const normalized = text.toLowerCase();
        // Only keep distinct AI-generated text; don't fill empty with templates
        if (!text || normalized === summarySnippet.toLowerCase()) {
          text = '';
        }
        return { ...node, label, text };
      })
    : scaffold.nodes; // If fallback/empty, return as-is

  // Make punchy lines less repetitive if they collapsed to one value
  const uniquePunchies = Array.from(new Set((scaffold.punchyLines || []).map((l) => l.trim()).filter(Boolean)));
  let punchyLines = scaffold.punchyLines;
  if (uniquePunchies.length <= 1) {
    const base = scaffold.theme || 'the hook';
    const templates = [
      '{base} in my teeth, I spit it back as light.',
      'Phone screens glow while {base} hums in the bridge.',
      'I pawn my doubts to buy a louder chorus.',
      'Static kisses tape hiss; we keep the take.',
      'Backbeat stumbles, but the hook stands up.',
      'Late train lullaby, wheels rhyme with heart.',
      'Mirrors sync lips to the ad-libs.',
      'Reverb drags secrets into daylight.',
      'Breath control breaks, truth leaks.',
      'Countdown to drop: I cash in the tension.'
    ];
    punchyLines = templates.map((tpl, i) => `${i + 1}. ${tpl.replace('{base}', base)}`);
  }

  return { ...scaffold, nodes: diversifiedNodes, punchyLines };
}

let text2textPromise: Promise<any> | null = null;

async function getText2TextPipeline() {
  if (!text2textPromise) {
    text2textPromise = import('@xenova/transformers').then(async (mod: any) => {
      const pipeline = mod.pipeline as (task: string, model: string) => Promise<any>;
      // Small + fast instruction-ish model.
      return pipeline('text2text-generation', 'Xenova/flan-t5-small');
    });
  }
  return text2textPromise;
}

export async function generateStoryArcScaffold(input: StoryArcGenerateRequest): Promise<StoryArcScaffold> {
  const nodeCount = clampInt(input.nodeCount, 3, 7, 7);
  const nodeLabels = pickNodeLabels(nodeCount);

  const summary = String(input.summary ?? '').trim();
  if (!summary) {
    return buildFallbackScaffold({ ...input, summary: 'A blank canvas becomes a scene.' }, nodeLabels);
  }

  if (process.env.NODE_ENV === 'test' || process.env.DISABLE_TRANSFORMERS === 'true') {
    return ensureProgression(buildFallbackScaffold({ ...input, summary }, nodeLabels), summary, nodeLabels);
  }

  const prompt = buildPrompt({ ...input, summary }, nodeLabels);

  try {
    const generator = await getText2TextPipeline();
    const result = await generator(prompt, {
      max_new_tokens: 520,
      temperature: 0.7,
      repetition_penalty: 1.1
    });

    const rawText = Array.isArray(result) ? String(result[0]?.generated_text ?? '') : String(result?.generated_text ?? '');
    const lines = safeLineSplit(rawText);

    // Parse nodes from simplified output
    const nodes = parseNodes(lines, nodeLabels);

    // Build scaffold with parsed nodes (no old fields like THEME, PROTAGONIST, etc.)
    // Use fallback values if AI didn't generate full scaffold
    const scaffold: StoryArcScaffold = {
      theme: input.theme || input.genre || '',
      protagonistPOV: 'First-person',
      incitingMoment: '',
      risingTension: '',
      turningPoint: '',
      chorusThesis: '',
      bridgeTwist: '',
      resolution: '',
      motifs: [],
      punchyLines: [],
      nodes,
      model: 'Xenova/flan-t5-small',
      rawText
    };

    // If nodes were successfully parsed with content, ensure progression and return
    const hasNodeContent = nodes.some((n) => n.text && n.text.trim());
    if (hasNodeContent) {
      return ensureProgression(scaffold, summary, nodeLabels);
    }

    // If nodes are empty, fall back to generating default scaffold with synthesized beats
    return ensureProgression(buildFallbackScaffold({ ...input, summary }, nodeLabels), summary, nodeLabels);
  } catch (err) {
    // Offline / model download failure: return fallback with synthesized beats
    return ensureProgression(buildFallbackScaffold({ ...input, summary }, nodeLabels), summary, nodeLabels);
  }
}
