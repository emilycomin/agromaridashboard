import { createContext, useContext } from 'react';

export const PostsContext = createContext(null);

export function usePosts() {
  return useContext(PostsContext);
}
