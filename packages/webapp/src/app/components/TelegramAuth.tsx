// // packages/webapp/src/app/components/TelegramAuth.tsx
// 'use client';

// import { useEffect, useState } from 'react';

// declare global {
//   interface Window {
//     Telegram?: {
//       WebApp?: {
//         initData: string;
//         ready: () => void;
//         MainButton: {
//           show: () => void;
//           hide: () => void;
//           setText: (text: string) => void;
//         };
//       };
//     };
//   }
// }

// export default function TelegramAuth() {
//   const [isAuthenticated, setIsAuthenticated] = useState(false);
//   const [error, setError] = useState<string | null>(null);

//   useEffect(() => {
//     const authenticate = async () => {
//       try {
//         window.Telegram?.WebApp?.ready();
        
//         const initData = window.Telegram?.WebApp?.initData;
//         if (!initData) {
//           setError('Not running in Telegram WebApp');
//           return;
//         }

//         const response = await fetch('/api/auth/telegram', {
//           method: 'POST',
//           headers: { 'Content-Type': 'application/json' },
//           body: JSON.stringify({ initData })
//         });

//         const data = await response.json();

//         if (!response.ok) {
//           throw new Error(data.error || 'Authentication failed');
//         }

//         setIsAuthenticated(true);
//       } catch (err) {
//         setError(err instanceof Error ? err.message : 'Authentication failed');
//       }
//     };

//     authenticate();
//   }, []);

//   if (error) {
//     return <div className="text-red-500 p-4">{error}</div>;
//   }

//   if (!isAuthenticated) {
//     return <div className="p-4">Authenticating...</div>;
//   }

//   return null;
// }

// // packages/webapp/src/app/page.tsx
// import TelegramAuth from './components/TelegramAuth';

// export default function Home() {
//   return (
//     <main className="flex min-h-screen flex-col items-center justify-center p-24">
//       <TelegramAuth />
//       {/* Your existing content */}
//     </main>
//   );
// }



'use client';

import { useEffect, useState } from 'react';

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string;
        ready: () => void;
        MainButton: {
          show: () => void;
          hide: () => void;
          setText: (text: string) => void;
        };
      };
    };
  }
}

export default function TelegramAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const authenticate = async () => {
      try {
        window.Telegram?.WebApp?.ready();

        const initData = window.Telegram?.WebApp?.initData;
        if (!initData) {
          setError('Not running in Telegram WebApp');
          return;
        }

        const response = await fetch('/api/auth/telegram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initData })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Authentication failed');
        }

        setIsAuthenticated(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Authentication failed');
      }
    };

    authenticate();
  }, []);

  if (error) {
    return <div className="text-red-500 p-4">{error}</div>;
  }

  if (!isAuthenticated) {
    return <div className="p-4">Authenticating...</div>;
  }

  return null;
}