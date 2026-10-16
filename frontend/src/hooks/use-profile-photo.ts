import { assetUrl } from '@/config/env';
import defaultPhoto from '@/assets/profile.jpg';
import { useContent } from '@/hooks/use-content';

/** Profile photo URL: the admin-uploaded one if set, otherwise the bundled default. */
export const useProfilePhoto = () => {
  const { content } = useContent();
  return content.profile.photoUrl ? assetUrl(content.profile.photoUrl) : defaultPhoto;
};
