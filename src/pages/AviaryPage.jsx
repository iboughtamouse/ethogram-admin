import { useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchAviary } from '../api';
import { useFetch } from '../useFetch';

const OPTION_KIND_LABELS = {
  object: 'Objects',
  object_interaction: 'Object interactions',
  animal: 'Animals',
  animal_interaction: 'Animal interactions',
};

function AviaryPage() {
  const { slug } = useParams();
  const fetcher = useCallback(() => fetchAviary(slug), [slug]);
  const { loading, error, data } = useFetch(fetcher);

  if (loading) return <p>Loading…</p>;
  if (error) {
    return (
      <p role="alert">
        {error} <Link to="/">Back to overview</Link>
      </p>
    );
  }

  return (
    <>
      <h2>
        {data.name}
        {!data.isActive && <span className="badge badge-warn">Inactive</span>}
      </h2>

      <h3>Subjects</h3>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Species</th>
            <th>Type</th>
            <th>Arrived</th>
            <th>Departed</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {data.subjects.map((subject) => (
            <tr key={`${subject.name}-${subject.arrivedOn}-${subject.type}`}>
              <td>{subject.name}</td>
              <td>{subject.species}</td>
              <td>{subject.type}</td>
              <td>{subject.arrivedOn}</td>
              <td>{subject.departedOn ?? '—'}</td>
              <td>
                {subject.current ? (
                  <span className="badge">Current</span>
                ) : (
                  'Past'
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>Perch diagrams</h3>
      <div className="diagrams">
        {data.diagrams.map((diagram) => (
          <figure key={diagram.label}>
            <a href={diagram.url} target="_blank" rel="noreferrer">
              <img src={diagram.url} alt={`Perch diagram: ${diagram.label}`} />
            </a>
            <figcaption>{diagram.label}</figcaption>
          </figure>
        ))}
      </div>

      <h3>Perches ({data.perches.length})</h3>
      <table>
        <thead>
          <tr>
            <th>Value</th>
            <th>Label</th>
            <th>Group</th>
          </tr>
        </thead>
        <tbody>
          {data.perches.map((perch) => (
            <tr
              key={perch.value}
              className={perch.retired ? 'retired' : undefined}
            >
              <td>{perch.value}</td>
              <td>
                {perch.label}
                {perch.retired && (
                  <span className="badge badge-warn">Retired</span>
                )}
              </td>
              <td>{perch.group ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>Enabled vocabulary</h3>
      <p>{data.enabled.behaviors.length} behaviors enabled.</p>
      <ul>
        {Object.entries(OPTION_KIND_LABELS).map(([kind, label]) => (
          <li key={kind}>
            {label}: {data.enabled[kind].length}
          </li>
        ))}
      </ul>
      <p>
        Full catalog and enablement matrix:{' '}
        <Link to="/vocabulary">Vocabulary</Link>.
      </p>
    </>
  );
}

export default AviaryPage;
