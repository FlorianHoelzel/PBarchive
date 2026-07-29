import speedrunData from "./data/speedruns.json";
import PBHistory from "./pb-history";

export default function Home() {
  return <PBHistory data={speedrunData} />;
}
