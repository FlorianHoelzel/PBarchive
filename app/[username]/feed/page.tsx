import type { Metadata } from "next";
import { notFound } from "next/navigation";
import speedrunData from "../../data/speedruns.json";
import PBFeed from "../../pb-feed";
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
  const canonical = `/${encodeURIComponent(name)}/feed`;
  const socialImage = `/${encodeURIComponent(name)}/social-card`;
  const title = `${name}'s PB Feed`;
  const description = `The latest speedrun personal bests from ${name}, newest first.`;
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

export default async function UserFeed({
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
  return <PBFeed data={data} />;
}
