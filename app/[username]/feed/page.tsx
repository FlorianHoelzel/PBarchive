import type { Metadata } from "next";
import { notFound } from "next/navigation";
import speedrunData from "../../data/speedruns.json";
import PBFeed from "../../pb-feed";
import { buildUserArchive } from "../../speedrun-archive";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const name = decodeURIComponent(username);
  return {
    title: `${name}'s PB Feed — Sum of Best`,
    description: `The latest speedrun personal bests from ${name}, newest first.`,
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
      : await buildUserArchive(decodedUsername);

  if (!data || !data.histories.length) notFound();
  return <PBFeed data={data} />;
}
