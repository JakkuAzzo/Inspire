import { useEffect, useMemo, useRef, useState } from 'react';

type FallingWord = {
	id: string;
	text: string;
	leftPct: number;
	createdAt: number;
};

export interface FallingWordStreamProps {
	items: string[];
	active?: boolean;
	maxVisible?: number;
	spawnIntervalMs?: number;
	fallDurationMs?: number;
	className?: string;
	compact?: boolean;
	anchored?: boolean;
	forceActive?: boolean;
}

function clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value));
}

export function FallingWordStream({
	items,
	active = false,
	maxVisible = 24,
	spawnIntervalMs = 350,
	fallDurationMs = 9000,
	className,
	compact = false,
	anchored = false,
	forceActive = false
}: FallingWordStreamProps) {
	const normalizedItems = useMemo(() => Array.from(new Set(items.map((x) => x?.trim()).filter(Boolean) as string[])), [items]);
	const [words, setWords] = useState<FallingWord[]>([]);
	const roundRobinRef = useRef(0);
	const runningRef = useRef(false);

	const shouldRun = (active || forceActive) && normalizedItems.length > 0;
	const safeMaxVisible = clamp(maxVisible, 4, 64);
	const safeSpawnIntervalMs = clamp(spawnIntervalMs, 80, 2000);
	const safeFallDurationMs = clamp(fallDurationMs, 2500, 20000);

	useEffect(() => {
		if (!shouldRun) {
			runningRef.current = false;
			setWords([]);
			return;
		}

		runningRef.current = true;
		const intervalId = window.setInterval(() => {
			if (!runningRef.current) return;
			const idx = roundRobinRef.current % normalizedItems.length;
			roundRobinRef.current += 1;
			const nextText = normalizedItems[idx] ?? '';
			const now = Date.now();
			const next: FallingWord = {
				id: `fall-${now}-${Math.random().toString(36).slice(2, 8)}`,
				text: nextText,
				leftPct: 5 + Math.random() * 90,
				createdAt: now
			};
			setWords((current) => {
				const pruned = current.slice(-safeMaxVisible + 1);
				return [...pruned, next];
			});
		}, safeSpawnIntervalMs);

		return () => {
			runningRef.current = false;
			window.clearInterval(intervalId);
		};
	}, [normalizedItems, safeMaxVisible, safeSpawnIntervalMs, shouldRun]);

	const modeClass = shouldRun ? 'focus-active' : 'idle';
	const classes = [
		'falling-word-stream',
		modeClass,
		anchored ? 'anchored' : '',
		compact ? 'compact' : '',
		className ?? ''
	]
		.filter(Boolean)
		.join(' ');

	if (!shouldRun) return null;

	return (
		<div className={classes} aria-hidden="true">
			{words.map((word) => (
				<span
					key={word.id}
					className="falling-word"
					style={{ left: `${word.leftPct}%`, animationDuration: `${safeFallDurationMs}ms` }}
					onAnimationEnd={() => {
						setWords((current) => current.filter((w) => w.id !== word.id));
					}}
				>
					{word.text}
				</span>
			))}
		</div>
	);
}
