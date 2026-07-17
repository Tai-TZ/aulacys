import { notFound } from "next/navigation";
import { ProductDetailPage } from "@/components/client/product-detail-page";
import { isProductSlug, PRODUCT_SLUGS } from "@/lib/products";

export function generateStaticParams() {
  return PRODUCT_SLUGS.map((slug) => ({ slug }));
}

export default function VayDetailRoute({ params }: { params: { slug: string } }) {
  if (!isProductSlug(params.slug)) notFound();
  return <ProductDetailPage slug={params.slug} />;
}
