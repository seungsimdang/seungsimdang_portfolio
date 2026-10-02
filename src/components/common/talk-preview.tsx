import { ExternalLink } from "@/components/common/external-link";

interface TalkPreviewProps {
  title: string;
  date: string;
  venue: string;
  description: string;
  impact?: string;
  link: string;
  detailed?: boolean;
  className?: string;
}

export function TalkPreview({
  title,
  date,
  venue,
  description,
  impact,
  link,
  detailed = false,
  className = "",
}: TalkPreviewProps) {
  return (
    <article
      className={`border-b border-white/10 pb-24 space-y-12 md:space-y-16 ${className}`}
    >
      <h3 className="text-2xl md:text-3xl font-medium break-keep">{title}</h3>
      <p className="text-small opacity-50">
        <span>{date}</span>
        <span aria-hidden="true"> · </span>
        <span>{venue}</span>
      </p>
      <p className="text-body whitespace-pre-line break-keep break-words">
        {description}
      </p>
      {detailed && impact?.trim() && (
        <div className="space-y-8">
          <h4 className="text-small opacity-50">.impact</h4>
          <p className="text-body whitespace-pre-line break-keep break-words">
            {impact}
          </p>
        </div>
      )}
      <ExternalLink href={link} className="text-small">
        view details
      </ExternalLink>
    </article>
  );
}
