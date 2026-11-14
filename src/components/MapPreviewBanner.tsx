import React from 'react';
import { MainMenuPlayModeId } from './MainMenuRightWidgets';
import { thumbForPlayMode } from './mapSelectThumbs';

interface MapPreviewBannerProps {
  modeId: MainMenuPlayModeId;
  className?: string;
}

/**
 * Map select banner — real photo / in-game scenic thumbs for every play mode.
 * (Previously only Dust2 cropped a reference photo; others were canvas drawings.)
 */
export const MapPreviewBanner: React.FC<MapPreviewBannerProps> = ({
  modeId,
  className = '',
}) => {
  const src = thumbForPlayMode(modeId);
  return (
    <img
      src={src}
      alt={`Mapa ${modeId}`}
      referrerPolicy="no-referrer"
      className={`w-full h-[42px] lg:h-[74px] block object-cover object-center ${className}`}
      draggable={false}
    />
  );
};
