import { useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { fetchAviary, deleteAviary } from '../api';
import { useFetch } from '../useFetch';
import { useAction } from '../useAction';
import SubjectsSection from '../components/SubjectsSection';
import PerchesSection from '../components/PerchesSection';
import EnablementSection from '../components/EnablementSection';
import DiagramsSection from '../components/DiagramsSection';
import ActivationControl from '../components/ActivationControl';
import ConfirmButton from '../components/ConfirmButton';

function AviaryPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const fetcher = useCallback(() => fetchAviary(slug), [slug]);
  const { loading, error, data, reload } = useFetch(fetcher);
  const { busy: deleting, error: deleteError, run: runDelete } = useAction();

  function handleDelete() {
    // On success the aviary is gone — return to the overview
    runDelete(
      () => deleteAviary(slug),
      () => navigate('/')
    );
  }

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
      <h2>{data.name}</h2>
      <ActivationControl
        slug={slug}
        isActive={data.isActive}
        onChanged={reload}
      />
      <p className="hint">
        Edits here change the draft — nothing observers see changes until you{' '}
        <Link to="/publish">review and publish</Link>.
      </p>

      <SubjectsSection
        slug={slug}
        subjects={data.subjects}
        onChanged={reload}
      />

      <DiagramsSection
        slug={slug}
        diagrams={data.diagrams}
        onChanged={reload}
      />

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

      {!data.isActive && (
        <section className="danger-zone">
          <h3>Delete this draft</h3>
          <p className="hint">
            Only an aviary that has never been in a published version can be
            deleted, and it&apos;s permanent — it removes this aviary and all
            its perches, birds, diagrams, and enabled vocabulary. Once it&apos;s
            been published, leave it deactivated instead.
          </p>
          <ConfirmButton
            label="Delete this draft aviary"
            question="Permanently delete this draft aviary and everything in it?"
            onConfirm={handleDelete}
            disabled={deleting}
          />
          {deleteError && <p role="alert">{deleteError}</p>}
        </section>
      )}
    </>
  );
}

export default AviaryPage;
