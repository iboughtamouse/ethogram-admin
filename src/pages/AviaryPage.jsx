import { useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchAviary } from '../api';
import { useFetch } from '../useFetch';
import SubjectsSection from '../components/SubjectsSection';
import PerchesSection from '../components/PerchesSection';
import { OPTION_KIND_LABELS } from '../constants';

function AviaryPage() {
  const { slug } = useParams();
  const fetcher = useCallback(() => fetchAviary(slug), [slug]);
  const { loading, error, data, reload } = useFetch(fetcher);

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

      <SubjectsSection
        slug={slug}
        subjects={data.subjects}
        onChanged={reload}
      />

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

      <PerchesSection slug={slug} perches={data.perches} onChanged={reload} />

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
