'use client';

import React from 'react';
import type { ConnectionDetails, ParticipantRole } from './types';

export type WorldSession = {
  worldId: string | null;
  role: ParticipantRole | null;
  isHost: boolean;
};

const WorldSessionContext = React.createContext<WorldSession | null>(null);

export function WorldSessionProvider(props: {
  connectionDetails: ConnectionDetails;
  children: React.ReactNode;
}) {
  const value = React.useMemo<WorldSession>(() => {
    const role = props.connectionDetails.role ?? null;
    return {
      worldId: props.connectionDetails.worldId ?? null,
      role,
      isHost: role === 'host',
    };
  }, [props.connectionDetails.role, props.connectionDetails.worldId]);

  return <WorldSessionContext.Provider value={value}>{props.children}</WorldSessionContext.Provider>;
}

export function useWorldSession(): WorldSession {
  const ctx = React.useContext(WorldSessionContext);
  if (!ctx) {
    return { worldId: null, role: null, isHost: false };
  }
  return ctx;
}
