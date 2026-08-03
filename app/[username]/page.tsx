import { notFound } from "next/navigation";
import speedrunData from "../data/speedruns.json";
import PBHistory from "../pb-history";
import { buildUserArchive } from "../speedrun-archive";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function UserArchive({
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

  if (!data) notFound();

  if (!data.histories.length) {
    return (
      <main className="empty-archive">
        <a className="empty-brand" href="/">
          SUM OF BEST
        </a>
        <section>
          <span>PROFILE FOUND</span>
          <h1>@{data.profile.name}</h1>
          <p>
            This speedrun.com profile doesn’t have any verified runs to build
            an archive from yet.
          </p>
          <a href={data.profile.profileUrl} target="_blank" rel="noreferrer">
            VIEW ON SPEEDRUN.COM ↗
          </a>
        </section>
      </main>
    );
  }

  return <PBHistory data={data} />;
}
