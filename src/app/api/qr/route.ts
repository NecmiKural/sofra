import QRCode from "qrcode";

export const dynamic = "force-dynamic";

/** Renders a QR code PNG for the given data (used for table QR sheets). */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const data = url.searchParams.get("data");
  if (!data || data.length > 500) return new Response("bad request", { status: 400 });
  const size = Math.min(1024, Math.max(128, Number(url.searchParams.get("size")) || 512));

  const buffer = await QRCode.toBuffer(data, {
    width: size,
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#1c1917", light: "#ffffff" },
  });

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
