'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useDataChannel, useRoomContext } from '@livekit/components-react';
import { RoomEvent, type Participant, type RemoteParticipant } from 'livekit-client';
import { WORKSPACE_TOPIC, type WorkspacePacket } from './dataChannelTypes';
import { isHostParticipant } from './useHostGate';
import { useWorldSession } from './useWorldSession';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export type UseWorkspaceSyncResult = {
  sceneId: string | null;
  setSceneId: (next: string | null) => void;
};

export function useWorkspaceSync(): UseWorkspaceSyncResult {
  const room = useRoomContext();
  const { isHost } = useWorldSession();
  const [sceneId, setSceneIdState] = useState<string | null>(null);
  const sceneIdRef = useRef<string | null>(null);
  sceneIdRef.current = sceneId;

  const onMessage = useCallback(
    (msg: { payload: Uint8Array; from?: Participant }) => {
      if (!isHostParticipant(msg.from)) return;
      let packet: WorkspacePacket;
      try {
        packet = JSON.parse(decoder.decode(msg.payload)) as WorkspacePacket;
      } catch {
        return;
      }
      if (packet.v !== 1) return;
      if (packet.sceneId !== sceneIdRef.current) {
        setSceneIdState(packet.sceneId);
      }
    },
    [],
  );

  const { send } = useDataChannel(WORKSPACE_TOPIC, onMessage);

  const publish = useCallback(
    async (next: string | null) => {
      const packet: WorkspacePacket = { v: 1, t: performance.now(), sceneId: next };
      try {
        await send(encoder.encode(JSON.stringify(packet)), {
          reliable: true,
          topic: WORKSPACE_TOPIC,
        });
      } catch (e) {
        console.warn('workspace publish failed', e);
      }
    },
    [send],
  );

  const setSceneId = useCallback(
    (next: string | null) => {
      if (!isHost) return;
      if (next === sceneIdRef.current) return;
      setSceneIdState(next);
      void publish(next);
    },
    [isHost, publish],
  );

  // Late-joiner: host re-publishes current sceneId when a new participant connects
  useEffect(() => {
    if (!isHost) return;
    const onJoin = (_p: RemoteParticipant) => {
      if (sceneIdRef.current !== null) {
        void publish(sceneIdRef.current);
      }
    };
    room.on(RoomEvent.ParticipantConnected, onJoin);
    return () => {
      room.off(RoomEvent.ParticipantConnected, onJoin);
    };
  }, [isHost, room, publish]);

  return { sceneId, setSceneId };
}
