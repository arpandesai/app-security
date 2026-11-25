export async function GET(req: Request) {
  const url = new URL(req.url).searchParams.get("url")!;
  const page = await fetch(url);
  return new Response(await page.text());
}
