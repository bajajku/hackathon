'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArtifactItem,
  KIND_META,
  downloadUrl,
  fetchArtifacts,
  normalizeKind,
} from '@/lib/contentApi';
import { CodaMark } from '@/components/CodaMark';
import styles from '../../../styles/Recap.module.css';

const POLL_MS = 4000;

export default function RecapPage() {
  const params = useParams();
  const notebookId = String(params?.notebookId ?? '');

  const [artifacts, setArtifacts] = React.useState<ArtifactItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!notebookId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tick = async () => {
      try {
        const items = await fetchArtifacts(notebookId);
        if (cancelled) return;
        setArtifacts(items);
        setError(null);
        const stillProcessing = items.some((a) => a.status === 'processing');
        if (stillProcessing) timer = setTimeout(tick, POLL_MS);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load artifacts');
        timer = setTimeout(tick, POLL_MS * 2);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [notebookId]);

  const ready = artifacts.filter((a) => a.status === 'completed').length;
  const total = artifacts.length;

  return (
    <main className={styles.shell} data-lk-theme="default">
      <div className={styles.topBar}>
        <Link href="/" className={styles.brandPlate} aria-label="Coda home">
          <CodaMark size={36} />
          <span className={styles.brandWord}>Coda</span>
        </Link>
        <Link href="/" className={styles.backLink}>
          ← All sessions
        </Link>
      </div>

      <header className={styles.header}>
        <div className={styles.eyebrow}>Session recap</div>
        <h1 className={styles.title}>Your meeting, in nine forms.</h1>
        <p className={styles.subtitle}>
          Each artifact unlocks the moment its generation finishes. Click to download — they&rsquo;re
          yours, plain files, no app required.
        </p>
      </header>

      {!loading && total > 0 && (
        <div className={styles.progressRow}>
          <span className={styles.progressBadge}>
            <strong>
              {ready}/{total}
            </strong>{' '}
            ready
          </span>
          {ready < total ? (
            <span className={styles.progressLabel}>
              <span className={styles.spinner} />
              Generating remaining…
            </span>
          ) : (
            <span className={styles.progressLabel}>All artifacts complete</span>
          )}
        </div>
      )}

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.grid}>
        {loading && total === 0 ? (
          <div className={styles.empty}>Tuning the archive…</div>
        ) : total === 0 ? (
          <div className={styles.empty}>No artifacts found for this session.</div>
        ) : (
          artifacts.map((a) => (
            <ArtifactCard key={a.id} artifact={a} notebookId={notebookId} />
          ))
        )}
      </div>
    </main>
  );
}

function ArtifactCard({
  artifact,
  notebookId,
}: {
  artifact: ArtifactItem;
  notebookId: string;
}) {
  const kind = normalizeKind(artifact.kind);
  const meta =
    kind === 'unknown'
      ? { label: artifact.kind ?? 'Artifact', icon: '📦', ext: '' }
      : KIND_META[kind];
  const ready = artifact.status === 'completed';
  const failed = artifact.status === 'failed';
  const href = ready && kind !== 'unknown' ? downloadUrl(notebookId, kind, artifact.id) : null;

  return (
    <article className={styles.card}>
      <div className={styles.cardTop}>
        <span className={styles.cardIcon} aria-hidden>
          {meta.icon}
        </span>
        <div style={{ minWidth: 0 }}>
          <div className={styles.cardLabel}>{meta.label}</div>
          <div className={styles.cardTitle} title={artifact.title ?? ''}>
            {artifact.title ?? 'Untitled'}
          </div>
        </div>
      </div>
      <div className={styles.cardFoot}>
        <StatusPill status={artifact.status} />
        {failed ? (
          <span className={styles.downloadDisabled}>failed</span>
        ) : href ? (
          <a href={href} className={styles.downloadBtn} download>
            Download {meta.ext && `.${meta.ext}`}
          </a>
        ) : (
          <span className={styles.downloadDisabled}>generating…</span>
        )}
      </div>
    </article>
  );
}

function StatusPill({ status }: { status: string }) {
  const ready = status === 'completed';
  const failed = status === 'failed';
  const cls = ready ? styles.statusReady : failed ? styles.statusFailed : styles.statusProcessing;
  return <span className={`${styles.statusPill} ${cls}`}>{ready ? 'Ready' : failed ? 'Failed' : 'Processing'}</span>;
}
