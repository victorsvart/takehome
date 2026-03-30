import { useEffect } from 'react';
import { RenewalRiskPage } from '@/pages/RenewalRiskPage';

function App() {
  useEffect(() => {
    const defaultPropertyId = import.meta.env.VITE_DEFAULT_PROPERTY_ID as
      | string
      | undefined;
    if (window.location.pathname === '/' && defaultPropertyId) {
      window.history.replaceState(
        {},
        '',
        `/properties/${defaultPropertyId}/renewal-risk`,
      );
    }
  }, []);

  return <RenewalRiskPage />;
}

export default App;
