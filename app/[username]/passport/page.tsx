import type { Metadata } from "next";
import { notFound } from "next/navigation";
import speedrunData from "../../data/speedruns.json";
import PassportViewer from "../../passport-viewer";
import { getUserArchive } from "../../archive-cache";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const name = decodeURIComponent(username);
  const canonical = `/${encodeURIComponent(name)}/passport`;
  const socialImage = `/${encodeURIComponent(name)}/social-card`;
  const title = `${name}'s Speedrun Passport`;
  const description = `A shareable game-by-game passport through ${name}'s speedrun personal best history.`;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      type: "website",
      url: canonical,
      images: [{ url: socialImage, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [socialImage],
    },
  };
}

export default async function UserPassport({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const decodedUsername = decodeURIComponent(username);
  const data =
    decodedUsername.toLowerCase() === speedrunData.profile.name.toLowerCase()
      ? speedrunData
      : await getUserArchive(decodedUsername);

  if (!data || !data.histories.length) notFound();
  return <PassportViewer data={data} />;
}
