import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-bg text-text gap-4">
      <h1 className="text-4xl font-serif font-bold">404</h1>
      <p className="text-text-3">Page not found</p>
      <Link to="/" className="text-accent-2 text-sm hover:underline mt-2">
        &larr; Back to home
      </Link>
    </div>
  )
}
