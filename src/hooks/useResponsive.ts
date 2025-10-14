import { useState, useEffect } from 'react';
import { RESPONSIVE_WIDTHS, BREAKPOINTS } from '../utils/constants';

export const useResponsive = () => {
  const getValueStreamWidth = () => {
    if (typeof window !== 'undefined') {
      if (window.innerWidth < BREAKPOINTS.MOBILE) return RESPONSIVE_WIDTHS.MOBILE;
      if (window.innerWidth < BREAKPOINTS.TABLET) return RESPONSIVE_WIDTHS.TABLET;
    }
    return RESPONSIVE_WIDTHS.DESKTOP;
  };

  const [vsWidth, setVsWidth] = useState(getValueStreamWidth());

  useEffect(() => {
    const handleResize = () => {
      setVsWidth(getValueStreamWidth());
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  return { vsWidth };
};