import { CanvasView } from "@/components/CanvasView";
import { getCanvas } from "@/lib/cms";

export const dynamic = "force-dynamic";

export default async function ColabsPage() {
  let blocks = [];
  try {
    const data = await getCanvas("colabs");
    blocks = data.blocks;
  } catch {
    return <p className="canvas-note">Colabs is not available. Is the CMS running?</p>;
  }

  return <CanvasView blocks={blocks} />;
}
