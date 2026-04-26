export type WorldGalleryEntry = {
  id: string;
  title: string;
  description: string;
  src: string;
  accent: string;
};

export const DEFAULT_WORLD_SCENE_ID = 'bedroom';

export const WORLD_GALLERY: ReadonlyArray<WorldGalleryEntry> = [
  {
    id: DEFAULT_WORLD_SCENE_ID,
    title: 'Stone Bedroom',
    description: 'Lantern-lit medieval chamber. Drag to orbit, scroll to zoom.',
    src: '/worlds/bedroom/index.html',
    accent: 'linear-gradient(135deg, #4a6a3a 0%, #6a8a5a 50%, #aa8a5a 100%)',
  },
];

export function sceneSrcForId(sceneId: string | null | undefined): string | null {
  if (!sceneId) return null;
  const entry = WORLD_GALLERY.find((s) => s.id === sceneId);
  return entry?.src ?? null;
}
