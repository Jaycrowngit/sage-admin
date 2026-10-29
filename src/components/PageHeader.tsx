import Link from "next/link";

type PageHeaderProps = {
  title: string;
  subtitle?: React.ReactNode;
  back?: { href: string; label: string };
  actions?: React.ReactNode;
};

export function PageHeader({ title, subtitle, back, actions }: PageHeaderProps) {
  return (
    <>
      {back && (
        <Link href={back.href} className="admin-back-link">
          ← {back.label}
        </Link>
      )}
      <div className="admin-page-header">
        <div>
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {actions && <div className="admin-page-actions">{actions}</div>}
      </div>
    </>
  );
}
