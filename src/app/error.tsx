"use client";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="max-w-md rounded-xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200">
        <h1 className="text-lg font-semibold text-slate-900">Something went wrong</h1>
        <p className="mt-2 text-sm text-slate-600">{error.message || "An unexpected error occurred."}</p>
        <div className="mt-5 flex justify-center gap-2">
          <button
            onClick={reset}
            className="rounded-md bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-indigo-500"
          >
            Try again
          </button>
          <form action="/api/auth/logout" method="post">
            <button className="rounded-md px-3.5 py-2 text-sm font-medium text-slate-600 ring-1 ring-slate-300 hover:bg-slate-50">
              Sign out
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
