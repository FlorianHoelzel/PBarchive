import type { Metadata } from "next";
import { notFound } from "next/navigation";
import speedrunData from "../../../data/speedruns.json";
import EmbedViewer from "../../../embed-viewer";
import { getUserArchive } from "../../../archive-cache";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

function safelyDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export default async function CategoryEmbed({
  params,
}: {
  params: Promise<{ username: string; history: string }>;
}) {
  const { username, history: encodedHistory } = await params;
  const decodedUsername = safelyDecode(username);
  const historyId = safelyDecode(encodedHistory);
  const data =
    decodedUsername.toLowerCase() === speedrunData.profile.name.toLowerCase()
      ? speedrunData
      : await getUserArchive(decodedUsername);

  if (!data) notFound();

  const history = data.histories.find(
    (item) => item.id === historyId || item.id === encodedHistory,
  );
  if (!history) notFound();

  return <EmbedViewer profile={data.profile} history={history} />;
}
