export default function PageHeader({ eyebrow, title, lead, id }) {
  return (
    <div className="page-header">
      {eyebrow && <p className="eyebrow page-header__eyebrow">{eyebrow}</p>}
      <h1 className="page-header__title" id={id}>{title}</h1>
      {lead && <p className="page-header__lead">{lead}</p>}
    </div>
  );
}
