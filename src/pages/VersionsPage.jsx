import { fetchVersions } from '../api';
import { useFetch } from '../useFetch';

function VersionsPage() {
  const { loading, error, data } = useFetch(fetchVersions);

  if (loading) return <p>Loading…</p>;
  if (error) return <p role="alert">{error}</p>;

  return (
    <>
      <h2>Published config versions</h2>
      <table>
        <thead>
          <tr>
            <th>Version</th>
            <th>Published</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          {data.versions.map((version) => (
            <tr key={version.version}>
              <td>{version.version}</td>
              <td>{new Date(version.publishedAt).toLocaleString()}</td>
              <td>{version.notes ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

export default VersionsPage;
