import { bookHref, type BookSource } from "@/lib/config";

/** Opens the booking page in a new tab (through /go/book, which records the source). */
export function BookLink({
  from,
  reportId,
  className = "btn",
  children,
}: {
  from: BookSource;
  reportId?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <a className={className || undefined} href={bookHref(from, reportId)} target="_blank" rel="noopener">
      {children}
    </a>
  );
}
