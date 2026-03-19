import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen p-8">
      <h1 className="text-2xl font-bold mb-4">A/B Test Platform</h1>
      <nav className="flex gap-4">
        <Link href="/admin" className="text-blue-600 hover:underline">
          관리자
        </Link>
        <Link href="/test/demo" className="text-blue-600 hover:underline">
          테스트 (demo)
        </Link>
      </nav>
    </main>
  );
}
