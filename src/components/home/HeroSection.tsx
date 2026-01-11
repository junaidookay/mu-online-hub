import { useNavigate } from 'react-router-dom';

const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <div className="py-8 text-center">
      <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-gradient-gold text-glow-gold mb-2">
        Join the Largest MU Community
      </h1>
      <p className="text-muted-foreground text-sm md:text-base max-w-2xl mx-auto">
        Find the best servers, services, and partners in the MU Online ecosystem
      </p>
    </div>
  );
};

export default HeroSection;
