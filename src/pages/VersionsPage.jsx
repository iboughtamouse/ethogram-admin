import { fetchVersions } from '../api';
import { useFetch } from '../useFetch';

function VersionsPage() {
  const { loading, error, data } = useFetch(fetchVersions);

  if (loading && !data) return <p>Loading…</p>;
  if (error) return <p role="alert">{error}</p>;

  return (
    <>
      <h2>Published config versions</h2>
      {data.versions.length === 0 ? (
        <p>No config has been published yet.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Version</th>
              <th>Published</th>
              <th>By</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {data.versions.map((version) => (
              <tr key={version.version}>
                <td>{version.version}</td>
                <td>{new Date(version.publishedAt).toLocaleString()}</td>
                {/* NULL published_by = a pre-dashboard engineering-script publish */}
                <td>{version.publishedBy ?? 'Engineering'}</td>
                <td>{version.notes ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

export default VersionsPage;
