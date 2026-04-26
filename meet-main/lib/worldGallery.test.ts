import { describe, expect, it } from 'vitest';
import { DEFAULT_WORLD_SCENE_ID, sceneSrcForId } from './worldGallery';

describe('worldGallery', () => {
  it('resolves the default bedroom scene to the static iframe asset', () => {
    expect(DEFAULT_WORLD_SCENE_ID).toBe('bedroom');
    expect(sceneSrcForId(DEFAULT_WORLD_SCENE_ID)).toBe('/worlds/bedroom/index.html');
  });

  it('returns null for missing and unknown scene ids', () => {
    expect(sceneSrcForId(null)).toBeNull();
    expect(sceneSrcForId(undefined)).toBeNull();
    expect(sceneSrcForId('missing-scene')).toBeNull();
  });
});
