import { useContext } from 'react';
import { ContentContext } from '@/context/content-context';

/** Access the live site content from any component. */
export const useContent = () => useContext(ContentContext);
