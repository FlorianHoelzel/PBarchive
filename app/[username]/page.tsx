import { notFound } from "next/navigation";
import speedrunData from "../data/speedruns.json";
import PBHistory from "../pb-history";

export default async function UserArchive({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  if (username.toLowerCase() !== speedrunData.profile.name.toLowerCase()) {
    notFound();
  }

  return <PBHistory data={speedrunData} />;
}
