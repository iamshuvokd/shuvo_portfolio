import { assetUrl } from '@/config/env';
import small from '@/assets/profile-sm.webp';
import medium from '@/assets/profile-md.webp';
import large from '@/assets/profile-lg.webp';
import { useContent } from '@/hooks/use-content';

const bundled = { sm: small, md: medium, lg: large } as const;

/**
 * Profile photo URL. An admin-uploaded photo wins; otherwise the bundled default is used in the size
 * that matches where it is shown (sm = header avatar, md = about card, lg = 3D portrait), so a 36px
 * avatar no longer downloads a half-megabyte JPEG.
 */
export const useProfilePhoto = (size: keyof typeof bundled = 'lg') => {
  const { content } = useContent();
  return content.profile.photoUrl ? assetUrl(content.profile.photoUrl) : bundled[size];
};
