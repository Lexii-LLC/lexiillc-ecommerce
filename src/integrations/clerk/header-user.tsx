import { useRef } from 'react';
import {
  SignedIn,
  SignInButton,
  SignedOut,
  UserButton,
} from '@clerk/clerk-react'

export default function HeaderUser() {
  const userButtonRef = useRef<HTMLDivElement>(null);

  const handleTextClick = () => {
    const button = userButtonRef.current?.querySelector('button[aria-haspopup]') as HTMLButtonElement;
    button?.click();
  };

  return (
    <>
      <SignedIn>
        <div className='flex items-center gap-2'>
          <button onClick={handleTextClick} className='hover:underline'>Manage Account</button>
          <div ref={userButtonRef}>
            <UserButton />
          </div>
        </div>
      </SignedIn>
      <SignedOut>
        <SignInButton mode='modal'>
          <button className='bg-white text-black px-4 py-2 rounded-md'>Join Early Access</button>
        </SignInButton>
      </SignedOut>
    </>
  )
}
