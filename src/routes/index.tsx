import { createFileRoute } from '@tanstack/react-router';
import { SignedIn, SignedOut, SignInButton } from '@clerk/clerk-react';
import { MapPin, Zap, ShoppingBag, CheckCircle2 } from 'lucide-react';

export const Route = createFileRoute('/')({
  component: App,
});

function App() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero Section */}
      <section className="relative py-24 px-6 text-center">
        <div className="relative max-w-6xl mx-auto">
          <h1 className="text-6xl md:text-8xl font-black mb-6 tracking-tight">
            <span className="text-white">LEXII</span>
          </h1>
          <p className="text-3xl md:text-5xl text-gray-300 mb-6 font-bold">
            Shoes at the click of your fingertips
          </p>
          <p className="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto mb-10">
            Shop online. Pick up in-store.
          </p>
          <div className="flex flex-col items-center gap-4">
            <SignedOut>
              <SignInButton mode="modal">
                <button className="px-10 py-5 bg-white hover:bg-gray-100 text-black font-bold rounded-lg transition-colors text-lg uppercase tracking-wider">
                  Get on the List
                </button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <div className="px-10 py-5 border-2 border-white rounded-lg flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-white" />
                <p className="text-white text-lg font-bold uppercase tracking-wider">
                  You're on the list
                </p>
              </div>
            </SignedIn>
          </div>
        </div>
      </section>

      {/* Early Access Section */}
      <section className="py-20 px-6 bg-gray-950">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-4xl md:text-6xl font-black mb-6 uppercase tracking-tight">
            Early Crew Gets It First
          </h2>
          <p className="text-xl md:text-2xl text-gray-400 mb-12 leading-relaxed">
            Sign up now and be first in line when we launch.
          </p>
          <div className="flex flex-wrap justify-center gap-6 mb-10">
            <div className="text-gray-300 text-lg">
              <span className="text-cyan-400 font-bold">✓</span> First access
            </div>
          </div>
          <SignedOut>
            <SignInButton mode="modal">
              <button className="px-10 py-5 bg-white hover:bg-gray-100 text-black font-bold rounded-lg transition-colors text-lg uppercase tracking-wider">
                Lock In Your Spot
              </button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <div className="px-10 py-5 border-2 border-white rounded-lg inline-flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-white" />
              <p className="text-white text-lg font-bold uppercase tracking-wider">
                You're on the list
              </p>
            </div>
          </SignedIn>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {/* Pickup Feature */}
            <div className="text-center">
              <div className="mb-6 flex justify-center">
                <Zap className="w-16 h-16 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4 uppercase tracking-tight">
                Pickup
              </h3>
              <p className="text-gray-400 leading-relaxed text-lg">
                Buy online, pickup in-store.
              </p>
            </div>

            {/* Location Feature */}
            <div className="text-center">
              <div className="mb-6 flex justify-center">
                <MapPin className="w-16 h-16 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4 uppercase tracking-tight">
                Modesto, CA
              </h3>
              <p className="text-gray-400 leading-relaxed text-lg">
                Located at Vintage Faire Mall.
              </p>
            </div>

            {/* Shoe Focus Feature */}
            <div className="text-center">
              <div className="mb-6 flex justify-center">
                <ShoppingBag className="w-16 h-16 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4 uppercase tracking-tight">
                The Inventory
              </h3>
              <p className="text-gray-400 leading-relaxed text-lg">
                The best selection in the Central Valley.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 px-6 bg-gray-950">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-6xl font-black mb-6 uppercase tracking-tight">
            Stay in the loop?
          </h2>
          <p className="text-xl text-gray-400 mb-10">
            Get on the list and be the first to know when we open our online store.
          </p>
          <SignedOut>
            <SignInButton mode="modal">
              <button className="px-10 py-5 bg-white hover:bg-gray-100 text-black font-bold rounded-lg transition-colors text-lg uppercase tracking-wider">
                Join the Crew
              </button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <div className="px-10 py-5 border-2 border-white rounded-lg inline-flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-white" />
              <p className="text-white text-lg font-bold uppercase tracking-wider">
                You're on the list
              </p>
            </div>
          </SignedIn>
        </div>
      </section>
    </div>
  );
}
