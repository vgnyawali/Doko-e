export default function StoreAnnouncement({
  announcement,
}: {
  announcement: string;
}) {
  return <div className="announcement">{announcement}</div>;
}
