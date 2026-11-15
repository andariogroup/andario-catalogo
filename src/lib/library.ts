export type LibraryUse = { label: string; href: string };

export type LibraryItem = {
  id: string;
  kind: string;
  url: string;
  alt: string;
  bytes: number;
  uses: LibraryUse[];
};
