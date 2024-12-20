'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import BiometricAuth from './components/BiometricAuth';
import { init } from '@/lib/init';

export default function Home() {
  const webappUrl = process.env.NEXT_PUBLIC_WEBAPP_URL;
  if (!webappUrl) {
    throw new Error('NEXT_PUBLIC_WEBAPP_URL environment variable is not set');
  }

  useEffect(() => {
    // Initialize the SDK when the component mounts
    init(process.env.NODE_ENV === 'development');
  }, []);

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 row-start-2 items-center">
        <h1 className="text-4xl font-bold text-center">Welcome to Starbeam</h1>
        
        <div className="flex flex-col gap-4 items-center">
          <Link
            href={webappUrl}
            className="px-4 py-2 bg-white rounded-md text-black"
            aria-label="Open Starbeam application in Telegram"
            rel="noopener noreferrer"
          >
            Open Webapp in Telegram
          </Link>
        </div>

        <BiometricAuth />
      </main>
    </div>
  );
}




// import { useLaunchParams } from "@telegram-apps/sdk-react";
// import { useEffect, useState } from "react";
// import TelegramAuth from '@/app/components/TelegramAuth';

// export default function Page() {
//   const [isLoading, setIsLoading] = useState(true);
//   const launchParams = useLaunchParams();

//   useEffect(() => {
//     const init = async () => {
//       setIsLoading(false);
//     };

//     init();
//   }, []);

//   if (isLoading) {
//     return <div className="p-4">Loading...</div>;
//   }

//   return (
//     <main className="flex min-h-screen flex-col items-center justify-between p-24">
//       <TelegramAuth />
//       {/* Add other components/content here */}
//     </main>
//   );
// }


// 'use client';

// import { useState } from 'react';
// import BiometricAuth from './components/BiometricAuth';

// export default function Page() {
//   const [isLoading, setIsLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);

//   useEffect(() => {
//     const init = async () => {
//       try {
//         // Add any page-level initialization if needed
//         setIsLoading(false);
//       } catch (error) {
//         console.error('Initialization failed:', error);
//         setError('Failed to initialize the page');
//       }
//     };

//     init();

//     return () => {
//       // Add any cleanup if needed
//     };
//   }, []);

//   if (error) {
//     return <div className="text-red-500 p-4">{error}</div>;
//   }

//   if (isLoading) {
//     return <div className="p-4">Loading...</div>;
//   }

//   return (
//     <main className="flex min-h-screen flex-col items-center justify-between p-24">
//       <BiometricAuth />
//       {/* Add other components here */}
//     </main>
//   );
// }
