'use client';

import React from 'react';
import { decodePassphrase } from '@/lib/client-utils';
import { DebugMode } from '@/lib/Debug';
import { KeyboardShortcuts } from '@/lib/KeyboardShortcuts';
import { RecordingIndicator } from '@/lib/RecordingIndicator';
import { SettingsMenu } from '@/lib/SettingsMenu';
import { ConnectionDetails } from '@/lib/types';
import {
  AiSessionStatus,
  fetchAiSessionStatus,
  postAiAudio,
  postAiFrame,
  startAiSession,
  stopAiSession,
} from '@/lib/aiSessionClient';
import {
  formatChatMessageLinks,
  LocalUserChoices,
  PreJoin,
  RoomContext,
  VideoConference,
} from '@livekit/components-react';
import {
  ExternalE2EEKeyProvider,
  RoomOptions,
  VideoCodec,
  VideoPresets,
  Room,
  DeviceUnsupportedError,
  RoomConnectOptions,
  RoomEvent,
  TrackPublishDefaults,
  Track,
  VideoCaptureOptions,
  ConnectionState,
} from 'livekit-client';
import { useRouter } from 'next/navigation';
import { useSetupE2EE } from '@/lib/useSetupE2EE';
import { useLowCPUOptimizer } from '@/lib/usePerfomanceOptimiser';
import { WorldSessionProvider } from '@/lib/useWorldSession';
import {
  ensureMediaDevicesShim,
  getErrorMessageFromUnknown,
  isLikelyMediaCaptureError,
  isMediaCaptureSupported,
} from '@/lib/mediaSupport';

const CONN_DETAILS_ENDPOINT =
  process.env.NEXT_PUBLIC_CONN_DETAILS_ENDPOINT ?? '/api/connection-details';
const SHOW_SETTINGS_MENU = process.env.NEXT_PUBLIC_SHOW_SETTINGS_MENU == 'true';
const AI_PIPELINE_ENABLED = process.env.NEXT_PUBLIC_AI_PIPELINE_ENABLED === 'true';
const SCREEN_CAPTURE_INTERVAL_MS = 1000;
const AUDIO_CAPTURE_INTERVAL_MS = 5000;
const AUDIO_MIME_CANDIDATES = [
  'audio/webm;codecs=opus',
  'audio/webm',
];

export function PageClientImpl(props: {
  roomName: string;
  region?: string;
  hq: boolean;
  codec: VideoCodec;
  singlePeerConnection: boolean;
  worldId?: string;
  created?: boolean;
  prefillName?: string;
}) {
  const mediaCaptureSupported = React.useMemo(() => isMediaCaptureSupported(), []);
  const autoJoinAttempted = React.useRef(false);
  const [mediaShimReady, setMediaShimReady] = React.useState(mediaCaptureSupported);
  const [preJoinChoices, setPreJoinChoices] = React.useState<LocalUserChoices | undefined>(
    undefined,
  );
  const [preJoinErrorMessage, setPreJoinErrorMessage] = React.useState<string | null>(null);
  const [connectionDetails, setConnectionDetails] = React.useState<ConnectionDetails | undefined>(
    undefined,
  );
  const [showShareModal, setShowShareModal] = React.useState(Boolean(props.created));

  const preJoinDefaults = React.useMemo(() => {
    return {
      username: props.prefillName ?? '',
      videoEnabled: mediaCaptureSupported,
      audioEnabled: mediaCaptureSupported,
      videoDeviceId: '',
      audioDeviceId: '',
    };
  }, [props.prefillName, mediaCaptureSupported]);

  const handlePreJoinSubmit = React.useCallback(
    async (values: LocalUserChoices) => {
      setPreJoinErrorMessage(null);
      const username = (values.username ?? '').trim() || props.prefillName || 'Guest';
      const userChoices: LocalUserChoices = {
        ...values,
        username,
        videoEnabled: mediaCaptureSupported ? values.videoEnabled : false,
        audioEnabled: mediaCaptureSupported ? values.audioEnabled : false,
      };

      try {
        const url = new URL(CONN_DETAILS_ENDPOINT, window.location.origin);
        url.searchParams.append('roomName', props.roomName);
        url.searchParams.append('participantName', userChoices.username);
        if (props.region) {
          url.searchParams.append('region', props.region);
        }
        if (props.worldId) {
          url.searchParams.append('worldId', props.worldId);
        }

        const connectionDetailsResp = await fetch(url.toString());
        if (!connectionDetailsResp.ok) {
          const message = await getErrorMessage(connectionDetailsResp);
          throw new Error(message);
        }
        const connectionDetailsData = (await connectionDetailsResp.json()) as ConnectionDetails;
        setPreJoinChoices(userChoices);
        setConnectionDetails(connectionDetailsData);
      } catch (error) {
        console.error(error);
        setPreJoinChoices(undefined);
        setConnectionDetails(undefined);
        setPreJoinErrorMessage(getErrorMessageFromUnknown(error));
      }
    },
    [mediaCaptureSupported, props.prefillName, props.region, props.roomName, props.worldId],
  );

  React.useEffect(() => {
    if (mediaCaptureSupported) {
      setMediaShimReady(true);
      return;
    }
    ensureMediaDevicesShim();
    setMediaShimReady(true);
  }, [mediaCaptureSupported]);

  React.useEffect(() => {
    if (!mediaShimReady || !props.created || autoJoinAttempted.current) {
      return;
    }
    autoJoinAttempted.current = true;

    const hostName = (props.prefillName ?? '').trim() || 'Host';
    void handlePreJoinSubmit({
      username: hostName,
      audioEnabled: mediaCaptureSupported,
      videoEnabled: mediaCaptureSupported,
      videoDeviceId: '',
      audioDeviceId: '',
    });
  }, [handlePreJoinSubmit, mediaCaptureSupported, mediaShimReady, props.created, props.prefillName]);

  const handlePreJoinError = React.useCallback((error: unknown) => {
    console.error(error);
    if (isLikelyMediaCaptureError(error)) {
      setPreJoinErrorMessage(
        'Camera and microphone are unavailable on insecure HTTP. Join in view-only mode or use HTTPS.',
      );
      return;
    }
    setPreJoinErrorMessage(getErrorMessageFromUnknown(error));
  }, []);

  return (
    <main data-lk-theme="default" className="meeting-shell">
      {connectionDetails === undefined || preJoinChoices === undefined ? (
        <div className="prejoin-shell">
          <div className="prejoin-card">
            {!mediaShimReady && (
              <div className="room-alert-banner" role="status">
                Preparing view-only mode...
              </div>
            )}
            {!mediaCaptureSupported && (
              <div className="room-alert-banner" role="status">
                Joined in view-only mode on insecure HTTP. Use HTTPS to enable camera and mic.
              </div>
            )}
            {preJoinErrorMessage && (
              <div className="room-alert-banner room-alert-banner-error" role="alert">
                {preJoinErrorMessage}
              </div>
            )}
            {mediaShimReady && (
              <PreJoin
                defaults={preJoinDefaults}
                onSubmit={handlePreJoinSubmit}
                onError={handlePreJoinError}
              />
            )}
          </div>
        </div>
      ) : (
        <VideoConferenceComponent
          connectionDetails={connectionDetails}
          userChoices={preJoinChoices}
          mediaCaptureSupported={mediaCaptureSupported}
          options={{
            codec: props.codec,
            hq: props.hq,
            singlePeerConnection: props.singlePeerConnection,
          }}
          showShareModal={showShareModal}
          onCloseShareModal={() => setShowShareModal(false)}
        />
      )}
    </main>
  );
}

function VideoConferenceComponent(props: {
  userChoices: LocalUserChoices;
  connectionDetails: ConnectionDetails;
  mediaCaptureSupported: boolean;
  options: {
    hq: boolean;
    codec: VideoCodec;
    singlePeerConnection: boolean;
  };
  showShareModal: boolean;
  onCloseShareModal: () => void;
}) {
  const keyProvider = React.useMemo(() => new ExternalE2EEKeyProvider(), []);
  const { worker, e2eePassphrase } = useSetupE2EE();
  const e2eeEnabled = !!(e2eePassphrase && worker);

  const [e2eeSetupComplete, setE2eeSetupComplete] = React.useState(false);

  const roomOptions = React.useMemo((): RoomOptions => {
    let videoCodec: VideoCodec | undefined = props.options.codec ? props.options.codec : 'vp9';
    if (e2eeEnabled && (videoCodec === 'av1' || videoCodec === 'vp9')) {
      videoCodec = undefined;
    }
    const videoCaptureDefaults: VideoCaptureOptions = {
      deviceId: props.userChoices.videoDeviceId ?? undefined,
      resolution: props.options.hq ? VideoPresets.h2160 : VideoPresets.h720,
    };
    const publishDefaults: TrackPublishDefaults = {
      dtx: false,
      videoSimulcastLayers: props.options.hq
        ? [VideoPresets.h1080, VideoPresets.h720]
        : [VideoPresets.h540, VideoPresets.h216],
      red: !e2eeEnabled,
      videoCodec,
    };
    return {
      videoCaptureDefaults: videoCaptureDefaults,
      publishDefaults: publishDefaults,
      audioCaptureDefaults: {
        deviceId: props.userChoices.audioDeviceId ?? undefined,
      },
      adaptiveStream: true,
      dynacast: true,
      e2ee: keyProvider && worker && e2eeEnabled ? { keyProvider, worker } : undefined,
      singlePeerConnection: props.options.singlePeerConnection,
    };
  }, [
    props.userChoices,
    props.options.hq,
    props.options.codec,
    props.options.singlePeerConnection,
    e2eeEnabled,
    keyProvider,
    worker,
  ]);

  const roomRef = React.useRef<Room | null>(null);
  if (!roomRef.current) {
    roomRef.current = new Room(roomOptions);
  }
  const room = roomRef.current;
  const isHost = props.connectionDetails.role === 'host';
  const [aiSessionStatus, setAiSessionStatus] = React.useState<AiSessionStatus | null>(null);
  const [aiPipelineError, setAiPipelineError] = React.useState<string | null>(null);
  const aiSessionIdRef = React.useRef<string | null>(null);
  const frameVideoRef = React.useRef<HTMLVideoElement | null>(null);
  const frameCanvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const frameUploadInFlightRef = React.useRef(false);
  const activeScreenTrackRef = React.useRef<MediaStreamTrack | null>(null);
  const audioRecorderRef = React.useRef<MediaRecorder | null>(null);
  const audioStreamRef = React.useRef<MediaStream | null>(null);
  const audioMimeRef = React.useRef<string>('audio/webm;codecs=opus');
  const audioUploadInFlightRef = React.useRef(false);

  React.useEffect(() => {
    if (e2eeEnabled) {
      keyProvider
        .setKey(decodePassphrase(e2eePassphrase))
        .then(() => {
          room.setE2EEEnabled(true).catch((e) => {
            if (e instanceof DeviceUnsupportedError) {
              alert(
                `You're trying to join an encrypted meeting, but your browser does not support it. Please update it to the latest version and try again.`,
              );
              console.error(e);
            } else {
              throw e;
            }
          });
        })
        .then(() => setE2eeSetupComplete(true));
    } else {
      setE2eeSetupComplete(true);
    }
  }, [e2eeEnabled, room, e2eePassphrase, keyProvider]);

  const connectOptions = React.useMemo((): RoomConnectOptions => {
    return {
      autoSubscribe: true,
    };
  }, []);

  const router = useRouter();
  const handleOnLeave = React.useCallback(() => router.push('/'), [router]);
  const assignScreenTrack = React.useCallback((track: MediaStreamTrack | null) => {
    activeScreenTrackRef.current = track;
    if (!track) {
      if (frameVideoRef.current) {
        frameVideoRef.current.srcObject = null;
      }
      return;
    }

    if (!frameVideoRef.current) {
      const video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      frameVideoRef.current = video;
    }

    const stream = new MediaStream([track]);
    frameVideoRef.current.srcObject = stream;
    void frameVideoRef.current.play().catch(() => {
      // noop: browser may require explicit interaction; next frame tick retries naturally.
    });
  }, []);
  const syncScreenTrackFromRoom = React.useCallback(() => {
    const publication = room.localParticipant.getTrackPublication(Track.Source.ScreenShare);
    const mediaTrack = publication?.videoTrack?.mediaStreamTrack ?? null;
    if (
      mediaTrack?.id &&
      activeScreenTrackRef.current?.id &&
      mediaTrack.id === activeScreenTrackRef.current.id
    ) {
      return;
    }
    assignScreenTrack(mediaTrack);
  }, [assignScreenTrack, room]);
  const stopPipeline = React.useCallback(async () => {
    const sessionId = aiSessionIdRef.current;
    aiSessionIdRef.current = null;
    if (!sessionId) return;
    try {
      await stopAiSession(sessionId);
    } catch (error) {
      console.error(error);
    }
  }, []);
  const startPipeline = React.useCallback(async () => {
    if (!AI_PIPELINE_ENABLED || !isHost || aiSessionIdRef.current) return;
    try {
      const started = await startAiSession({
        roomName: props.connectionDetails.roomName,
        worldId: props.connectionDetails.worldId ?? undefined,
      });
      aiSessionIdRef.current = started.sessionId;
      setAiPipelineError(null);
      const status = await fetchAiSessionStatus(started.sessionId);
      setAiSessionStatus(status);
    } catch (error) {
      console.error(error);
      setAiPipelineError(getErrorMessageFromUnknown(error));
    }
  }, [isHost, props.connectionDetails.roomName, props.connectionDetails.worldId]);
  const uploadScreenFrame = React.useCallback(async () => {
    const sessionId = aiSessionIdRef.current;
    const activeTrack = activeScreenTrackRef.current;
    const video = frameVideoRef.current;
    if (!sessionId || !activeTrack || !video) return;
    if (frameUploadInFlightRef.current) return;
    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
    if (video.videoWidth <= 1 || video.videoHeight <= 1) return;

    if (!frameCanvasRef.current) {
      frameCanvasRef.current = document.createElement('canvas');
    }
    const canvas = frameCanvasRef.current;
    const maxWidth = 1280;
    const scale = Math.min(1, maxWidth / video.videoWidth);
    canvas.width = Math.max(2, Math.floor(video.videoWidth * scale));
    canvas.height = Math.max(2, Math.floor(video.videoHeight * scale));

    const context = canvas.getContext('2d');
    if (!context) return;

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    frameUploadInFlightRef.current = true;
    try {
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/jpeg', 0.72);
      });
      if (!blob) return;
      await postAiFrame({
        sessionId,
        frame: blob,
        timestampMs: Date.now(),
      });
    } catch (error) {
      console.error(error);
      setAiPipelineError(getErrorMessageFromUnknown(error));
    } finally {
      frameUploadInFlightRef.current = false;
    }
  }, []);

  React.useEffect(() => {
    if (!AI_PIPELINE_ENABLED || !isHost) return;
    const handleLocalTrackPublished = () => syncScreenTrackFromRoom();
    const handleLocalTrackUnpublished = () => syncScreenTrackFromRoom();
    room.on(RoomEvent.LocalTrackPublished, handleLocalTrackPublished);
    room.on(RoomEvent.LocalTrackUnpublished, handleLocalTrackUnpublished);
    syncScreenTrackFromRoom();
    return () => {
      room.off(RoomEvent.LocalTrackPublished, handleLocalTrackPublished);
      room.off(RoomEvent.LocalTrackUnpublished, handleLocalTrackUnpublished);
      assignScreenTrack(null);
    };
  }, [assignScreenTrack, isHost, room, syncScreenTrackFromRoom]);

  React.useEffect(() => {
    if (!AI_PIPELINE_ENABLED || !isHost) return;
    const onConnected = () => {
      void startPipeline();
    };
    const onDisconnected = () => {
      void stopPipeline();
    };
    room.on(RoomEvent.Connected, onConnected);
    room.on(RoomEvent.Disconnected, onDisconnected);

    if (room.state === ConnectionState.Connected) {
      void startPipeline();
    }

    return () => {
      room.off(RoomEvent.Connected, onConnected);
      room.off(RoomEvent.Disconnected, onDisconnected);
      void stopPipeline();
    };
  }, [isHost, room, startPipeline, stopPipeline]);

  React.useEffect(() => {
    if (!AI_PIPELINE_ENABLED || !isHost) return;
    const id = window.setInterval(() => {
      void uploadScreenFrame();
    }, SCREEN_CAPTURE_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [isHost, uploadScreenFrame]);

  React.useEffect(() => {
    if (!AI_PIPELINE_ENABLED || !isHost) return;
    if (typeof window === 'undefined') return;
    if (typeof window.MediaRecorder === 'undefined') return;
    if (!navigator?.mediaDevices?.getUserMedia) return;

    let cancelled = false;
    let intervalId: number | null = null;

    const supportedMime =
      AUDIO_MIME_CANDIDATES.find((mime) => MediaRecorder.isTypeSupported(mime)) ?? '';
    if (!supportedMime) {
      console.warn('No supported MediaRecorder mime type for audio capture');
      return;
    }
    audioMimeRef.current = supportedMime;

    const captureChunk = () =>
      new Promise<Blob | null>((resolve) => {
        const stream = audioStreamRef.current;
        if (!stream) return resolve(null);
        let recorder: MediaRecorder;
        try {
          recorder = new MediaRecorder(stream, { mimeType: supportedMime });
        } catch (error) {
          console.error('Failed to start MediaRecorder', error);
          return resolve(null);
        }
        audioRecorderRef.current = recorder;
        const parts: BlobPart[] = [];
        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) parts.push(event.data);
        };
        recorder.onerror = (event) => {
          console.error('MediaRecorder error', event);
          resolve(null);
        };
        recorder.onstop = () => {
          if (parts.length === 0) return resolve(null);
          resolve(new Blob(parts, { type: supportedMime }));
        };
        recorder.start();
        window.setTimeout(() => {
          if (recorder.state !== 'inactive') {
            try {
              recorder.stop();
            } catch (error) {
              console.error('Failed to stop MediaRecorder', error);
              resolve(null);
            }
          }
        }, AUDIO_CAPTURE_INTERVAL_MS);
      });

    const tick = async () => {
      const sessionId = aiSessionIdRef.current;
      if (!sessionId) return;
      if (audioUploadInFlightRef.current) return;
      audioUploadInFlightRef.current = true;
      const startMs = Date.now();
      try {
        const blob = await captureChunk();
        if (cancelled || !blob) return;
        await postAiAudio({
          sessionId,
          audio: blob,
          timestampMs: startMs,
          encoding: 'WEBM_OPUS',
          sampleRateHz: 48000,
          languageCode: 'en-US',
          speaker: 'host',
        });
      } catch (error) {
        if (!cancelled) {
          console.error(error);
          setAiPipelineError(getErrorMessageFromUnknown(error));
        }
      } finally {
        audioUploadInFlightRef.current = false;
      }
    };

    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true },
          video: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        audioStreamRef.current = stream;
        void tick();
        intervalId = window.setInterval(() => {
          void tick();
        }, AUDIO_CAPTURE_INTERVAL_MS);
      } catch (error) {
        console.error('Failed to acquire microphone for transcription', error);
        if (!cancelled) {
          setAiPipelineError(getErrorMessageFromUnknown(error));
        }
      }
    };

    void start();

    return () => {
      cancelled = true;
      if (intervalId !== null) window.clearInterval(intervalId);
      const recorder = audioRecorderRef.current;
      if (recorder && recorder.state !== 'inactive') {
        try {
          recorder.stop();
        } catch {
          // ignore
        }
      }
      audioRecorderRef.current = null;
      const stream = audioStreamRef.current;
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
      audioStreamRef.current = null;
    };
  }, [isHost]);

  React.useEffect(() => {
    if (!AI_PIPELINE_ENABLED || !isHost) return;
    let cancelled = false;

    const poll = async () => {
      const sessionId = aiSessionIdRef.current;
      if (!sessionId) return;
      try {
        const status = await fetchAiSessionStatus(sessionId);
        if (cancelled) return;
        setAiSessionStatus(status);
        if (status.error) {
          setAiPipelineError(status.error);
        }
      } catch (error) {
        if (cancelled) return;
        setAiPipelineError(getErrorMessageFromUnknown(error));
      }
    };

    void poll();
    const id = window.setInterval(() => {
      void poll();
    }, 10000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [isHost]);

  const handleError = React.useCallback((error: Error) => {
    console.error(error);
    if (isLikelyMediaCaptureError(error)) {
      if (!props.mediaCaptureSupported) {
        return;
      }
      alert(
        'Camera and microphone are unavailable on insecure HTTP. Join with media off or switch to HTTPS.',
      );
      return;
    }
    alert(
      `Encountered an unexpected error, check the console logs for details: ${error.message}`,
    );
  }, [props.mediaCaptureSupported]);
  const handleEncryptionError = React.useCallback((error: Error) => {
    console.error(error);
    alert(
      `Encountered an unexpected encryption error, check the console logs for details: ${error.message}`,
    );
  }, []);

  React.useEffect(() => {
    room.on(RoomEvent.Disconnected, handleOnLeave);
    room.on(RoomEvent.EncryptionError, handleEncryptionError);
    room.on(RoomEvent.MediaDevicesError, handleError);

    if (e2eeSetupComplete) {
      room
        .connect(
          props.connectionDetails.serverUrl,
          props.connectionDetails.participantToken,
          connectOptions,
        )
        .catch((error) => {
          handleError(error);
        });

      if (props.mediaCaptureSupported && props.userChoices.videoEnabled) {
        room.localParticipant.setCameraEnabled(true).catch((error) => {
          handleError(error);
        });
      }
      if (props.mediaCaptureSupported && props.userChoices.audioEnabled) {
        room.localParticipant.setMicrophoneEnabled(true).catch((error) => {
          handleError(error);
        });
      }
    }
    return () => {
      room.off(RoomEvent.Disconnected, handleOnLeave);
      room.off(RoomEvent.EncryptionError, handleEncryptionError);
      room.off(RoomEvent.MediaDevicesError, handleError);
      void room.disconnect();
    };
  }, [
    e2eeSetupComplete,
    room,
    props.connectionDetails,
    props.userChoices,
    props.mediaCaptureSupported,
    connectOptions,
    handleError,
    handleOnLeave,
    handleEncryptionError,
  ]);

  const lowPowerMode = useLowCPUOptimizer(room);
  React.useEffect(() => {
    if (lowPowerMode) {
      console.warn('Low power mode enabled');
    }
  }, [lowPowerMode]);

  return (
    <div className="lk-room-container">
      {isHost && AI_PIPELINE_ENABLED && (
        <div
          className={`room-alert-banner${aiPipelineError ? ' room-alert-banner-error' : ''}`}
          role={aiPipelineError ? 'alert' : 'status'}
        >
          {aiPipelineError
            ? `AI recap pipeline error: ${aiPipelineError}`
            : `AI recap pipeline: ${aiSessionStatus?.status ?? 'initializing'}`}
        </div>
      )}
      {!props.mediaCaptureSupported && (
        <div className="room-alert-banner" role="status">
          Joined without camera and mic on insecure HTTP. Use HTTPS for full media access.
        </div>
      )}
      {props.showShareModal && (
        <ShareRoomModal
          roomName={props.connectionDetails.roomName}
          worldId={props.connectionDetails.worldId}
          onClose={props.onCloseShareModal}
        />
      )}
      <RoomContext.Provider value={room}>
        <WorldSessionProvider connectionDetails={props.connectionDetails}>
          <KeyboardShortcuts />
          <VideoConference
            chatMessageFormatter={formatChatMessageLinks}
            SettingsComponent={SHOW_SETTINGS_MENU ? SettingsMenu : undefined}
          />
          <DebugMode />
          <RecordingIndicator />
        </WorldSessionProvider>
      </RoomContext.Provider>
    </div>
  );
}

function ShareRoomModal(props: { roomName: string; worldId?: string; onClose: () => void }) {
  const [copyMessage, setCopyMessage] = React.useState<string>('');

  const roomCode = props.roomName;
  const shareLink = React.useMemo(() => {
    if (typeof window === 'undefined') {
      return '';
    }
    const shareUrl = new URL(`/rooms/${props.roomName}`, window.location.origin);
    if (props.worldId) {
      shareUrl.searchParams.set('worldId', props.worldId);
    }
    if (window.location.hash) {
      shareUrl.hash = window.location.hash;
    }
    return shareUrl.toString();
  }, [props.roomName, props.worldId]);

  const copyValue = React.useCallback(async (value: string, label: string) => {
    const markCopied = () => {
      setCopyMessage(`${label} copied.`);
      window.setTimeout(() => setCopyMessage(''), 1500);
    };
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        markCopied();
        return;
      }
      if (legacyCopyToClipboard(value)) {
        markCopied();
        return;
      }
      setCopyMessage(`Clipboard unavailable on HTTP. Copy the ${label.toLowerCase()} manually.`);
    } catch (error) {
      console.error(error);
      if (legacyCopyToClipboard(value)) {
        markCopied();
        return;
      }
      setCopyMessage(`Clipboard blocked on HTTP. Copy the ${label.toLowerCase()} manually.`);
    }
  }, []);

  return (
    <div className="room-share-modal-backdrop" role="presentation">
      <section className="room-share-modal" role="dialog" aria-modal="true" aria-label="Share room">
        <h2>Room Ready</h2>
        <p>Share this room code or link so others can join the same session.</p>
        <div className="room-share-field">
          <label>Room code</label>
          <div>
            <code>{roomCode}</code>
            <button
              className="lk-button"
              type="button"
              onClick={() => copyValue(roomCode, 'Room code')}
            >
              Copy
            </button>
          </div>
        </div>
        <div className="room-share-field">
          <label>Share link</label>
          <div>
            <code>{shareLink}</code>
            <button
              className="lk-button"
              type="button"
              onClick={() => copyValue(shareLink, 'Share link')}
            >
              Copy
            </button>
          </div>
        </div>
        <div className="room-share-footer">
          <span>{copyMessage}</span>
          <button className="lk-button" type="button" onClick={props.onClose}>
            Done
          </button>
        </div>
      </section>
    </div>
  );
}

async function getErrorMessage(response: Response): Promise<string> {
  try {
    const body = await response.text();
    return body || `Request failed with status ${response.status}`;
  } catch {
    return `Request failed with status ${response.status}`;
  }
}

function legacyCopyToClipboard(value: string): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', 'true');
    textarea.style.position = 'absolute';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);
    const copied = document.execCommand('copy');
    document.body.removeChild(textarea);
    return copied;
  } catch {
    return false;
  }
}
