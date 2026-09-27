import { CanvasView } from "@/components/CanvasView";
import { getCanvas } from "@/lib/cms";

export const dynamic = "force-dynamic";

export default async function WorksPage() {
  let blocks = [];
  try {
    const data = await getCanvas("works");
    blocks = data.blocks;
  } catch {
    return <p className="canvas-note">Works is not available. Is the CMS running?</p>;
  }

  return <CanvasView blocks={blocks} />;
}
