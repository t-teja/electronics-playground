import { createFileRoute, Link } from "@tanstack/react-router";
import { AppHeader } from "@/components/app-header";
import { LAB_COMPONENTS } from "@/labs/registry";
import { LAB_BY_SLUG } from "@/lib/catalog";
import { absUrl, ogImage, SITE_DESCRIPTION, SITE_NAME } from "@/lib/seo";

export const Route = createFileRoute("/lab/$slug")({
  component: LabPage,
  head: ({ params }) => {
    const lab = LAB_BY_SLUG[params.slug];
    const title = lab ? `${lab.name} · ${SITE_NAME}` : SITE_NAME;
    const description = lab?.summary || lab?.tagline || SITE_DESCRIPTION;
    const url = absUrl(`lab/${params.slug}`);
    const image = ogImage();
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: url },
        { property: "og:image", content: image },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        { name: "twitter:image", content: image },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
});

function LabPage() {
  const { slug } = Route.useParams();
  const Bench = LAB_COMPONENTS[slug];
  if (!Bench) {
    return (
      <div className="flex min-h-dvh flex-col bg-bg text-fg">
        <AppHeader />
        <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-start justify-center gap-4 px-6">
          <p className="text-sm text-subtle">Missing bench</p>
          <h1 className="text-3xl font-semibold tracking-tight">This component is not on the floor.</h1>
          <Link to="/" className="text-sm text-electron hover:underline">
            Back to the laboratory
          </Link>
        </main>
      </div>
    );
  }
  return <Bench />;
}
