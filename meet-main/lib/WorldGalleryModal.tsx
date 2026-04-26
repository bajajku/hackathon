'use client';

import React from 'react';
import { WORLD_GALLERY } from './worldGallery';

export function WorldGalleryModal(props: {
  currentSceneId: string | null;
  onPick: (sceneId: string | null) => void;
  onClose: () => void;
}) {
  return (
    <div className="world-gallery-backdrop" role="presentation" onClick={props.onClose}>
      <section
        className="world-gallery-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Pick a workspace"
        onClick={(e) => e.stopPropagation()}
      >
        <h2>Shared workspaces</h2>
        <p>Pick a scene to open it for everyone in this room.</p>
        <div className="world-gallery-grid">
          {WORLD_GALLERY.map((entry) => {
            const active = entry.id === props.currentSceneId;
            return (
              <button
                key={entry.id}
                type="button"
                className={`world-gallery-card${active ? ' world-gallery-card-active' : ''}`}
                onClick={() => {
                  props.onPick(entry.id);
                  props.onClose();
                }}
              >
                <div className="world-gallery-thumb" style={{ background: entry.accent }} />
                <div className="world-gallery-meta">
                  <span className="world-gallery-card-title">{entry.title}</span>
                  <span className="world-gallery-card-desc">{entry.description}</span>
                </div>
                {active && <span className="world-gallery-card-badge">Open</span>}
              </button>
            );
          })}
        </div>
        <div className="world-gallery-footer">
          {props.currentSceneId !== null && (
            <button
              className="lk-button"
              type="button"
              onClick={() => {
                props.onPick(null);
                props.onClose();
              }}
            >
              Close current workspace
            </button>
          )}
          <button className="lk-button" type="button" onClick={props.onClose}>
            Cancel
          </button>
        </div>
      </section>
    </div>
  );
}
