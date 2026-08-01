export default function Icon({ name, title, className, ...props }) {
  return (
    <svg className={className ?? 'icon'} aria-hidden={title ? undefined : true} role={title ? 'img' : undefined} {...props}>
      {title ? <title>{title}</title> : null}
      <use href={`/icons.svg#${name}`} />
    </svg>
  );
}