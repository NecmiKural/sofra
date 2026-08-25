import { notFound } from "next/navigation";
import { getPayment, getVenueById } from "@/lib/repo";
import PayClient from "./pay-client";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ return?: string }>;
};

export default async function PayPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const payment = await getPayment(id);
  if (!payment) notFound();
  const venue = await getVenueById(payment.venueId);

  return (
    <PayClient
      paymentId={payment.id}
      amountMinor={payment.amountMinor}
      currency={venue?.currency ?? "TRY"}
      venueName={venue?.name ?? ""}
      tableNumber={payment.tableNumber}
      initialStatus={payment.status}
      themePrimary={venue?.themePrimary ?? "#c2410c"}
      returnUrl={sp.return ?? null}
      defaultLang={venue?.defaultLang ?? "tr"}
    />
  );
}
