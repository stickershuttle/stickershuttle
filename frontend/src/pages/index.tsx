import { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function Home() {
  const [hello, setHello] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const fetchHello = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(API_URL!, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: `query Hello { hello }`,
          }),
        });
        const json = await res.json();
        if (json.errors) {
          setError(json.errors[0].message || "Unknown error");
        } else {
          setHello(json.data.hello);
        }
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        setError(message);
      } finally {
        setLoading(false);
      }
    };
    fetchHello();
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <section className="text-center py-16">
        <h1 className="text-5xl font-bold mb-4 text-gray-900 dark:text-white">Sticker Shuttle</h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">Effortlessly manage and order your stickers online.</p>
        <a
          href="/account/login"
          className="inline-block px-8 py-3 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition-colors font-semibold"
        >
          Get Started
        </a>
      </section>
      <div className="mt-8 w-full max-w-xl text-center">
        {loading ? (
          <p className="text-gray-500 dark:text-gray-400">Loading...</p>
        ) : error ? (
          <p className="text-red-500">{error}</p>
        ) : (
          <p className="text-gray-800 dark:text-gray-200">{hello}</p>
        )}
      </div>
    </div>
  );
}
