export function Skeleton({ width, height, borderRadius = '8px', className = '' }) {
    return (
        <div
            className={`skeleton ${className}`}
            style={{
                width: width || '100%',
                height: height || '20px',
                borderRadius
            }}
        />
    );
}

export function SkeletonCard({ height = '120px' }) {
    return (
        <div className="skeleton-card" style={{ height }}>
            <Skeleton width="60%" height="20px" />
            <Skeleton width="40%" height="32px" style={{ marginTop: '12px' }} />
            <Skeleton width="80%" height="14px" style={{ marginTop: '16px' }} />
        </div>
    );
}

export function SkeletonChart() {
    return (
        <div className="skeleton-chart">
            <Skeleton width="40%" height="18px" />
            <div className="skeleton-chart-area">
                <Skeleton height="100%" borderRadius="8px" />
            </div>
        </div>
    );
}

export function SkeletonList({ rows = 3 }) {
    return (
        <div className="skeleton-list">
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="skeleton-list-item">
                    <Skeleton width="70%" height="16px" />
                    <Skeleton width="20%" height="16px" />
                </div>
            ))}
        </div>
    );
}

export function StatsPageSkeleton() {
    return (
        <div className="stats-tab">
            <section className="stats">
                <Skeleton width="100px" height="24px" style={{ marginBottom: '16px' }} />
                <div className="stats-grid">
                    {[1, 2, 3, 4].map(i => (
                        <SkeletonCard key={i} height="100px" />
                    ))}
                </div>
            </section>
            <div className="charts-grid">
                {[1, 2, 3, 4].map(i => (
                    <SkeletonChart key={i} />
                ))}
            </div>
        </div>
    );
}

export function DashboardSkeleton() {
    return (
        <div className="dashboard-tab">
            <section>
                <Skeleton width="120px" height="24px" style={{ marginBottom: '16px' }} />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                    {[1, 2].map(i => (
                        <SkeletonCard key={i} height="200px" />
                    ))}
                </div>
            </section>
        </div>
    );
}
