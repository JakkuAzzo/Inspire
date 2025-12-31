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
  const found = lines.find((l) => l.toLowerCase().startsWith(label.toLowerCase() + ':'));
  if (!found) return '';
  return found.split(':').slice(1).join(':').trim();
}

function parseNodes(lines: string[], nodeLabels: string[]): StoryArcNode[] {
  // Look for explicit "ARC NODES:" section, else try to infer from numbered lines.
  const idx = lines.findIndex((l) => l.toLowerCase().startsWith('arc nodes'));
  const candidates = idx === -1 ? lines : lines.slice(idx + 1);

  const numbered = candidates
    .map((l) => l.replace(/^[-*\s]+/, '').trim())
    .filter((l) => /^\d+\s*[.)]/.test(l) || nodeLabels.some((label) => l.toLowerCase().startsWith(label.toLowerCase())));

  const nodes: StoryArcNode[] = [];
  for (let i = 0; i < numbered.length && nodes.length < nodeLabels.length; i += 1) {
    const raw = numbered[i];
    const cleaned = raw.replace(/^\d+\s*[.)]\s*/, '').trim();
    const parts = cleaned.split(/\s*-\s*/);
    if (parts.length >= 2) {
      const label = parts[0].trim();
      const text = parts.slice(1).join(' - ').trim();
      nodes.push({ id: `arc-${nodes.length + 1}`, label, text });
    } else {
      nodes.push({ id: `arc-${nodes.length + 1}`, label: nodeLabels[nodes.length], text: cleaned });
    }
  }

  if (nodes.length === 0) {
    return nodeLabels.map((label, index) => ({ id: `arc-${index + 1}`, label, text: '' }));
  }

  // Ensure we have exactly nodeLabels.length nodes.
  while (nodes.length < nodeLabels.length) {
    nodes.push({ id: `arc-${nodes.length + 1}`, label: nodeLabels[nodes.length], text: '' });
  }

  return nodes.slice(0, nodeLabels.length);
}

function buildPrompt(input: StoryArcGenerateRequest, nodeLabels: string[]): string {
  const bpmLine = typeof input.bpm === 'number' && Number.isFinite(input.bpm) ? `BPM: ${input.bpm}` : '';
  const genreLine = input.genre ? `Genre: ${input.genre}` : '';
  const themeLine = input.theme ? `Theme hints: ${input.theme}` : '';

  return [
    'You are a creative writing assistant for musicians. Expand the user summary into a consistent story-arc scaffold for lyrics.',
    'Output MUST use the exact headings shown below. Keep each field punchy (1-3 sentences).',
    '',
    `SUMMARY: ${input.summary}`,
    themeLine,
    genreLine,
    bpmLine,
    '',
    'HEADINGS:',
    'THEME:',
    'PROTAGONIST / POV:',
    'INCITING MOMENT:',
    'RISING TENSION:',
    'TURNING POINT:',
    'CHORUS THESIS (HOOK IDEA):',
    'BRIDGE TWIST / CONFESSION:',
    'RESOLUTION / FINAL IMAGE:',
    'MOTIFS:',
    'PUNCHY LINES:',
    `ARC NODES (${nodeLabels.length}):`,
    nodeLabels.map((label, idx) => `${idx + 1}. ${label} -`).join('\n'),
    '',
    'Rules:',
    '- Motifs: 3-6 bullet points',
    '- Punchy lines: exactly 10 numbered lines',
    '- ARC NODES: fill each line with a concrete beat, not abstract advice'
  ]
    .filter(Boolean)
    .join('\n');
}

function synthesizeBeat(label: string, input: StoryArcGenerateRequest): string {
  const base = String(input.summary || '').slice(0, 140);
  const style = input.genre ? `${input.genre} vibe` : input.theme ? String(input.theme).toLowerCase() : '';
  const tempo = typeof input.bpm === 'number' && Number.isFinite(input.bpm) ? `${input.bpm} BPM` : '';
  const styleSuffix = [style, tempo].filter(Boolean).length ? ` (${[style, tempo].filter(Boolean).join(' · ')})` : '';

  const lower = label.toLowerCase();
  switch (lower) {
    case 'start':
      return `Set the scene: ${base}. We arrive hungry and unproven${styleSuffix}.`;
    case 'inciting incident':
      return `Trigger: a door opens and shakes the routine — ${base}. A reason to move now${styleSuffix}.`;
    case 'obstacle':
      return `Complication: old obligations push back; time and money get tight. The cost of chasing this grows.`;
    case 'midpoint turn':
      return `Reversal: a small win exposes a bigger risk. The path forward isn’t what it looked like on day one.`;
    case 'second obstacle':
      return `Aftershock: pressure escalates; help falls through. Doubt creeps in as the city tests resolve${styleSuffix}.`;
    case 'climax':
      return `Decision: pick a side at full volume — commit to the dream or go home. No turning back after this drop.`;
    case 'resolution':
      return `Fallout: quieter streets, new rules. We carry a changed voice into the next chorus, even if the echo hurts.`;
    default:
      return `${label}: ${base}${styleSuffix}`;
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
  const synth = (label: string) => synthesizeBeat(label, input);
  const nodes = nodeLabels.map((label, index) => ({ id: `arc-${index + 1}`, label, text: synth(label) }));

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

  // Enforce distinct node beats
  const seen = new Set<string>();
  const diversifiedNodes = scaffold.nodes.map((node, idx) => {
    const label = nodeLabels[idx] ?? node.label;
    let text = (node.text || '').trim();
    const normalized = text.toLowerCase();
    if (!text || normalized === summarySnippet.toLowerCase() || seen.has(normalized)) {
      // Generate a richer, label-aware fallback using the input context if available
      text = synthesizeBeat(label, { summary: summarySnippet, theme: scaffold.theme } as StoryArcGenerateRequest);
    }
    seen.add(text.toLowerCase());
    return { ...node, label, text };
  });

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

    const scaffold: StoryArcScaffold = ensureProgression({
      theme: parseField(lines, 'THEME') || input.theme || input.genre || '',
      protagonistPOV: parseField(lines, 'PROTAGONIST / POV') || 'First-person',
      incitingMoment: parseField(lines, 'INCITING MOMENT') || '',
      risingTension: parseField(lines, 'RISING TENSION') || '',
      turningPoint: parseField(lines, 'TURNING POINT') || '',
      chorusThesis: parseField(lines, 'CHORUS THESIS (HOOK IDEA)') || '',
      bridgeTwist: parseField(lines, 'BRIDGE TWIST / CONFESSION') || '',
      resolution: parseField(lines, 'RESOLUTION / FINAL IMAGE') || '',
      motifs: parseBulletList(lines, 'MOTIFS')?.slice(0, 8) ?? [],
      punchyLines: parseBulletList(lines, 'PUNCHY LINES')?.slice(0, 10) ?? [],
      nodes: parseNodes(lines, nodeLabels),
      model: 'Xenova/flan-t5-small',
      rawText
    }, summary, nodeLabels);

    // If parsing failed badly, still guarantee content.
    const hasAny = Boolean(scaffold.incitingMoment || scaffold.chorusThesis || scaffold.nodes.some((n) => n.text));
    if (!hasAny) {
      return { ...ensureProgression(buildFallbackScaffold({ ...input, summary }, nodeLabels), summary, nodeLabels), rawText, model: 'Xenova/flan-t5-small' };
    }

    return scaffold;
  } catch (err) {
    // Offline / model download failure: return deterministic scaffold.
    return ensureProgression(buildFallbackScaffold({ ...input, summary }, nodeLabels), summary, nodeLabels);
  }
}
