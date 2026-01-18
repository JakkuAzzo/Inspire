import React, { useCallback, useEffect, useRef, useState } from 'react';

interface RecordedClip {
  id: string;
  name: string;
  url: string;
  blob: Blob;
  source: 'recorded' | 'imported';
}

export const AudioIOControls: React.FC = () => {
  const [supported, setSupported] = useState(() => typeof window !== 'undefined' && typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/mpeg'));
  const [recorder, setRecorder] = useState<MediaRecorder | null>(null);
  const [recording, setRecording] = useState(false);
  const [clips, setClips] = useState<RecordedClip[]>([]);
  const chunksRef = useRef<BlobPart[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      clips.forEach((clip) => URL.revokeObjectURL(clip.url));
    };
  }, [clips]);

  const startRecording = useCallback(async () => {
    setError(null);
    if (!supported) {
      setError('MP3 recording not supported in this browser.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream, { mimeType: 'audio/mpeg' });
      chunksRef.current = [];
      rec.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) chunksRef.current.push(event.data);
      };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/mpeg' });
        const url = URL.createObjectURL(blob);
        const name = `take-${clips.length + 1}.mp3`;
        setClips((prev) => [...prev, { id: `${Date.now()}`, name, url, blob, source: 'recorded' }]);
        chunksRef.current = [];
      };
      rec.start();
      setRecorder(rec);
      setRecording(true);
    } catch (err) {
      setError('Microphone permission denied or unavailable.');
    }
  }, [supported, clips.length]);

  const stopRecording = useCallback(() => {
    if (!recorder) return;
    recorder.stop();
    recorder.stream.getTracks().forEach((track) => track.stop());
    setRecorder(null);
    setRecording(false);
  }, [recorder]);

  const handleImport = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = event.target.files?.[0];
    if (!file) return;
    if (!(file.type === 'audio/mpeg' || file.name.toLowerCase().endsWith('.mp3'))) {
      setError('Only MP3 files can be imported.');
      return;
    }
    const url = URL.createObjectURL(file);
    setClips((prev) => [...prev, { id: `${Date.now()}`, name: file.name, url, blob: file, source: 'imported' }]);
    event.target.value = '';
  }, []);

  const handleExport = useCallback((clip: RecordedClip) => {
    const link = document.createElement('a');
    link.href = clip.url;
    link.download = clip.name.endsWith('.mp3') ? clip.name : `${clip.name}.mp3`;
    link.click();
  }, []);

  const handleClear = useCallback(() => {
    clips.forEach((clip) => URL.revokeObjectURL(clip.url));
    setClips([]);
  }, [clips]);

  return (
    <div className="audio-io">
      <div className="audio-io-row">
        <div className="audio-io-group">
          <button type="button" className="btn micro" onClick={recording ? stopRecording : startRecording} disabled={!supported}>
            {recording ? 'Stop Recording' : 'Record MP3'}
          </button>
          <span className={`status-dot ${recording ? 'recording' : ''}`} aria-label={recording ? 'Recording' : 'Idle'} />
        </div>
        <div className="audio-io-group">
          <button type="button" className="btn micro" onClick={() => fileInputRef.current?.click()}>
            Import MP3
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/mpeg,audio/mp3"
            style={{ display: 'none' }}
            onChange={handleImport}
          />
        </div>
        <div className="audio-io-group">
          <button type="button" className="btn ghost micro" onClick={handleClear} disabled={!clips.length}>
            Clear Clips
          </button>
        </div>
      </div>
      {error && <p className="error inline-error">{error}</p>}
      <div className="clip-list" aria-live="polite">
        {clips.length === 0 ? (
          <p className="hint">Record or import mp3 clips to use in your DAW session.</p>
        ) : (
          clips.map((clip) => (
            <div key={clip.id} className="clip-row">
              <div className="clip-meta">
                <strong>{clip.name}</strong>
                <span className="clip-source">{clip.source === 'recorded' ? 'Recorded' : 'Imported'}</span>
              </div>
              <div className="clip-actions">
                <audio controls src={clip.url} preload="metadata" />
                <button type="button" className="btn micro" onClick={() => handleExport(clip)}>
                  Export MP3
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
