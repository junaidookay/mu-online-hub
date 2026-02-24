import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Redirect to canonical Marketplace page
const MarketplaceAds = () => {
  const navigate = useNavigate();
  useEffect(() => {
    navigate('/marketplace', { replace: true });
  }, [navigate]);
  return null;
};

export default MarketplaceAds;
