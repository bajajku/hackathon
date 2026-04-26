'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { encodePassphrase, randomString } from '@/lib/client-utils';
import { fetchArtifacts, fetchRuns, type ArtifactItem, type PastRun } from '@/lib/contentApi';
import { CodaMark } from '@/components/CodaMark';
import styles from '../styles/Coda.module.css';

type Mode = 'create' | 'join';

export default function CodaLandingPage() {
  return (
    <main className={styles.shell} data-lk-theme="default">
      <TopBar />
      <Hero />
      <SessionsSection />
      <FooterStrip />
    </main>
  );
}

function TopBar() {
  return (
    <div className={styles.topBar}>
      <div className={styles.brandPlate}>
        <CodaMark size={44} />
        <div>
          <div className={styles.brandWord}>Coda</div>
          <div className={styles.brandTag}>Meetings, reconsidered</div>
        </div>
      </div>
      <nav className={styles.topNav}>
        <a href="#start">Start</a>
        <a href="#sessions">Sessions</a>
        <a href="https://github.com/livekit/meet" target="_blank" rel="noreferrer">
          Source
        </a>
      </nav>
    </div>
  );
}

function Hero() {
  return (
    <section className={styles.hero} id="start">
      <div className={styles.heroCopy}>
        <CodaMark size={220} drift className={styles.heroFloat} />
        <span className={styles.eyebrow}>Every meeting deserves a coda</span>
        <h1 className={styles.headline}>
          Talk freely. We&rsquo;ll write the
          <br />
          <span className={styles.headlineEmphasis}>recap, the deck, the quiz.</span>
        </h1>
        <p className={styles.lede}>
          Coda turns the moment you hang up into nine learning artifacts — a written report, an
          audio podcast, a slide deck, a mind map, flashcards, a quiz, an infographic, a data
          table, and a video. Generated automatically. Available for download before everyone
          finishes saying goodbye.
        </p>
        <p className={styles.lede}>
          And while you&rsquo;re still in the room — share an{' '}
          <span className={styles.headlineEmphasis}>interactive 3D space</span> with everyone on the
          call. Walk a candlelit library, orbit a stone bedroom, or drop your own scene. Cursors
          sync, the host steers, and your past meeting&rsquo;s artifacts are already pinned to the
          walls.
        </p>
        <ul className={styles.heroFeatures}>
          <li>
            <span>01</span>Shared 3D worlds during the meeting
          </li>
          <li>
            <span>02</span>Auto-generated recap the moment you leave
          </li>
          <li>
            <span>03</span>Plain files. Yours to keep.
          </li>
        </ul>
      </div>
      <Starter />
    </section>
  );
}

function Starter() {
  const router = useRouter();
  const [mode, setMode] = React.useState<Mode>('create');
  const [hostName, setHostName] = React.useState('');
  const [joinName, setJoinName] = React.useState('');
  const [roomCode, setRoomCode] = React.useState('');
  const [e2ee, setE2ee] = React.useState(false);
  const [passphrase] = React.useState(() => randomString(64));
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setPending(true);
    try {
      if (mode === 'create') {
        const trimmed = hostName.trim();
        if (!trimmed) throw new Error('Host name is required.');
        const resp = await fetch('/api/world/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ hostName: trimmed }),
        });
        if (!resp.ok) throw new Error(await resp.text());
        const data = (await resp.json()) as { worldId: string; roomName: string };
        const params = new URLSearchParams({
          worldId: data.worldId,
          created: '1',
          prefillName: trimmed,
        });
        const hash = e2ee ? `#${encodePassphrase(passphrase)}` : '';
        router.push(`/rooms/${data.roomName}?${params.toString()}${hash}`);
      } else {
        const trimmed = roomCode.trim();
        if (!trimmed) throw new Error('Room code is required.');
        const resp = await fetch(`/api/world/by-room?roomName=${encodeURIComponent(trimmed)}`);
        if (!resp.ok) throw new Error(await resp.text());
        const data = (await resp.json()) as { worldId: string; roomName: string };
        const params = new URLSearchParams({ worldId: data.worldId });
        const trimmedJoin = joinName.trim();
        if (trimmedJoin) params.set('prefillName', trimmedJoin);
        const hash = e2ee ? `#${encodePassphrase(passphrase)}` : '';
        router.push(`/rooms/${data.roomName}?${params.toString()}${hash}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start meeting.');
    } finally {
      setPending(false);
    }
  };

  return (
    <div className={styles.starter}>
      <div className={styles.starterHeader}>
        <h2 className={styles.starterTitle}>Open the room</h2>
        <div className={styles.starterToggle} role="tablist">
          <button
            role="tab"
            aria-selected={mode === 'create'}
            onClick={() => setMode('create')}
            className={mode === 'create' ? styles.starterToggleActive : ''}
          >
            New
          </button>
          <button
            role="tab"
            aria-selected={mode === 'join'}
            onClick={() => setMode('join')}
            className={mode === 'join' ? styles.starterToggleActive : ''}
          >
            Join
          </button>
        </div>
      </div>

      {mode === 'create' ? (
        <div className={styles.starterField}>
          <label htmlFor="coda-host">Host name</label>
          <input
            id="coda-host"
            value={hostName}
            onChange={(e) => setHostName(e.target.value)}
            placeholder="e.g. Maya"
            onKeyDown={(e) => e.key === 'Enter' && void submit()}
          />
        </div>
      ) : (
        <>
          <div className={styles.starterField}>
            <label htmlFor="coda-code">Room code</label>
            <input
              id="coda-code"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
              placeholder="ab12-cd34"
              onKeyDown={(e) => e.key === 'Enter' && void submit()}
            />
          </div>
          <div className={styles.starterField}>
            <label htmlFor="coda-name">Your name</label>
            <input
              id="coda-name"
              value={joinName}
              onChange={(e) => setJoinName(e.target.value)}
              placeholder="Optional"
              onKeyDown={(e) => e.key === 'Enter' && void submit()}
            />
          </div>
        </>
      )}

      <button
        className={styles.starterCta}
        onClick={() => void submit()}
        disabled={pending}
        type="button"
      >
        {pending
          ? mode === 'create'
            ? 'Creating room…'
            : 'Joining room…'
          : mode === 'create'
            ? 'Start meeting →'
            : 'Join meeting →'}
      </button>

      <div className={styles.starterMeta}>
        <label>
          <input
            type="checkbox"
            checked={e2ee}
            onChange={(e) => setE2ee(e.target.checked)}
          />
          End-to-end encrypted
        </label>
        <span>recap auto-generates on leave</span>
      </div>

      {error && <p className={styles.starterError}>{error}</p>}
    </div>
  );
}

function SessionsSection() {
  const [runs, setRuns] = React.useState<PastRun[] | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      const list = await fetchRuns();
      if (!cancelled) setRuns(list);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className={styles.sessions} id="sessions">
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>Past sessions</h2>
        <span className={styles.sectionMeta}>
          {runs === null ? 'loading…' : runs.length === 1 ? '1 recap' : `${runs.length} recaps`}
        </span>
      </div>
      <div className={styles.sessionsGrid}>
        {runs === null ? (
          <div className={styles.sessionEmpty}>Tuning the archive…</div>
        ) : runs.length === 0 ? (
          <div className={styles.sessionEmpty}>
            No sessions yet. Your first recap will appear here the moment you leave a meeting.
          </div>
        ) : (
          runs.map((r) => <SessionCard key={r.notebook_id} run={r} />)
        )}
      </div>
    </section>
  );
}

function SessionCard({ run }: { run: PastRun }) {
  const [artifacts, setArtifacts] = React.useState<ArtifactItem[] | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const items = await fetchArtifacts(run.notebook_id);
        if (!cancelled) setArtifacts(items);
      } catch {
        if (!cancelled) setArtifacts([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [run.notebook_id]);

  const ts = run.started_at ? formatTimestamp(run.started_at) : '—';
  const total = run.tasks?.length ?? 9;
  const ready = artifacts?.filter((a) => a.status === 'completed').length ?? 0;
  const processing = artifacts?.filter((a) => a.status === 'processing').length ?? 0;

  return (
    <Link href={`/recap/${run.notebook_id}`} className={styles.sessionCard}>
      <span className={styles.sessionTimestamp}>{ts}</span>
      <h3 className={styles.sessionTitle}>{run.title ?? 'Meeting recap'}</h3>
      <div className={styles.sessionStatus}>
        <span className={styles.sessionDots} aria-hidden>
          {Array.from({ length: total }).map((_, i) => {
            const cls =
              i < ready
                ? styles.dotReady
                : i < ready + processing
                  ? styles.dotProcessing
                  : '';
            return <span key={i} className={cls} />;
          })}
        </span>
        <span>
          {artifacts === null ? 'syncing…' : `${ready}/${total} ready`}
        </span>
      </div>
    </Link>
  );
}

function FooterStrip() {
  return (
    <div className={styles.codaFooter}>
      <span>Coda · Meetings, reconsidered</span>
      <span>Built atop LiveKit + NotebookLM</span>
    </div>
  );
}

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d
      .toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
      .toUpperCase();
  } catch {
    return iso;
  }
}
