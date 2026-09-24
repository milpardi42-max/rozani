import { notFound } from "next/navigation";
import { getSite } from "@/lib/data/queries";
import { type Locale } from "@/lib/i18n/types";
import { t } from "@/lib/utils";
import WebinarViewer from "@/components/academy/WebinarViewer";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: Locale; slug: string }> };

export default async function LivePage({ params }: Props) {
  const { locale, slug } = await params;

  const site = await getSite();
  const item = site.education.find(
    (e) => e.slug === slug && (e.type === "webinar" || e.type === "workshop")
  );
  if (!item) notFound();

  const stream = item.liveEvent?.webinarStream;
  const liveEvent = item.liveEvent;

  // If it's an external HLS stream, you'd handle that differently — for now only camera is supported here
  if (stream?.source === "external" && stream.hlsUrl) {
    // handled at the component level or redirect
  }

  const session = await getSession();
  // Pre-fill name/email from logged-in session — guest can override
  const prefillName = session?.name ?? "";
  const prefillEmail = session?.email ?? "";

  const title = t(item.title, locale);
  const hostName = liveEvent?.hostNameCustom && liveEvent.hostName
    ? t(liveEvent.hostName, locale)
    : locale === "fa" ? "راضیه خیری پور" : "Razieh Khairipour";

  return (
    <WebinarViewer
      slug={slug}
      title={title}
      image={item.image}
      hostName={hostName}
      startsAt={liveEvent?.startsAt}
      durationMin={liveEvent?.durationMin}
      capacity={liveEvent?.capacity}
      registeredCount={liveEvent?.registeredCount}
      eventStatus={liveEvent?.status ?? "live"}
      chatEnabled={stream?.chatEnabled ?? true}
      qaEnabled={stream?.qaEnabled ?? true}
      prefillName={prefillName}
      prefillEmail={prefillEmail}
      locale={locale}
      externalUrl={
        item.type === "workshop" && liveEvent?.webinarStream?.source === "external"
          ? liveEvent?.meetLink
          : undefined
      }
    />
  );
}
