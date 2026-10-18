import React from 'react';
import { isMediaAvatar, isVideoMedia } from '../utils/mediaUtils';

interface UserAvatarProps {
  avatar?: string | null;
  alt?: string;
  sizeClass?: string;
  textClass?: string;
  className?: string;
}

/**
 * Hiển thị avatar của người dùng: hỗ trợ cả biểu tượng Emoji, Ảnh tĩnh (PNG/JPG/WebP),
 * Ảnh động (GIF) và Video ngắn (MP4/WebM/MOV).
 */
export const UserAvatar: React.FC<UserAvatarProps> = ({
  avatar,
  alt = 'Avatar',
  sizeClass = 'w-8 h-8',
  textClass = 'text-lg',
  className = '',
}) => {
  const value = avatar || '👨‍🚀';

  if (isMediaAvatar(value)) {
    if (isVideoMedia(value)) {
      return (
        <div
          className={`relative overflow-hidden rounded-xl shrink-0 inline-flex items-center justify-center ${sizeClass} ${className}`}
        >
          <video
            src={value}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover"
          />
        </div>
      );
    }

    return (
      <div
        className={`relative overflow-hidden rounded-xl shrink-0 inline-flex items-center justify-center ${sizeClass} ${className}`}
      >
        <img
          src={value}
          alt={alt}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <span className={`inline-flex items-center justify-center leading-none select-none ${textClass} ${className}`}>
      {value}
    </span>
  );
};
