'use client';

import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { Suspense, useState } from 'react';
import { encodePassphrase, randomString } from '@/lib/client-utils';
import styles from '../styles/Home.module.css';

function Tabs(props: React.PropsWithChildren<{}>) {
  const searchParams = useSearchParams();
  const tabIndex = searchParams?.get('tab') === 'custom' ? 1 : 0;

  const router = useRouter();
  function onTabSelected(index: number) {
    const tab = index === 1 ? 'custom' : 'demo';
    router.push(`/?tab=${tab}`);
  }

  let tabs = React.Children.map(props.children, (child, index) => {
    return (
      <button
        className={styles.tabButton}
        onClick={() => {
          if (onTabSelected) {
            onTabSelected(index);
          }
        }}
        aria-pressed={tabIndex === index}
      >
        {/* @ts-ignore */}
        {child?.props.label}
      </button>
    );
  });

  return (
    <div className={styles.tabContainer}>
      <div className={styles.tabSelect}>{tabs}</div>
      {/* @ts-ignore */}
      {props.children[tabIndex]}
    </div>
  );
}

function DemoMeetingTab(props: { label: string }) {
  const router = useRouter();
  const [e2ee, setE2ee] = useState(false);
  const [sharedPassphrase, setSharedPassphrase] = useState(randomString(64));
  const [hostName, setHostName] = useState('');
  const [joinName, setJoinName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [pendingAction, setPendingAction] = useState<'create' | 'join' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function createRoom() {
    const trimmedHostName = hostName.trim();
    if (!trimmedHostName) {
      setErrorMessage('Host name is required to create a room.');
      return;
    }
    setErrorMessage(null);
    setPendingAction('create');
    try {
      const response = await fetch('/api/world/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostName: trimmedHostName }),
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      const data = (await response.json()) as { worldId: string; roomName: string };
      const params = new URLSearchParams({
        worldId: data.worldId,
        created: '1',
        prefillName: trimmedHostName,
      });
      const hash = e2ee ? `#${encodePassphrase(sharedPassphrase)}` : '';
      router.push(`/rooms/${data.roomName}?${params.toString()}${hash}`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to create room.');
    } finally {
      setPendingAction(null);
    }
  }

  async function joinRoom() {
    const trimmedRoomCode = roomCode.trim();
    if (!trimmedRoomCode) {
      setErrorMessage('Room code is required to join.');
      return;
    }
    setErrorMessage(null);
    setPendingAction('join');
    try {
      const lookupUrl = `/api/world/by-room?roomName=${encodeURIComponent(trimmedRoomCode)}`;
      const response = await fetch(lookupUrl);
      if (!response.ok) {
        throw new Error(await response.text());
      }
      const data = (await response.json()) as { worldId: string; roomName: string };
      const params = new URLSearchParams({ worldId: data.worldId });
      const trimmedJoinName = joinName.trim();
      if (trimmedJoinName) {
        params.set('prefillName', trimmedJoinName);
      }
      const hash = e2ee ? `#${encodePassphrase(sharedPassphrase)}` : '';
      router.push(`/rooms/${data.roomName}?${params.toString()}${hash}`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to join room.');
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <div className={styles.tabContent}>
      <p className={styles.helperText}>
        Create a room once, share the code, and let everyone join the same live space.
      </p>
      <div className={styles.actionSplit}>
        <div className={styles.actionPane}>
          <h3>Create Room</h3>
          <div className={styles.fieldStack}>
            <label htmlFor="hostName">Host name</label>
            <input
              id="hostName"
              value={hostName}
              onChange={(ev) => setHostName(ev.target.value)}
              placeholder="Enter host name"
            />
          </div>
          <button
            className={`${styles.primaryAction} lk-button`}
            onClick={createRoom}
            disabled={pendingAction !== null}
          >
            {pendingAction === 'create' ? 'Creating Room...' : 'Create Room'}
          </button>
        </div>
        <div className={styles.actionPane}>
          <h3>Join Room</h3>
          <div className={styles.fieldStack}>
            <label htmlFor="roomCode">Room code</label>
            <input
              id="roomCode"
              value={roomCode}
              onChange={(ev) => setRoomCode(ev.target.value)}
              placeholder="e.g. ab12-cd34"
            />
          </div>
          <div className={styles.fieldStack}>
            <label htmlFor="joinName">Your name</label>
            <input
              id="joinName"
              value={joinName}
              onChange={(ev) => setJoinName(ev.target.value)}
              placeholder="Optional"
            />
          </div>
          <button
            className={`${styles.primaryAction} lk-button`}
            onClick={joinRoom}
            disabled={pendingAction !== null}
          >
            {pendingAction === 'join' ? 'Joining Room...' : 'Join Room'}
          </button>
        </div>
      </div>
      {errorMessage && <p className={styles.errorText}>{errorMessage}</p>}
      <div className={styles.securityPanel}>
        <div className={styles.checkRow}>
          <input
            id="demo-use-e2ee"
            type="checkbox"
            checked={e2ee}
            onChange={(ev) => setE2ee(ev.target.checked)}
          ></input>
          <label htmlFor="demo-use-e2ee">Use end-to-end encryption</label>
        </div>
        {e2ee && (
          <div className={styles.fieldRow}>
            <label htmlFor="demo-passphrase">Passphrase</label>
            <input
              id="demo-passphrase"
              type="password"
              value={sharedPassphrase}
              onChange={(ev) => setSharedPassphrase(ev.target.value)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function CustomConnectionTab(props: { label: string }) {
  const router = useRouter();

  const [e2ee, setE2ee] = useState(false);
  const [sharedPassphrase, setSharedPassphrase] = useState(randomString(64));

  const onSubmit: React.FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();
    const formData = new FormData(event.target as HTMLFormElement);
    const serverUrl = formData.get('serverUrl');
    const token = formData.get('token');
    if (e2ee) {
      router.push(
        `/custom/?liveKitUrl=${serverUrl}&token=${token}#${encodePassphrase(sharedPassphrase)}`,
      );
    } else {
      router.push(`/custom/?liveKitUrl=${serverUrl}&token=${token}`);
    }
  };
  return (
    <form className={styles.tabContent} onSubmit={onSubmit}>
      <p className={styles.helperText}>
        Connect SpacePresent to your own real-time media server using a compatible WebRTC endpoint
        and access token.
      </p>
      <div className={styles.fieldStack}>
        <label htmlFor="serverUrl">Server URL</label>
        <input
          id="serverUrl"
          name="serverUrl"
          type="url"
          placeholder="wss://*.livekit.cloud"
          required
        />
      </div>
      <div className={styles.fieldStack}>
        <label htmlFor="token">Access token</label>
        <textarea id="token" name="token" placeholder="Paste token" required rows={5} />
      </div>
      <div className={styles.securityPanel}>
        <div className={styles.checkRow}>
          <input
            id="custom-use-e2ee"
            type="checkbox"
            checked={e2ee}
            onChange={(ev) => setE2ee(ev.target.checked)}
          ></input>
          <label htmlFor="custom-use-e2ee">Enable end-to-end encryption</label>
        </div>
        {e2ee && (
          <div className={styles.fieldRow}>
            <label htmlFor="custom-passphrase">Passphrase</label>
            <input
              id="custom-passphrase"
              type="password"
              value={sharedPassphrase}
              onChange={(ev) => setSharedPassphrase(ev.target.value)}
            />
          </div>
        )}
      </div>

      <hr className={styles.divider} />
      <button className={`${styles.primaryAction} lk-button`} type="submit">
        Connect Space
      </button>
    </form>
  );
}

function SpatialPreview() {
  return (
    <div className={styles.preview} aria-hidden="true">
      <div className={styles.previewHeader}>
        <span>World graph</span>
        <span>Live sync</span>
      </div>
      <div className={styles.mapGrid}>
        <span className={`${styles.node} ${styles.nodeAlpha}`}></span>
        <span className={`${styles.node} ${styles.nodeBeta}`}></span>
        <span className={`${styles.node} ${styles.nodeGamma}`}></span>
        <span className={`${styles.node} ${styles.nodeDelta}`}></span>
        <span className={styles.orbit}></span>
        <span className={styles.trace}></span>
        <span className={`${styles.block} ${styles.blockOne}`}></span>
        <span className={`${styles.block} ${styles.blockTwo}`}></span>
        <span className={`${styles.block} ${styles.blockThree}`}></span>
      </div>
      <div className={styles.timeline}>
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <>
      <main className={styles.main} data-lk-theme="default">
        <section className={styles.heroShell}>
          <div className={styles.header}>
            <div className={styles.logoPlate}>
              <Image
                src="/images/spacepresent-logo.svg"
                alt="SpacePresent"
                width="520"
                height="96"
                priority
              />
            </div>
            <p className={styles.eyebrow}>Spatial meeting platform</p>
            <h1>Turn meetings into navigable knowledge spaces.</h1>
            <p className={styles.lede}>
              SpacePresent gives teams a real-time room shaped for interactive 3D worlds, host-led
              tours, live discussion, and post-meeting knowledge artifacts.
            </p>
            <div className={styles.signalStrip} aria-label="Platform signals">
              <span>Document graph</span>
              <span>Procedural city</span>
              <span>Live tour sync</span>
            </div>
          </div>
          <div className={styles.launchStack}>
            <SpatialPreview />
            <Suspense fallback={<div className={styles.loading}>Loading meeting options</div>}>
              <Tabs>
                <DemoMeetingTab label="Demo" />
                <CustomConnectionTab label="Custom" />
              </Tabs>
            </Suspense>
          </div>
        </section>
      </main>
      <footer data-lk-theme="default">
        SpacePresent is a spatial collaboration shell for rooms, worlds, and recap artifacts.
      </footer>
    </>
  );
}
