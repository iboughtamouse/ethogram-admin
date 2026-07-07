import { Link } from 'react-router-dom';
import { fetchOverview } from '../api';
import { useFetch } from '../useFetch';

function OverviewPage() {
  const { loading, error, data } = useFetch(fetchOverview);

  if (loading) return <p>Loading…</p>;
  if (error) return <p role="alert">{error}</p>;

  const { aviaries, latestVersion, unpublishedChanges } = data;

  return (
    <>
      <section className="statusline">
        {latestVersion ? (
          <span>
            Published config: <strong>version {latestVersion.version}</strong> (
            {new Date(latestVersion.publishedAt).toLocaleDateString()})
            {latestVersion.notes ? ` — ${latestVersion.notes}` : ''}
          </span>
        ) : (
          <span>No config published yet.</span>
        )}
        {unpublishedChanges ? (
          <span className="badge badge-warn">Unpublished changes</span>
        ) : (
          <span className="badge">Up to date</span>
        )}
      </section>

      <h2>Aviaries</h2>
      <div className="cards">
        {aviaries.map((aviary) => (
          <Link
            key={aviary.slug}
            to={`/aviaries/${aviary.slug}`}
            className="card-link"
          >
            <h3>{aviary.name}</h3>
            <p>
              {aviary.currentSubjects} current{' '}
              {aviary.currentSubjects === 1 ? 'bird' : 'birds'} ·{' '}
              {aviary.perches} perches · {aviary.diagrams}{' '}
              {aviary.diagrams === 1 ? 'diagram' : 'diagrams'}
            </p>
            {!aviary.isActive && (
              <span className="badge badge-warn">Inactive</span>
            )}
          </Link>
        ))}
      </div>
    </>
  );
}

export default OverviewPage;
