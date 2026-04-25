import React from 'react';
import {
  MediaDeviceMenu,
  TrackReference,
  TrackToggle,
  useLocalParticipant,
  VideoTrack,
} from '@livekit/components-react';
import { BackgroundBlur, VirtualBackground } from '@livekit/track-processors';
import { isLocalTrack, LocalTrackPublication, Track } from 'livekit-client';
import styles from '../styles/DeviceSettings.module.css';

const BACKGROUND_IMAGES = [
  { name: 'World Grid', path: '/images/spacepresent-world-grid.svg' },
  { name: 'Signal Field', path: '/images/spacepresent-signal-field.svg' },
];

// Background options
type BackgroundType = 'none' | 'blur' | 'image';

export function CameraSettings() {
  const { cameraTrack, localParticipant } = useLocalParticipant();
  const [backgroundType, setBackgroundType] = React.useState<BackgroundType>(
    (cameraTrack as LocalTrackPublication)?.track?.getProcessor()?.name === 'background-blur'
      ? 'blur'
      : (cameraTrack as LocalTrackPublication)?.track?.getProcessor()?.name === 'virtual-background'
        ? 'image'
        : 'none',
  );

  const [virtualBackgroundImagePath, setVirtualBackgroundImagePath] = React.useState<string | null>(
    null,
  );

  const camTrackRef: TrackReference | undefined = React.useMemo(() => {
    return cameraTrack
      ? { participant: localParticipant, publication: cameraTrack, source: Track.Source.Camera }
      : undefined;
  }, [localParticipant, cameraTrack]);

  const selectBackground = (type: BackgroundType, imagePath?: string) => {
    setBackgroundType(type);
    if (type === 'image' && imagePath) {
      setVirtualBackgroundImagePath(imagePath);
    } else if (type !== 'image') {
      setVirtualBackgroundImagePath(null);
    }
  };

  React.useEffect(() => {
    if (isLocalTrack(cameraTrack?.track)) {
      if (backgroundType === 'blur') {
        cameraTrack.track?.setProcessor(BackgroundBlur());
      } else if (backgroundType === 'image' && virtualBackgroundImagePath) {
        cameraTrack.track?.setProcessor(VirtualBackground(virtualBackgroundImagePath));
      } else {
        cameraTrack.track?.stopProcessor();
      }
    }
  }, [cameraTrack, backgroundType, virtualBackgroundImagePath]);

  return (
    <div className={styles.cameraSettings}>
      {camTrackRef && <VideoTrack className={styles.cameraPreview} trackRef={camTrackRef} />}

      <section className="lk-button-group">
        <TrackToggle source={Track.Source.Camera}>Camera</TrackToggle>
        <div className="lk-button-group-menu">
          <MediaDeviceMenu kind="videoinput" />
        </div>
      </section>

      <div className={styles.settingBlock}>
        <div className={styles.settingLabel}>Background Effects</div>
        <div className={styles.swatchGrid}>
          <button
            onClick={() => selectBackground('none')}
            className={styles.backgroundSwatch}
            aria-pressed={backgroundType === 'none'}
          >
            <span className={styles.swatchLabel}>None</span>
          </button>

          <button
            onClick={() => selectBackground('blur')}
            className={`${styles.backgroundSwatch} ${styles.blurSwatch}`}
            aria-pressed={backgroundType === 'blur'}
          >
            <span className={styles.swatchLabel}>Blur</span>
          </button>

          {BACKGROUND_IMAGES.map((image) => (
            <button
              key={image.path}
              onClick={() => selectBackground('image', image.path)}
              className={`${styles.backgroundSwatch} ${styles.imageSwatch}`}
              aria-pressed={backgroundType === 'image' && virtualBackgroundImagePath === image.path}
              style={{
                backgroundImage: `url(${image.path})`,
              }}
            >
              <span className={styles.swatchLabel}>{image.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
