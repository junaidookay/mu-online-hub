import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Redirect to canonical Marketplace page (services tab)
const Services = () => {
  const navigate = useNavigate();
  useEffect(() => {
    navigate('/marketplace?tab=services', { replace: true });
  }, [navigate]);
  return null;
};

export default Services;
