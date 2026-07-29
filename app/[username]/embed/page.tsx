import { notFound } from "next/navigation";
import speedrunData from "../../data/speedruns.json";
import EmbedViewer from "../../embed-viewer";
import { buildUserArchive } from "../../speedrun-archive";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CategoryEmbed({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ history?: string }>;
}) {
  const { username } = await params;
  const { history: historyId } = await searchParams;
  const decodedUsername = decodeURIComponent(username);
  const data =
    decodedUsername.toLowerCase() === speedrunData.profile.name.toLowerCase()
      ? speedrunData
      : await buildUserArchive(decodedUsername);

  if (!data || !historyId) notFound();

  const history = data.histories.find((item) => item.id === historyId);
  if (!history) notFound();

  return <EmbedViewer profile={data.profile} history={history} />;
}
