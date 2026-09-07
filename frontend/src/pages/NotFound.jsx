import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-2 bg-paper text-center">
      <p className="font-serif text-2xl">Page not found</p>
      <Link to="/" className="text-brass hover:underline">Back to dashboard</Link>
    </div>
  );
}
