import { useState, useEffect, useCallback } from 'react';

const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(false);

  const handleChange = useCallback(() => {
    if (typeof window !== 'undefined') {
      setMatches(window.matchMedia(query).matches);
    }
  }, [query]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const matchMedia = window.matchMedia(query);

    // Trigger handler at initial load
    handleChange();

    // Listen for changes
    if (matchMedia.addEventListener) {
      matchMedia.addEventListener('change', handleChange);
      return () => matchMedia.removeEventListener('change', handleChange);
    } else {
      matchMedia.addListener(handleChange);
      return () => matchMedia.removeListener(handleChange);
    }
  }, [query, handleChange]);

  return matches;
};

export default useMediaQuery;
