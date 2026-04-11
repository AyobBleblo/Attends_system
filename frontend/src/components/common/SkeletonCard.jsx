// SkeletonCard — shimmer placeholder for loading states
const SkeletonCard = ({ lines = 3, className = '' }) => (
  <div className={`card p-5 space-y-3 ${className}`}>
    <div className="skeleton h-4 w-2/3 rounded-md" />
    {Array.from({ length: lines - 1 }).map((_, i) => (
      <div key={i} className={`skeleton h-3 rounded-md ${i % 2 === 0 ? 'w-full' : 'w-4/5'}`} />
    ))}
  </div>
);

export default SkeletonCard;
