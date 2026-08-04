import type { Metadata } from "next";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const title = "Sum of Best - Your personal PB archive";
  const description =
    "Turn a speedrun.com profile into a playable history of personal bests, including obsolete runs.";

  return {
    metadataBase: new URL("https://sumof.best"),
    title,
    description,
    verification: {
      google: "JeLkuzRbmBwi5uiI3t9g6JZV1r75RKrejPkG7kxkiy0",
    },
    alternates: { canonical: "/" },
    openGraph: {
      title,
      description,
      type: "website",
      url: "https://sumof.best",
      siteName: "Sum of Best",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.svg?v=run-replay-2" type="image/svg+xml" />
        <link rel="shortcut icon" href="/favicon.svg?v=run-replay-2" />
        <script
          defer
          src="https://stats.sumof.best/script.js"
          data-website-id="b586f22e-d4e3-4a55-9154-c9f44325a61c"
          data-domains="sumof.best,www.sumof.best"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
