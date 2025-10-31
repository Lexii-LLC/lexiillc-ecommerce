import { Link } from '@tanstack/react-router';

import ClerkHeader from '../integrations/clerk/header-user.tsx';

import { Home } from 'lucide-react';

export default function Header() {
  return (
    <header className="py-4 px-4 md:px-16 flex items-center justify-between bg-black text-white shadow-lg">
      <div className="flex items-center gap-4">
        <Link to="/">
          <img
            src="https://portal.lexiillc.com/assets/logo-dbf3009d.jpg"
            alt="Lexii Logo"
            className="h-16"
          />
        </Link>
        <Link
          to="/"
          className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-900 transition-colors"
          activeProps={{
            className:
              'flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-900 transition-colors',
          }}
        >
          <Home size={20} />
          <span className="font-medium">Home</span>
        </Link>
      </div>
      <div>
        <ClerkHeader />
      </div>
    </header>
  )
}
