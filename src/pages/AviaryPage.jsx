import { useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchAviary } from '../api';
import { useFetch } from '../useFetch';
import SubjectsSection from '../components/SubjectsSection';
import PerchesSection from '../components/PerchesSection';
import EnablementSection from '../components/EnablementSection';

function AviaryPage() {
  const { slug } = useParams();
  const fetcher = useCallback(() => fetchAviary(slug), [slug]);
  const { loading, error, data, reload } = useFetch(fetcher);

  // Only the first load blanks the page. During a reload (after any
  // mutation) the stale data keeps rendering, so sibling sections — an open
  // editor row, a half-built enablement draft — are not unmounted and lost
  if (loading && !data) return <p>Loading…</p>;
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
      <p className="hint">
        Edits here change the draft config — nothing observers see changes until
        it is published.
      </p>

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

      <EnablementSection
        slug={slug}
        enabled={data.enabled}
        onChanged={reload}
      />

      <p>
        Full catalog and enablement matrix:{' '}
        <Link to="/vocabulary">Vocabulary</Link>.
      </p>
    </>
  );
}

export default AviaryPage;
