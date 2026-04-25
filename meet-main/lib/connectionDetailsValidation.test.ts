import { describe, expect, it } from 'vitest';
import { validateWorldForConnection } from './connectionDetailsValidation';

const world = {
  id: 'world-1',
  roomName: 'room-1',
  hostIdentity: 'host__1',
};

describe('validateWorldForConnection', () => {
  it('rejects unknown rooms', () => {
    const result = validateWorldForConnection({
      roomName: 'room-1',
      worldIdParam: null,
      worldByRoom: null,
      worldById: null,
    });
    expect(result).toEqual({ ok: false, status: 404, message: 'Room not found' });
  });

  it('rejects unknown world IDs', () => {
    const result = validateWorldForConnection({
      roomName: 'room-1',
      worldIdParam: 'missing',
      worldByRoom: world,
      worldById: null,
    });
    expect(result).toEqual({ ok: false, status: 404, message: 'World not found' });
  });

  it('rejects mismatched room/world bindings', () => {
    const result = validateWorldForConnection({
      roomName: 'room-1',
      worldIdParam: 'world-2',
      worldByRoom: world,
      worldById: { ...world, id: 'world-2' },
    });
    expect(result).toEqual({ ok: false, status: 400, message: 'roomName does not match worldId' });
  });

  it('allows known room lookups without worldId', () => {
    const result = validateWorldForConnection({
      roomName: 'room-1',
      worldIdParam: null,
      worldByRoom: world,
      worldById: null,
    });
    expect(result).toEqual({ ok: true, world });
  });

  it('allows matching room/world bindings', () => {
    const result = validateWorldForConnection({
      roomName: 'room-1',
      worldIdParam: 'world-1',
      worldByRoom: world,
      worldById: world,
    });
    expect(result).toEqual({ ok: true, world });
  });
});
