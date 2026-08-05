import type { Metadata } from "next";
import { notFound } from "next/navigation";
import speedrunData from "../../../data/speedruns.json";
import PassportViewer from "../../../passport-viewer";
import { getUserArchive } from "../../../archive-cache";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default async function PassportEmbed({
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
  return <PassportViewer data={data} embedded />;
}
