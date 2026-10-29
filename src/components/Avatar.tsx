type AvatarProps = {
  name: string;
  src?: string | null;
  className?: string;
};

/** Profile picture, falling back to the first letter of the name. */
export function Avatar({ name, src, className = "admin-avatar" }: AvatarProps) {
  return (
    <div className={className}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- served by the API; next/image would need remotePatterns
        <img src={src} alt={`${name}'s profile picture`} />
      ) : (
        (name.charAt(0) || "?").toUpperCase()
      )}
    </div>
  );
}
