import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createAviary, fetchOverview } from '../api';
import { useFetch } from '../useFetch';
import { useAction } from '../useAction';
import { suggestSlug } from '../slug';

/**
 * The "create a new form" entry point (Phase 3D, design §5): identity plus an
 * optional template. Cloning copies the template's active perches and enabled
 * vocabulary server-side in one step; birds and diagrams are aviary-specific
 * and start empty. After creation the aviary page takes over — everything
 * stays a draft until Publish.
 */
function NewAviaryPage() {
  const navigate = useNavigate();
  const { loading, error, data } = useFetch(fetchOverview);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [cloneFrom, setCloneFrom] = useState('');
  const { busy, error: createError, run } = useAction();

  if (loading && !data) return <p>Loading…</p>;
  if (error) return <p role="alert">{error}</p>;

  function handleName(event) {
    setName(event.target.value);
    if (!slugTouched) setSlug(suggestSlug(event.target.value));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const body = { slug, name: name.trim() };
    if (cloneFrom) body.cloneFrom = cloneFrom;
    await run(
      () => createAviary(body),
      () => navigate(`/aviaries/${slug}`)
    );
  }

  return (
    <>
      <h2>New aviary</h2>
      <p className="hint">
        This creates a draft — observers see nothing until you publish. The slug
        becomes the aviary's permanent identity in recorded data and cannot be
        changed later; the display name can.
      </p>
      <form onSubmit={handleSubmit}>
        <label htmlFor="aviary-name">Name</label>
        <input
          id="aviary-name"
          required
          maxLength={255}
          value={name}
          placeholder="e.g. Kestrel Corner"
          onChange={handleName}
        />
        <label htmlFor="aviary-slug">Slug</label>
        <input
          id="aviary-slug"
          required
          maxLength={100}
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          title="lowercase letters and digits, hyphen-separated"
          value={slug}
          onChange={(event) => {
            setSlugTouched(true);
            setSlug(event.target.value);
          }}
        />
        <label htmlFor="aviary-clone">Start from</label>
        <select
          id="aviary-clone"
          value={cloneFrom}
          onChange={(event) => setCloneFrom(event.target.value)}
        >
          <option value="">Blank — no perches, no vocabulary enabled</option>
          {data.aviaries.map((aviary) => (
            <option key={aviary.slug} value={aviary.slug}>
              Copy of {aviary.name} (perches + enabled vocabulary)
            </option>
          ))}
        </select>
        <button type="submit" disabled={busy}>
          {busy ? 'Creating…' : 'Create draft aviary'}
        </button>
        {createError && <p role="alert">{createError}</p>}
      </form>
      <p>
        <Link to="/">Back to overview</Link>
      </p>
    </>
  );
}

export default NewAviaryPage;
