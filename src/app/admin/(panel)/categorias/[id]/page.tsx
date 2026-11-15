import { CategoryEditor } from "../editor";

export default async function CategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CategoryEditor id={id} />;
}
