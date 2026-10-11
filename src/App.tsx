import { useEffect, useState } from 'react';
import Product from './Product';
import DigilabLanding from './DigilabLanding';

export default function App() {
  const [route, setRoute] = useState(() => location.hash.startsWith('#/') ? location.hash.slice(2) : '');
  useEffect(() => {
    const onHashChange = () => {
      const next = location.hash.startsWith('#/') ? location.hash.slice(2) : '';
      if (next || document.querySelector('.product-page')) window.scrollTo(0, 0);
      setRoute(next);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);
  return ['markets', 'vaults', 'stake', 'claim', 'docs', 'faq'].includes(route)
    ? <Product route={route} />
    : <DigilabLanding />;
}
