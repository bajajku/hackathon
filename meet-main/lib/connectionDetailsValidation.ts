type WorldIdentity = {
  id: string;
  roomName: string;
  hostIdentity: string;
};

type ValidationSuccess = {
  ok: true;
  world: WorldIdentity;
};

type ValidationFailure = {
  ok: false;
  status: number;
  message: string;
};

export type ValidationResult = ValidationSuccess | ValidationFailure;

export function validateWorldForConnection(args: {
  roomName: string;
  worldIdParam: string | null;
  worldByRoom: WorldIdentity | null;
  worldById: WorldIdentity | null;
}): ValidationResult {
  if (!args.worldByRoom) {
    return { ok: false, status: 404, message: 'Room not found' };
  }

  if (args.worldIdParam) {
    if (!args.worldById) {
      return { ok: false, status: 404, message: 'World not found' };
    }
    if (args.worldById.id !== args.worldByRoom.id) {
      return { ok: false, status: 400, message: 'roomName does not match worldId' };
    }
  }

  return { ok: true, world: args.worldByRoom };
}
