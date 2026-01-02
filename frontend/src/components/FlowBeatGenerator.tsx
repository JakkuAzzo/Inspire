import React, { useState, useEffect, useRef } from 'react';

type NoteLength = 'whole' | 'half' | 'quarter' | 'eighth' | 'sixteenth';
type TimeSignature = '2/4' | '3/4' | '4/4' | '6/8';

interface BeatPattern {
	notes: NoteLength[];
	silences: boolean[];
}

interface FlowBeatGeneratorProps {
	onClose?: () => void;
}

export const FlowBeatGenerator: React.FC<FlowBeatGeneratorProps> = ({ onClose }) => {
	const [bpm, setBpm] = useState(120);
	const [timeSignature, setTimeSignature] = useState<TimeSignature>('4/4');

	const [beatPattern, setBeatPattern] = useState<BeatPattern>(() => {
		const [numerator] = timeSignature.split('/').map(Number);
		return {
			notes: Array(numerator).fill('quarter') as NoteLength[],
			silences: Array(numerator).fill(false),
		};
	});

	const [isPlaying, setIsPlaying] = useState(false);
	const [currentBeatIndex, setCurrentBeatIndex] = useState(0);
	const [currentFlowBeatIndex, setCurrentFlowBeatIndex] = useState(0);

	const audioContextRef = useRef<AudioContext | null>(null);
	const schedulerRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const steadyNextTimeRef = useRef<number>(0);
	const flowNextTimeRef = useRef<number>(0);
	const steadyIndexRef = useRef<number>(0);
	const flowIndexRef = useRef<number>(0);
	const flowAccumUnitsRef = useRef<number>(0);
	const [advancedMode, setAdvancedMode] = useState(false);

	// Initialize audio context
	const getAudioContext = () => {
		if (!audioContextRef.current) {
			audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
		}
		return audioContextRef.current;
	};

	// Play a beep sound
	const playBeep = (frequency: number = 800, duration: number = 100) => {
		const ctx = getAudioContext();
		if (ctx.state === 'suspended') ctx.resume();

		const oscillator = ctx.createOscillator();
		const gainNode = ctx.createGain();
		oscillator.connect(gainNode);
		gainNode.connect(ctx.destination);

		oscillator.frequency.value = frequency;
		gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
		gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration / 1000);

		oscillator.start(ctx.currentTime);
		oscillator.stop(ctx.currentTime + duration / 1000);
	};

	const getNoteUnits = (noteLength: NoteLength): number => {
		const noteDurations: Record<NoteLength, number> = {
			whole: 4,
			half: 2,
			quarter: 1,
			eighth: 0.5,
			sixteenth: 0.25,
		};
		return noteDurations[noteLength];
	};

	const getTotalUnitsInBar = (sig: TimeSignature): number => {
		const [numerator, denominator] = sig.split('/').map(Number);
		return numerator * (4 / denominator);
	};

	const getNoteDelayMs = (noteLength: NoteLength, noteBpm: number): number => {
		const beatMs = (60 / noteBpm) * 1000;
		return beatMs * getNoteUnits(noteLength);
	};

	const stopAll = React.useCallback(() => {
		setIsPlaying(false);
		if (schedulerRef.current) {
			clearInterval(schedulerRef.current);
			schedulerRef.current = null;
		}
		steadyNextTimeRef.current = 0;
		flowNextTimeRef.current = 0;
		steadyIndexRef.current = 0;
		flowIndexRef.current = 0;
		flowAccumUnitsRef.current = 0;
		setCurrentBeatIndex(0);
		setCurrentFlowBeatIndex(0);
	}, []);

	const startAll = () => {
		stopAll();
		setIsPlaying(true);

		const ctx = getAudioContext();
		if (ctx.state === 'suspended') ctx.resume();

		const beatSeconds = 60 / bpm; // quarter note seconds
		const [numerator] = timeSignature.split('/').map(Number);

		steadyIndexRef.current = 0;
		flowIndexRef.current = 0;
		flowAccumUnitsRef.current = 0;
		setCurrentBeatIndex(0);
		setCurrentFlowBeatIndex(0);

		const startTime = ctx.currentTime + 0.05;
		steadyNextTimeRef.current = startTime;
		flowNextTimeRef.current = startTime;

		const lookahead = 0.025; // seconds
		const scheduleInterval = 16; // ms

		schedulerRef.current = setInterval(() => {
			const now = ctx.currentTime;

			while (steadyNextTimeRef.current - now <= lookahead) {
				const beatIdx = steadyIndexRef.current % numerator;
				setCurrentBeatIndex(beatIdx);
				const isDownbeat = beatIdx === 0;
				playBeep(isDownbeat ? 1000 : 800, 50);
				steadyIndexRef.current += 1;
				steadyNextTimeRef.current += beatSeconds;
			}

			while (flowNextTimeRef.current - now <= lookahead) {
				let beatIdx = flowIndexRef.current;
				if (beatIdx >= beatPattern.notes.length) {
					beatIdx = 0;
					flowIndexRef.current = 0;
					flowAccumUnitsRef.current = 0;
				}
				setCurrentFlowBeatIndex(beatIdx);
				if (!beatPattern.silences[beatIdx]) {
					playBeep(600, 75);
				}
				const beatUnits = getNoteUnits(beatPattern.notes[beatIdx]);
				const delaySec = beatUnits * beatSeconds;
				flowAccumUnitsRef.current += beatUnits;
				flowIndexRef.current += 1;

				if (flowIndexRef.current >= beatPattern.notes.length) {
					const barUnits = getTotalUnitsInBar(timeSignature);
					const remainingUnits = Math.max(0, barUnits - flowAccumUnitsRef.current);
					const restSec = remainingUnits * beatSeconds;
					flowNextTimeRef.current += delaySec + restSec;
					flowIndexRef.current = 0;
					flowAccumUnitsRef.current = 0;
				} else {
					flowNextTimeRef.current += delaySec;
				}
			}
		}, scheduleInterval);
	};

	const randomizePattern = () => {
		const noteLengths: NoteLength[] = ['quarter', 'eighth', 'sixteenth', 'half'];
		const newNotes = beatPattern.notes.map(() => noteLengths[Math.floor(Math.random() * noteLengths.length)]);
		const newSilences = beatPattern.silences.map(() => Math.random() > 0.7);
		setBeatPattern({ notes: newNotes, silences: newSilences });
	};

	const quantizePattern = () => {
		const quantizedNotes = beatPattern.notes.map(() => 'quarter' as NoteLength);
		setBeatPattern({ ...beatPattern, notes: quantizedNotes });
	};

	const handleTimeSignatureChange = (newSig: TimeSignature) => {
		stopAll();
		setTimeSignature(newSig);
		const [numerator] = newSig.split('/').map(Number);
		const currentLength = beatPattern.notes.length;

		if (numerator > currentLength) {
			const addedNotes = Array(numerator - currentLength).fill('quarter') as NoteLength[];
			const addedSilences = Array(numerator - currentLength).fill(false);
			setBeatPattern({
				notes: [...beatPattern.notes, ...addedNotes],
				silences: [...beatPattern.silences, ...addedSilences],
			});
		} else {
			setBeatPattern({
				notes: beatPattern.notes.slice(0, numerator),
				silences: beatPattern.silences.slice(0, numerator),
			});
		}
		flowAccumUnitsRef.current = 0;
	};

	const toggleNoteLength = (index: number) => {
		const noteLengths: NoteLength[] = ['quarter', 'eighth', 'sixteenth', 'half', 'whole'];
		const currentNote = beatPattern.notes[index];
		const currentIndex = noteLengths.indexOf(currentNote);
		const nextNote = noteLengths[(currentIndex + 1) % noteLengths.length];

		const newNotes = [...beatPattern.notes];
		newNotes[index] = nextNote;
		setBeatPattern({ ...beatPattern, notes: newNotes });
	};

	const toggleSilence = (index: number) => {
		const newSilences = [...beatPattern.silences];
		newSilences[index] = !newSilences[index];
		setBeatPattern({ ...beatPattern, silences: newSilences });
	};

	const removeBeat = (index: number) => {
		if (beatPattern.notes.length > 1) {
			setBeatPattern({
				notes: beatPattern.notes.filter((_, i) => i !== index),
				silences: beatPattern.silences.filter((_, i) => i !== index),
			});
		}
	};

	const addBeat = (index: number) => {
		const currentUnits = beatPattern.notes.reduce((sum, n) => sum + getNoteUnits(n), 0);
		const barUnits = getTotalUnitsInBar(timeSignature);
		if (!advancedMode && currentUnits + 1 > barUnits) {
			return; // prevent overflow unless in advanced mode
		}
		const newNotes = [...beatPattern.notes];
		const newSilences = [...beatPattern.silences];
		newNotes.splice(index + 1, 0, 'quarter');
		newSilences.splice(index + 1, 0, false);
		setBeatPattern({ notes: newNotes, silences: newSilences });
	};

	useEffect(() => stopAll, [stopAll]);

	const beatCount = parseInt(timeSignature.split('/')[0], 10);
	const totalUnits = getTotalUnitsInBar(timeSignature);
	const editingLocked = isPlaying;

	const noteLabel = (note: NoteLength) => {
		switch (note) {
			case 'whole':
				return 'Whole';
			case 'half':
				return 'Half';
			case 'quarter':
				return 'Quarter';
			case 'eighth':
				return 'Eighth';
			case 'sixteenth':
				return 'Sixteenth';
			default:
				return 'Beat';
		}
	};

	return (
		<div className="flow-beat-generator flow-beat-fullscreen">
			<div className="flow-beat-header">
				<div className="tempo-stack">
					<label>
						<span>Tempo (BPM)</span>
						<input
							type="number"
							value={bpm}
							onChange={(e) => {
								const next = Math.max(40, Math.min(240, Number(e.target.value)));
								setBpm(next);
								if (isPlaying) stopAll();
							}}
							min="40"
							max="240"
							disabled={editingLocked}
							className="number-input"
						/>
					</label>
				</div>
				<div className="tempo-stack">
					<label>
						<span>Time Signature</span>
						<select
							value={timeSignature}
							onChange={(e) => handleTimeSignatureChange(e.target.value as TimeSignature)}
							disabled={editingLocked}
							className="select-input"
						>
							<option value="2/4">2/4</option>
							<option value="3/4">3/4</option>
							<option value="4/4">4/4</option>
							<option value="6/8">6/8</option>
						</select>
					</label>
				</div>
				<div className="play-sync">
					<label className="advanced-toggle">
						<input type="checkbox" checked={advancedMode} onChange={(e) => setAdvancedMode(e.target.checked)} />
						<span>Advanced: allow over-the-bar patterns</span>
					</label>
				</div>
				<div className="play-sync">
					<button
						type="button"
						className={`btn ${isPlaying ? 'secondary' : 'primary'} metronome-toggle`}
						onClick={() => (isPlaying ? stopAll() : startAll())}
					>
						{isPlaying ? '⏹️ Stop Both' : '▶️ Play Both'}
					</button>
					<span className="sync-hint">Steady beat is synced to the flow pattern</span>
				</div>
			</div>

			<div className="flow-beat-body">
				<div className="timeline-panel">
					<div
						className="meter-ruler"
						style={{ ['--beat-count' as any]: beatCount }}
					>
						{Array.from({ length: beatCount }).map((_, idx) => (
							<div key={idx} className="meter-slot">
								<span>{idx + 1}</span>
							</div>
						))}
					</div>

					<div className="timeline-lanes">
						<div className="lane steady">
							<div className="lane-header">
								<div>
									<p className="lane-label">🥁 Steady Beat</p>
									<p className="lane-sub">Quarter pulse across the bar</p>
								</div>
								<div className="steady-pulses" aria-label="Steady beat meter">
									{Array.from({ length: beatCount }).map((_, idx) => (
										<div
											key={idx}
											className={`pulse ${idx === currentBeatIndex && isPlaying ? 'active' : ''}`}
										/>
									))}
								</div>
							</div>
						</div>

						<div className="lane flow">
							<div className="lane-header">
								<div>
									<p className="lane-label">🎵 Flow Pattern</p>
									<p className="lane-sub">Every note is locked to the same tempo</p>
								</div>
								<div className="lane-actions">
									<button type="button" className="btn tertiary micro" onClick={randomizePattern} disabled={editingLocked}>
										🎲 Random
									</button>
									<button type="button" className="btn tertiary micro" onClick={quantizePattern} disabled={editingLocked}>
										📍 Quantize
									</button>
								</div>
							</div>

							<div className="flow-track" style={{ ['--beat-count' as any]: beatCount }}>
								{beatPattern.notes.map((note, index) => {
									const widthPercent = Math.max(6, (getNoteUnits(note) / totalUnits) * 100);
									const isActive = isPlaying && currentFlowBeatIndex === index;
									return (
										<div
											key={index}
											className={`beat-block ${beatPattern.silences[index] ? 'silence' : ''} ${isActive ? 'active' : ''}`}
											style={{ width: `${widthPercent}%` }}
										>
											<div className="beat-block-top" onClick={() => !editingLocked && toggleNoteLength(index)} title="Click to cycle note length">
												<span className="beat-length">{beatPattern.silences[index] ? 'Rest' : noteLabel(note)}</span>
												<span className="beat-size">{beatPattern.silences[index] ? 'Muted' : `${getNoteUnits(note)} beat span`}</span>
											</div>
											<div className="beat-actions-row">
												<button
													type="button"
													className="btn micro ghost"
													onClick={() => !editingLocked && toggleSilence(index)}
													title={beatPattern.silences[index] ? 'Add note' : 'Silence this slot'}
													aria-label={`Toggle silence on beat ${index + 1}`}
													disabled={editingLocked}
												>
													{beatPattern.silences[index] ? '🔊' : '🔇'}
												</button>
												{beatPattern.notes.length > 1 && (
													<button
														type="button"
														className="btn micro ghost"
														onClick={() => !editingLocked && removeBeat(index)}
														title="Remove beat"
														aria-label={`Remove beat ${index + 1}`}
														disabled={editingLocked}
													>
														✕
													</button>
												)}
												<button
													type="button"
													className="btn micro ghost"
													onClick={() => !editingLocked && addBeat(index)}
													title="Add beat after this one"
													aria-label={`Add beat after ${index + 1}`}
													disabled={editingLocked}
												>
													+
												</button>
											</div>
										</div>
									);
								})}
							</div>
						</div>
					</div>
				</div>
			</div>

			<div className="flow-generator-footer">
				<p className="hint-text">One play button starts and stops both lanes. Beat widths are proportional to their note length.</p>
				{onClose && (
					<button type="button" className="btn ghost" onClick={onClose}>
						Close Flow Generator
					</button>
				)}
			</div>
		</div>
	);
};

export default FlowBeatGenerator;
